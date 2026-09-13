from typing import Any, Optional
import requests

from ..utils.config import Config
from ..models.types import LoginResponse, Casting, Round, Participant, Submission


class ApiClient:
    """HTTP client for the Castant API."""

    def __init__(self) -> None:
        self.base_url = Config.BASE_URL
        self.token: Optional[str] = None
        self.session = requests.Session()

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def _get(self, path: str) -> Any:
        resp = self.session.get(
            f"{self.base_url}{path}", headers=self._headers(), timeout=10
        )
        resp.raise_for_status()
        return resp.json()

    def _post(self, path: str, data: dict[str, Any]) -> Any:
        resp = self.session.post(
            f"{self.base_url}{path}", json=data, headers=self._headers(), timeout=10
        )
        resp.raise_for_status()
        return resp.json()

    def login(self, email: str, password: str) -> LoginResponse:
        data = self._post("/auth/login", {"email": email, "password": password})
        self.token = data["token"]
        return LoginResponse(token=data["token"], user_id=data["userId"])

    def login_demo(self, role: str) -> LoginResponse:
        data = self._post("/auth/login", {"xUserId": role})
        self.token = data["token"]
        return LoginResponse(token=data["token"], user_id=data["userId"])

    def get_user(self, user_id: str) -> dict[str, Any]:
        return self._get(f"/users/{user_id}")

    def get_castings(self) -> list[Casting]:
        raw = self._get("/castings")
        castings: list[Casting] = []
        for c in raw:
            participants = [
                Participant(user_id=p["userId"], role=p["role"])
                for p in c.get("participants", [])
            ]
            castings.append(
                Casting(
                    id=c["id"],
                    title=c["title"],
                    description=c.get("description", ""),
                    participants=participants,
                )
            )
        return castings

    def get_casting(self, casting_id: str) -> Casting:
        raw = self._get(f"/castings/{casting_id}")
        participants = [
            Participant(user_id=p["userId"], role=p["role"])
            for p in raw.get("participants", [])
        ]
        rounds: list[Round] = []
        for r in raw.get("rounds", []):
            rounds.append(
                Round(
                    id=r["id"],
                    number=r["number"],
                    casting_id=casting_id,
                    status=r.get("status", "active"),
                )
            )
        return Casting(
            id=raw["id"],
            title=raw["title"],
            description=raw.get("description", ""),
            participants=participants,
            rounds=rounds,
        )

    def get_round(self, round_id: str) -> Round:
        raw = self._get(f"/rounds/{round_id}")
        participants = [
            Participant(
                user_id=p["actorId"],
                role=p["role"],
                name=p.get("name"),
                email=p.get("email"),
            )
            for p in raw.get("participants", [])
        ]
        submissions = [
            Submission(
                id=s["id"],
                actor_id=s["actorId"],
                video_url=s["videoUrl"],
                status=s["status"],
                score=s.get("score"),
                feedback=s.get("feedback"),
                duration=s.get("duration"),
            )
            for s in raw.get("submissions", [])
        ]
        return Round(
            id=raw["id"],
            number=raw["number"],
            casting_id=raw.get("castingId", ""),
            status=raw.get("status", "active"),
            participants=participants,
            submissions=submissions,
        )
