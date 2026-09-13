"""
@file server.py
@module orchestration/webhooks/server
"""

import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logging.getLogger("httpx").setLevel(logging.WARNING)

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

from orchestration.workflows.base import Event, WorkflowResult
from orchestration.workflows.video_processor import VideoProcessorWorkflow
from orchestration.workflows.cleanup import CleanupWorkflow
from orchestration.workflows.notifications import NotificationWorkflow
from orchestration.workflows.r2_monitor import R2MonitorWorkflow
from orchestration.workflows.test_email import TestEmailWorkflow
from orchestration.utils.backend_client import close_client
from orchestration.utils.config import start_auto_reload, stop_auto_reload
from orchestration.event_poller import EventPoller

logger = logging.getLogger(__name__)

WORKFLOWS = {
    "submission.created": VideoProcessorWorkflow(),
    "cleanup.daily": CleanupWorkflow(),
    "review.completed": NotificationWorkflow(),
    "r2.monitor": R2MonitorWorkflow(),
    "test.email": TestEmailWorkflow(),
}

poller = EventPoller(WORKFLOWS)


async def _run_workflow(workflow, event: Event) -> WorkflowResult:
    return await workflow.safe_execute(event)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Orchestration server starting — %d workflows registered", len(WORKFLOWS))
    start_auto_reload()
    await poller.start()
    yield
    await poller.stop()
    stop_auto_reload()
    await close_client()
    logger.info("Orchestration server stopped")


app = FastAPI(title="Castant Orchestration", lifespan=lifespan)


class WebhookPayload(BaseModel):
    event_id: str = ""
    payload: dict = {}


@app.post("/webhook/{event_type}")
async def receive_webhook(event_type: str, body: WebhookPayload, background_tasks: BackgroundTasks):
    workflow = WORKFLOWS.get(event_type)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"No workflow for event type: {event_type}")

    event = Event(
        type=event_type,
        payload=body.payload,
        event_id=body.event_id or str(uuid.uuid4()),
    )

    background_tasks.add_task(_run_workflow, workflow, event)
    logger.info("Queued workflow for %s (event %s)", event_type, event.event_id)

    return {"status": "accepted", "event_id": event.event_id, "workflow": event_type}


@app.get("/health")
async def health():
    return {"status": "ok", "workflows": list(WORKFLOWS.keys())}


@app.get("/workflows")
async def list_workflows():
    return {
        name: {
            "event_type": wf.event_type,
            "class": wf.__class__.__name__,
        }
        for name, wf in WORKFLOWS.items()
    }


@app.get("/webhook/r2.monitor")
async def trigger_r2_monitor():
    """Manual trigger for R2 storage monitor workflow. No body or headers required."""
    try:
        workflow = R2MonitorWorkflow()
        event = Event(type="r2.monitor", payload={}, event_id=str(uuid.uuid4()))
        result = await workflow.safe_execute(event)
        status = "ok" if result.success else "error"
        return {"status": status, "result": result.message, "data": result.data}
    except Exception as e:
        logger.exception("R2 monitor endpoint failed")
        return {"status": "error", "result": str(e), "data": {}}
