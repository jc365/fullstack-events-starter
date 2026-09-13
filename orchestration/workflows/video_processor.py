"""
@file video_processor.py
@module orchestration/workflows/video_processor
"""

import asyncio
import json
import logging
import os
import subprocess
from pathlib import Path

from orchestration.config import UPLOADS_DIR, THUMBNAILS_DIR
from orchestration.utils.backend_client import patch_submission_metadata
from orchestration.workflows.base import BaseWorkflow, Event, WorkflowResult

logger = logging.getLogger(__name__)


def _video_metadata(video_path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    return json.loads(result.stdout)


def _generate_thumbnail(video_path: str, thumbnail_path: str, time_sec: int = 5) -> None:
    cmd = [
        "ffmpeg", "-y", "-ss", str(time_sec), "-i", video_path,
        "-vframes", "1", "-q:v", "2", thumbnail_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg thumbnail failed: {result.stderr}")


class VideoProcessorWorkflow(BaseWorkflow):
    event_type = "submission.created"

    async def execute(self, event: Event) -> WorkflowResult:
        payload = event.payload
        submission_id = payload.get("submission_id", "")
        video_url = payload.get("video_url", "")

        if not video_url.startswith("/uploads/"):
            return WorkflowResult(
                success=True,
                message="External URL — skipped local processing",
            )

        video_path = UPLOADS_DIR / video_url.removeprefix("/uploads/videos/")

        if not video_path.exists():
            return WorkflowResult(success=False, message=f"Video file not found: {video_path}")

        loop = asyncio.get_running_loop()
        metadata = await loop.run_in_executor(None, _video_metadata, str(video_path))

        format_info = metadata.get("format", {})
        duration = float(format_info.get("duration", 0))
        size = int(format_info.get("size", 0))

        video_stream = next(
            (s for s in metadata.get("streams", []) if s.get("codec_type") == "video"), {}
        )
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))

        thumbnail_name = f"{video_path.stem}.jpg"
        thumbnail_path = THUMBNAILS_DIR / thumbnail_name
        await loop.run_in_executor(
            None, _generate_thumbnail, str(video_path), str(thumbnail_path), 5
        )

        logger.info(
            "Processed video %s: %dx%d, %.1fs, %d bytes",
            submission_id, width, height, duration, size,
        )

        await patch_submission_metadata(submission_id, {
            "duration": round(duration, 2),
            "width": width,
            "height": height,
            "size": size,
            "thumbnail": f"/uploads/thumbnails/{thumbnail_name}",
        })

        return WorkflowResult(
            success=True,
            message=f"Video processed: {width}x{height}, {duration:.1f}s",
            data={"duration": duration, "width": width, "height": height, "size": size},
        )
