"""
@file notifications.py
@module orchestration/workflows/notifications
"""

import logging

from orchestration.utils.backend_client import get_user
from orchestration.utils.email_client import EmailClient
from orchestration.workflows.base import BaseWorkflow, Event, WorkflowResult

logger = logging.getLogger(__name__)


class NotificationWorkflow(BaseWorkflow):
    event_type = "review.completed"

    async def execute(self, event: Event) -> WorkflowResult:
        payload = event.payload
        submission_id = payload.get("submission_id", "")
        actor_id = payload.get("actor_id", "")
        score = payload.get("score", 0)
        feedback = payload.get("feedback", "")

        if not actor_id:
            return WorkflowResult(success=False, message="actor_id is required")

        try:
            user = await get_user(actor_id)
        except Exception as e:
            return WorkflowResult(success=False, message=f"Failed to fetch user: {e}")

        actor_name = user.get("name", "Actor")
        actor_email = user.get("email", "")

        if not actor_email:
            return WorkflowResult(success=False, message="Actor has no email")

        stars = "★" * score + "☆" * (5 - score) if score else "Sin calificación"
        body = (
            f"Hola {actor_name},\n\n"
            f"Tu submission {submission_id} ha sido revisada.\n\n"
            f"Calificación: {stars} ({score}/10)\n"
        )
        if feedback:
            body += f"\nFeedback del director:\n{feedback}\n"
        body += "\n— Castant"

        subject = f"Castant: Submission {submission_id} revisada"

        email_client = EmailClient()
        sent = await email_client.send_email(to=actor_email, subject=subject, body=body)
        if not sent:
            return WorkflowResult(success=False, message=f"Failed to send email to {actor_email}")

        return WorkflowResult(
            success=True,
            message=f"Notification sent to {actor_email}",
            data={"email": actor_email, "actor_name": actor_name},
        )
