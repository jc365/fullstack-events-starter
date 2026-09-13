import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import customtkinter as ctk

from src.utils.config import Config
from src.api.client import ApiClient
from src.ui.login import LoginWindow
from src.ui.dashboard import DashboardWindow


class App(ctk.CTk):
    """Main application window."""

    def __init__(self) -> None:
        super().__init__()
        self.api = ApiClient()
        self.withdraw()

        self.title(Config.APP_TITLE)
        self.geometry(f"{Config.LOGIN_WIDTH}x{Config.LOGIN_HEIGHT}")
        self.resizable(False, False)

        ctk.set_appearance_mode(Config.THEME)
        ctk.set_default_color_theme("blue")

        self.after(100, self._show_login)

    def _show_login(self) -> None:
        self.deiconify()
        LoginWindow(self, self.api, on_success=self._on_login_success)

    def _on_login_success(self, user_id: str) -> None:
        self.geometry(f"{Config.WINDOW_WIDTH}x{Config.WINDOW_HEIGHT}")
        self.resizable(True, True)
        DashboardWindow(self, self.api, user_id, on_logout=self._on_logout)

    def _on_logout(self) -> None:
        self.geometry(f"{Config.LOGIN_WIDTH}x{Config.LOGIN_HEIGHT}")
        self.resizable(False, False)
        self._show_login()


def main() -> None:
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
