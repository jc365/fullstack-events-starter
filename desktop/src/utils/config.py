import os


class Config:
    """Application configuration."""

    BASE_URL: str = os.getenv("CASTANT_API_URL", "http://localhost:3000/api/v1")
    APP_TITLE: str = "Slate Casting - Directorial Suite"
    WINDOW_WIDTH: int = 1200
    WINDOW_HEIGHT: int = 700
    LOGIN_WIDTH: int = 400
    LOGIN_HEIGHT: int = 350
    THEME: str = "dark"
