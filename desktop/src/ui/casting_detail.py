import customtkinter as ctk
from typing import Callable

from ..api.client import ApiClient
from ..models.types import Casting, Round


class CastingDetailWindow(ctk.CTkToplevel):
    """Casting detail window with rounds list."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        casting: Casting,
        on_round_selected: Callable[[str], None],
    ) -> None:
        super().__init__(master)
        self.api = api
        self.casting = casting
        self.on_round_selected = on_round_selected

        self.title(f"Casting - {casting.title}")
        self.geometry("900x600")
        self.resizable(True, True)

        self._build_ui()
        self._load_details()

    def _build_ui(self) -> None:
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=20, pady=15)
        main.grid_columnconfigure(0, weight=1)
        main.grid_rowconfigure(2, weight=1)

        header = ctk.CTkFrame(main, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        header.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            header,
            text=self.casting.title,
            font=ctk.CTkFont(size=22, weight="bold"),
        ).grid(row=0, column=0, sticky="w")

        roles = list({p.role for p in self.casting.participants})
        roles_text = ", ".join(r.capitalize() for r in roles) if roles else "No role"
        ctk.CTkLabel(
            header,
            text=roles_text,
            font=ctk.CTkFont(size=12),
            text_color="#3B82F6",
        ).grid(row=1, column=0, sticky="w", pady=(2, 0))

        if self.casting.description:
            ctk.CTkLabel(
                main,
                text=self.casting.description,
                font=ctk.CTkFont(size=13),
                text_color="gray",
                anchor="w",
                wraplength=850,
            ).grid(row=1, column=0, sticky="w", pady=(0, 10))

        participants_frame = ctk.CTkFrame(main)
        participants_frame.grid(row=2, column=0, sticky="nsew", pady=(0, 10))
        participants_frame.grid_columnconfigure(0, weight=1)
        participants_frame.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(
            participants_frame,
            text="Participants",
            font=ctk.CTkFont(size=14, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=12, pady=(10, 5))

        self.participants_text = ctk.CTkTextbox(
            participants_frame, height=80, state="disabled"
        )
        self.participants_text.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 10))

        rounds_frame = ctk.CTkFrame(main)
        rounds_frame.grid(row=3, column=0, sticky="nsew")
        rounds_frame.grid_columnconfigure(0, weight=1)
        rounds_frame.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(
            rounds_frame,
            text="Rounds",
            font=ctk.CTkFont(size=14, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=12, pady=(10, 5))

        self.rounds_scroll = ctk.CTkScrollableFrame(rounds_frame)
        self.rounds_scroll.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 10))
        self.rounds_scroll.grid_columnconfigure(0, weight=1)

    def _load_details(self) -> None:
        self.participants_text.configure(state="normal")
        self.participants_text.delete("1.0", "end")
        for p in self.casting.participants:
            role_label = p.role.capitalize()
            self.participants_text.insert("end", f"{role_label}: {p.user_id}\n")
        self.participants_text.configure(state="disabled")

        for widget in self.rounds_scroll.winfo_children():
            widget.destroy()

        if not self.casting.rounds:
            ctk.CTkLabel(
                self.rounds_scroll,
                text="No rounds yet.",
                font=ctk.CTkFont(size=12),
                text_color="gray",
            ).grid(row=0, column=0, pady=20)
            return

        for i, round in enumerate(self.casting.rounds):
            self._create_round_card(round, i)

    def _create_round_card(self, round: Round, row: int) -> None:
        card = ctk.CTkFrame(self.rounds_scroll, corner_radius=8)
        card.grid(row=row, column=0, sticky="ew", pady=4)
        card.grid_columnconfigure(1, weight=1)

        status_color = "#22C55E" if round.status == "active" else "#6B7280"

        ctk.CTkLabel(
            card,
            text=f"Round {round.number}",
            font=ctk.CTkFont(size=14, weight="bold"),
        ).grid(row=0, column=0, sticky="w", padx=12, pady=(8, 2))

        ctk.CTkLabel(
            card,
            text=round.status.capitalize(),
            font=ctk.CTkFont(size=11),
            text_color=status_color,
        ).grid(row=1, column=0, sticky="w", padx=12, pady=(0, 8))

        info_frame = ctk.CTkFrame(card, fg_color="transparent")
        info_frame.grid(row=0, column=1, rowspan=2, sticky="e", padx=12, pady=8)

        ctk.CTkLabel(
            info_frame,
            text=f"{len(round.participants)} participants",
            font=ctk.CTkFont(size=11),
            text_color="gray",
        ).pack(side="left", padx=(0, 10))

        ctk.CTkLabel(
            info_frame,
            text=f"{len(round.submissions)} submissions",
            font=ctk.CTkFont(size=11),
            text_color="gray",
        ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            card,
            text="View Round",
            width=100,
            height=28,
            font=ctk.CTkFont(size=12),
            command=lambda r=round: self._on_view_round(r),
        ).grid(row=0, column=2, rowspan=2, padx=12, pady=8)

    def _on_view_round(self, round: Round) -> None:
        self.on_round_selected(round.id)
        self.destroy()
