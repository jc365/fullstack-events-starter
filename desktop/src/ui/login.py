import customtkinter as ctk
from typing import Callable, Optional

from ..api.client import ApiClient


class LoginWindow(ctk.CTkToplevel):
    """Login window for authentication."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        on_success: Callable[[str], None],
    ) -> None:
        super().__init__(master)
        self.api = api
        self.on_success = on_success

        self.title("Slate Casting - Login")
        self.geometry("400x350")
        self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._build_ui()
        self.lift()
        self.focus_force()

    def _build_ui(self) -> None:
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(expand=True, fill="both", padx=40, pady=30)

        ctk.CTkLabel(
            main, text="Slate Casting", font=ctk.CTkFont(size=24, weight="bold")
        ).pack(pady=(0, 5))
        ctk.CTkLabel(
            main, text="Directorial Suite", font=ctk.CTkFont(size=12), text_color="gray"
        ).pack(pady=(0, 25))

        ctk.CTkLabel(main, text="Email", anchor="w").pack(fill="x")
        self.email_entry = ctk.CTkEntry(main, placeholder_text="user@example.com")
        self.email_entry.pack(fill="x", pady=(2, 10))

        ctk.CTkLabel(main, text="Password", anchor="w").pack(fill="x")
        self.password_entry = ctk.CTkEntry(main, show="*", placeholder_text="Password")
        self.password_entry.pack(fill="x", pady=(2, 10))
        self.password_entry.bind("<Return>", lambda e: self._on_login())

        self.error_label = ctk.CTkLabel(
            main, text="", text_color="#ff4444", font=ctk.CTkFont(size=12)
        )
        self.error_label.pack(pady=(0, 5))

        self.login_btn = ctk.CTkButton(
            main, text="Login", command=self._on_login, height=36
        )
        self.login_btn.pack(fill="x", pady=(5, 0))

    def _on_login(self) -> None:
        email = self.email_entry.get().strip()
        password = self.password_entry.get()

        if not email or not password:
            self.error_label.configure(text="Email and password are required")
            return

        self.login_btn.configure(state="disabled", text="Logging in...")
        self.error_label.configure(text="")

        try:
            resp = self.api.login(email, password)
            self.on_success(resp.user_id)
            self.destroy()
        except Exception as exc:
            msg = str(exc)
            if "401" in msg:
                msg = "Invalid credentials"
            elif "Connection" in msg or "timeout" in msg:
                msg = "Cannot connect to server"
            self.error_label.configure(text=msg)
            self.login_btn.configure(state="normal", text="Login")

    def _on_close(self) -> None:
        self.api.token = None
        self.master.destroy()
