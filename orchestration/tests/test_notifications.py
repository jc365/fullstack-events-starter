"""
@file test_notifications.py
@module orchestration/tests
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from orchestration.workflows.base import Event, WorkflowResult
from orchestration.workflows.notifications import NotificationWorkflow


@pytest.fixture
def workflow():
    return NotificationWorkflow()


class TestNotificationWorkflow:
    @pytest.mark.asyncio
    async def test_event_type(self, workflow):
        assert workflow.event_type == "review.completed"

    @pytest.mark.asyncio
    async def test_missing_actor_id(self, workflow):
        event = Event(type="review.completed", payload={})
        result = await workflow.execute(event)
        assert not result.success
        assert "actor_id is required" in result.message

    @pytest.mark.asyncio
    async def test_user_fetch_failure(self, workflow, monkeypatch):
        async def fail_get_user(uid):
            raise ConnectionError("backend down")

        monkeypatch.setattr("orchestration.workflows.notifications.get_user", fail_get_user)

        event = Event(
            type="review.completed",
            payload={"actor_id": "usr-001", "score": 5},
        )
        result = await workflow.execute(event)
        assert not result.success
        assert "Failed to fetch user" in result.message

    @pytest.mark.asyncio
    async def test_no_email(self, workflow, monkeypatch):
        async def fake_get_user(uid):
            return {"name": "Actor", "email": ""}

        monkeypatch.setattr("orchestration.workflows.notifications.get_user", fake_get_user)

        event = Event(
            type="review.completed",
            payload={"actor_id": "usr-001", "score": 5},
        )
        result = await workflow.execute(event)
        assert not result.success
        assert "no email" in result.message.lower()

    @pytest.mark.asyncio
    async def test_successful_notification(self, workflow, monkeypatch):
        async def fake_get_user(uid):
            return {"name": "Juan Perez", "email": "juan@test.com"}

        monkeypatch.setattr("orchestration.workflows.notifications.get_user", fake_get_user)
        monkeypatch.setattr("orchestration.workflows.notifications.SMTP_HOST", "")

        event = Event(
            type="review.completed",
            payload={
                "submission_id": "sub-001",
                "actor_id": "usr-001",
                "score": 8,
                "feedback": "Excelente trabajo",
            },
        )

        result = await workflow.execute(event)
        assert result.success
        assert result.data["email"] == "juan@test.com"
        assert result.data["actor_name"] == "Juan Perez"

    @pytest.mark.asyncio
    async def test_email_content(self, workflow, monkeypatch):
        captured = {}

        async def fake_get_user(uid):
            return {"name": "Maria", "email": "maria@test.com"}

        def fake_send_email(to, subject, body):
            captured["to"] = to
            captured["subject"] = subject
            captured["body"] = body

        monkeypatch.setattr("orchestration.workflows.notifications.get_user", fake_get_user)
        monkeypatch.setattr("orchestration.workflows.notifications._send_email", fake_send_email)
        monkeypatch.setattr("orchestration.workflows.notifications.SMTP_HOST", "")

        event = Event(
            type="review.completed",
            payload={
                "submission_id": "sub-42",
                "actor_id": "usr-001",
                "score": 5,
                "feedback": "Buen desempeno",
            },
        )

        result = await workflow.execute(event)
        assert result.success

        assert captured["to"] == "maria@test.com"
        assert "sub-42" in captured["subject"]
        assert "Maria" in captured["body"]
        assert "★" in captured["body"]
        assert "Buen desempeno" in captured["body"]

    @pytest.mark.asyncio
    async def test_no_feedback(self, workflow, monkeypatch):
        captured = {}

        async def fake_get_user(uid):
            return {"name": "Test", "email": "test@test.com"}

        def fake_send_email(to, subject, body):
            captured["body"] = body

        monkeypatch.setattr("orchestration.workflows.notifications.get_user", fake_get_user)
        monkeypatch.setattr("orchestration.workflows.notifications._send_email", fake_send_email)
        monkeypatch.setattr("orchestration.workflows.notifications.SMTP_HOST", "")

        event = Event(
            type="review.completed",
            payload={
                "submission_id": "sub-99",
                "actor_id": "usr-001",
                "score": 3,
                "feedback": "",
            },
        )

        result = await workflow.execute(event)
        assert result.success
        assert "Feedback del director" not in captured["body"]
