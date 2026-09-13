import customtkinter as ctk
from typing import Callable

from ..api.client import ApiClient
from ..models.types import Casting
from .casting_detail import CastingDetailWindow
from .round_detail import RoundDetailWindow


class DashboardWindow(ctk.CTkToplevel):
    """Dashboard window showing castings list."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        user_id: str,
        on_logout: Callable[[], None],
    ) -> None:
        super().__init__(master)
        self.api = api
        self.user_id = user_id
        self.on_logout = on_logout
        self.castings: list[Casting] = []

        self.title("Slate Casting - Dashboard")
        self.geometry("1200x700")
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._build_ui()
        self._load_castings()

    def _build_ui(self) -> None:
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        sidebar = ctk.CTkFrame(self, width=220, corner_radius=0)
        sidebar.grid(row=0, column=0, sticky="nsew")
        sidebar.grid_propagate(False)

        ctk.CTkLabel(
            sidebar,
            text="Slate Casting",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color="#3B82F6",
        ).pack(padx=20, pady=(20, 5))

        ctk.CTkLabel(
            sidebar,
            text="Directorial Suite",
            font=ctk.CTkFont(size=11),
            text_color="gray",
        ).pack(padx=20, pady=(0, 20))

        ctk.CTkButton(
            sidebar, text="Dashboard", state="disabled", height=36
        ).pack(padx=10, pady=2, fill="x")

        ctk.CTkButton(
            sidebar, text="Create Casting", height=36,
            command=lambda: print("[TODO] Create Casting"),
        ).pack(padx=10, pady=2, fill="x")

        ctk.CTkButton(
            sidebar,
            text="Logout",
            fg_color="#DC2626",
            hover_color="#B91C1C",
            height=36,
            command=self._on_logout,
        ).pack(padx=10, pady=(20, 10), side="bottom", fill="x")

        content = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        content.grid(row=0, column=1, sticky="nsew")
        content.grid_columnconfigure(0, weight=1)
        content.grid_rowconfigure(1, weight=1)

        header = ctk.CTkFrame(content, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=20, pady=(15, 5))

        ctk.CTkLabel(
            header, text="Your Castings", font=ctk.CTkFont(size=20, weight="bold")
        ).pack(side="left")

        self.status_label = ctk.CTkLabel(
            header, text="", font=ctk.CTkFont(size=12), text_color="gray"
        )
        self.status_label.pack(side="right")

        self.scroll_frame = ctk.CTkScrollableFrame(content)
        self.scroll_frame.grid(row=1, column=0, sticky="nsew", padx=20, pady=(5, 15))
        self.scroll_frame.grid_columnconfigure(0, weight=1)

    def _load_castings(self) -> None:
        self.status_label.configure(text="Loading castings...")
        try:
            self.castings = self.api.get_castings()
            self._render_castings()
            count = len(self.castings)
            self.status_label.configure(
                text=f"{count} casting{'s' if count != 1 else ''}"
            )
        except Exception as exc:
            self.status_label.configure(text=f"Error: {exc}")

    def _render_castings(self) -> None:
        for widget in self.scroll_frame.winfo_children():
            widget.destroy()

        if not self.castings:
            ctk.CTkLabel(
                self.scroll_frame,
                text="No castings yet.",
                font=ctk.CTkFont(size=14),
                text_color="gray",
            ).grid(row=0, column=0, pady=40)
            return

        for i, casting in enumerate(self.castings):
            self._create_casting_card(casting, i)

    def _create_casting_card(self, casting: Casting, row: int) -> None:
        card = ctk.CTkFrame(self.scroll_frame, corner_radius=10)
        card.grid(row=row, column=0, sticky="ew", pady=5)
        card.grid_columnconfigure(0, weight=1)

        top = ctk.CTkFrame(card, fg_color="transparent")
        top.grid(row=0, column=0, sticky="ew", padx=15, pady=(12, 5))
        top.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            top,
            text=casting.title,
            font=ctk.CTkFont(size=16, weight="bold"),
            anchor="w",
        ).grid(row=0, column=0, sticky="w")

        roles = list({p.role for p in casting.participants})
        roles_text = ", ".join(r.capitalize() for r in roles) if roles else "No role"
        ctk.CTkLabel(
            top, text=roles_text, font=ctk.CTkFont(size=11), text_color="#3B82F6"
        ).grid(row=1, column=0, sticky="w", pady=(2, 0))

        if casting.description:
            desc = casting.description[:120]
            if len(casting.description) > 120:
                desc += "..."
            ctk.CTkLabel(
                card,
                text=desc,
                font=ctk.CTkFont(size=12),
                text_color="gray",
                anchor="w",
                wraplength=700,
            ).grid(row=1, column=0, sticky="w", padx=15, pady=(0, 8))

        bottom = ctk.CTkFrame(card, fg_color="transparent")
        bottom.grid(row=2, column=0, sticky="ew", padx=15, pady=(0, 12))

        participants = len(casting.participants)
        ctk.CTkLabel(
            bottom,
            text=f"{participants} participant{'s' if participants != 1 else ''}",
            font=ctk.CTkFont(size=11),
            text_color="gray",
        ).pack(side="left")

        ctk.CTkButton(
            bottom,
            text="View Details",
            width=110,
            height=30,
            font=ctk.CTkFont(size=12),
            command=lambda c=casting: self._on_view_details(c),
        ).pack(side="right")

    def _on_view_details(self, casting: Casting) -> None:
        full_casting = self.api.get_casting(casting.id)
        CastingDetailWindow(
            self,
            self.api,
            full_casting,
            on_round_selected=lambda rid, ct=casting.title: self._on_round_selected(rid, ct),
        )

    def _on_round_selected(self, round_id: str, casting_title: str = "") -> None:
        rnd = self.api.get_round(round_id)
        RoundDetailWindow(
            self, self.api, rnd, casting_title,
            is_director=True, on_refresh=self._load_castings,
        )

    def _on_logout(self) -> None:
        self.api.token = None
        self.on_logout()
        self.destroy()

    def _on_close(self) -> None:
        self.api.token = None
        self.on_logout()
        self.master.destroy()
