import customtkinter as ctk
from typing import Callable, Optional

from ..api.client import ApiClient
from ..models.types import Round, Submission
from .video_player import VideoPlayerWindow
from .export_dialog import ExportDialog


class RoundDetailWindow(ctk.CTkToplevel):
    """Round detail window with submissions and export."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        round: Round,
        casting_title: str,
        is_director: bool = False,
        on_refresh: Optional[Callable[[], None]] = None,
    ) -> None:
        super().__init__(master)
        self.api = api
        self.round = round
        self.casting_title = casting_title
        self.is_director = is_director
        self.on_refresh = on_refresh

        self.title(f"Round {round.number} — {casting_title}")
        self.geometry("800x600")
        self.minsize(650, 450)
        self.resizable(True, True)

        self._build_ui()

    def _build_ui(self) -> None:
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=16, pady=12)
        main.grid_columnconfigure(0, weight=1)
        main.grid_rowconfigure(2, weight=1)

        header = ctk.CTkFrame(main, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        header.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            header, text=f"Round {self.round.number}",
            font=ctk.CTkFont(size=20, weight="bold"),
        ).grid(row=0, column=0, sticky="w")

        status_color = "#22C55E" if self.round.status == "active" else "#6B7280"
        ctk.CTkLabel(
            header, text=self.round.status.capitalize(),
            font=ctk.CTkFont(size=12), text_color=status_color,
        ).grid(row=1, column=0, sticky="w", pady=(2, 0))

        stats = ctk.CTkFrame(header, fg_color="transparent")
        stats.grid(row=0, column=1, rowspan=2, sticky="e")

        ctk.CTkLabel(
            stats, text=f"{len(self.round.participants)} participants",
            font=ctk.CTkFont(size=11), text_color="gray",
        ).pack(side="left", padx=(0, 12))

        ctk.CTkLabel(
            stats, text=f"{len(self.round.submissions)} submissions",
            font=ctk.CTkFont(size=11), text_color="gray",
        ).pack(side="left", padx=(0, 12))

        if self.round.submissions:
            ctk.CTkButton(
                stats, text="Export Videos", width=120, height=28,
                font=ctk.CTkFont(size=11),
                fg_color="#8B5CF6", hover_color="#7C3AED",
                command=self._open_export,
            ).pack(side="left")

        toolbar = ctk.CTkFrame(main, fg_color="transparent")
        toolbar.grid(row=1, column=0, sticky="ew", pady=(0, 6))

        ctk.CTkButton(
            toolbar, text="<< Back", width=80, height=28,
            font=ctk.CTkFont(size=11),
            fg_color="#6B7280", hover_color="#4B5563",
            command=self.destroy,
        ).pack(side="left")

        self.submissions_frame = ctk.CTkScrollableFrame(main)
        self.submissions_frame.grid(row=2, column=0, sticky="nsew")
        self.submissions_frame.grid_columnconfigure(0, weight=1)

        self._render_submissions()

    def _render_submissions(self) -> None:
        for w in self.submissions_frame.winfo_children():
            w.destroy()

        if not self.round.submissions:
            ctk.CTkLabel(
                self.submissions_frame, text="No submissions in this round.",
                font=ctk.CTkFont(size=13), text_color="gray",
            ).grid(row=0, column=0, pady=30)
            return

        for idx, sub in enumerate(self.round.submissions):
            self._submission_card(sub, idx)

    def _submission_card(self, sub: Submission, row: int) -> None:
        card = ctk.CTkFrame(self.submissions_frame, corner_radius=8)
        card.grid(row=row, column=0, sticky="ew", pady=4)
        card.grid_columnconfigure(1, weight=1)

        left = ctk.CTkFrame(card, fg_color="transparent")
        left.grid(row=0, column=0, sticky="w", padx=12, pady=8)

        ctk.CTkLabel(
            left, text=sub.actor_id,
            font=ctk.CTkFont(size=13, weight="bold"),
        ).pack(anchor="w")

        status_colors = {
            "pending": "#F59E0B", "reviewed": "#3B82F6",
            "selected": "#22C55E", "rejected": "#EF4444",
        }
        ctk.CTkLabel(
            left, text=sub.status.capitalize(),
            font=ctk.CTkFont(size=10),
            text_color=status_colors.get(sub.status, "#6B7280"),
        ).pack(anchor="w")

        mid = ctk.CTkFrame(card, fg_color="transparent")
        mid.grid(row=0, column=1, sticky="ew", pady=8)

        if sub.score is not None and sub.score > 0:
            stars = round(sub.score / 2)
            ctk.CTkLabel(
                mid, text=f"{'★' * stars}{'☆' * (5 - stars)}",
                font=ctk.CTkFont(size=12), text_color="#F59E0B",
            ).pack(anchor="w")

        if sub.feedback:
            fb_short = sub.feedback[:60]
            if len(sub.feedback) > 60:
                fb_short += "..."
            ctk.CTkLabel(
                mid, text=fb_short, font=ctk.CTkFont(size=10),
                text_color="gray", anchor="w",
            ).pack(anchor="w")

        right = ctk.CTkFrame(card, fg_color="transparent")
        right.grid(row=0, column=2, sticky="e", padx=12, pady=8)

        ctk.CTkButton(
            right, text="Play", width=60, height=26,
            font=ctk.CTkFont(size=11),
            command=lambda s=sub: self._play_video(s),
        ).pack()

    def _play_video(self, sub: Submission) -> None:
        VideoPlayerWindow(
            self, self.api,
            submissions=self.round.submissions,
            current_index=self.round.submissions.index(sub),
            is_director=self.is_director,
            on_review_updated=self.on_refresh,
        )

    def _open_export(self) -> None:
        ExportDialog(
            self, self.api,
            round_id=self.round.id,
            round_number=self.round.number,
            casting_title=self.casting_title,
            submissions=self.round.submissions,
            on_complete=lambda zips: None,
        )
