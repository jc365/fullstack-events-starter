from dataclasses import dataclass, field
from typing import Optional


@dataclass
class User:
    id: str
    name: str
    email: str


@dataclass
class Participant:
    user_id: str
    role: str
    name: Optional[str] = None
    email: Optional[str] = None


@dataclass
class Submission:
    id: str
    actor_id: str
    video_url: str
    status: str
    score: Optional[float] = None
    feedback: Optional[str] = None
    duration: Optional[int] = None


@dataclass
class Round:
    id: str
    number: int
    casting_id: str
    status: str = "active"
    participants: list[Participant] = field(default_factory=list)
    submissions: list[Submission] = field(default_factory=list)


@dataclass
class Casting:
    id: str
    title: str
    description: str
    participants: list[Participant] = field(default_factory=list)
    rounds: list[Round] = field(default_factory=list)


@dataclass
class LoginResponse:
    token: str
    user_id: str
