import customtkinter as ctk
import subprocess
from typing import Callable, Optional

from ..api.client import ApiClient
from ..models.types import Submission
from ..utils.config import Config


class VideoPlayerWindow(ctk.CTkToplevel):
    """Video player window with navigation between submissions."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        submissions: list[Submission],
        current_index: int = 0,
        is_director: bool = False,
        on_review_updated: Optional[Callable[[], None]] = None,
    ) -> None:
        super().__init__(master)
        self.api = api
        self.submissions = submissions
        self.current_index = current_index
        self.is_director = is_director
        self.on_review_updated = on_review_updated
        self.selected_stars: int = 0

        self.title("Video Player")
        self.geometry("720x580")
        self.minsize(600, 480)
        self.resizable(True, True)

        self._build_ui()
        self._show_current_video()

    def _resolve_url(self, url: str) -> str:
        if url.startswith("http://") or url.startswith("https://"):
            return url
        base = Config.BASE_URL.rsplit("/api", 1)[0]
        return f"{base}/{url.lstrip('/')}"

    def _build_ui(self) -> None:
        self.main = ctk.CTkFrame(self, fg_color="transparent")
        self.main.pack(fill="both", expand=True, padx=16, pady=12)
        self.main.grid_columnconfigure(0, weight=1)
        self.main.grid_rowconfigure(2, weight=1)

        nav = ctk.CTkFrame(self.main, fg_color="transparent")
        nav.grid(row=0, column=0, sticky="ew", pady=(0, 6))
        nav.grid_columnconfigure(1, weight=1)

        self.prev_btn = ctk.CTkButton(
            nav, text="<<", width=50, height=30,
            font=ctk.CTkFont(size=12), command=self._prev_video,
        )
        self.prev_btn.grid(row=0, column=0, padx=(0, 4))

        self.counter_label = ctk.CTkLabel(
            nav, text="", font=ctk.CTkFont(size=12), text_color="gray",
        )
        self.counter_label.grid(row=0, column=1)

        self.next_btn = ctk.CTkButton(
            nav, text=">>", width=50, height=30,
            font=ctk.CTkFont(size=12), command=self._next_video,
        )
        self.next_btn.grid(row=0, column=2, padx=(4, 0))

        self.content_frame = ctk.CTkFrame(self.main, fg_color="transparent")
        self.content_frame.grid(row=1, column=0, sticky="nsew")
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_rowconfigure(0, weight=1)

        self._build_footer()

    def _build_footer(self) -> None:
        self.footer = ctk.CTkFrame(self.main)
        self.footer.grid(row=2, column=0, sticky="ew", pady=(6, 0))
        self.footer.grid_columnconfigure(0, weight=1)

        stars_row = ctk.CTkFrame(self.footer, fg_color="transparent")
        stars_row.grid(row=0, column=0, sticky="ew", padx=10, pady=(8, 4))
        stars_row.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(
            stars_row, text="Score:", font=ctk.CTkFont(size=12),
        ).grid(row=0, column=0, padx=(0, 6))

        self.star_buttons: list[ctk.CTkButton] = []
        for i in range(1, 6):
            btn = ctk.CTkButton(
                stars_row, text="☆", width=32, height=28,
                font=ctk.CTkFont(size=16), fg_color="transparent",
                hover_color="#374151",
                command=lambda s=i: self._select_star(s),
            )
            btn.grid(row=0, column=i, padx=1)
            self.star_buttons.append(btn)

        self.submit_btn = ctk.CTkButton(
            stars_row, text="Submit", width=70, height=28,
            font=ctk.CTkFont(size=11, weight="bold"),
            command=self._submit_review,
        )
        self.submit_btn.grid(row=0, column=6, padx=(8, 0))

        ctk.CTkLabel(
            self.footer, text="Feedback:", font=ctk.CTkFont(size=11),
        ).grid(row=1, column=0, sticky="w", padx=10, pady=(4, 0))

        self.feedback_text = ctk.CTkTextbox(self.footer, height=50)
        self.feedback_text.grid(row=2, column=0, sticky="ew", padx=10, pady=(2, 8))

    def _show_current_video(self) -> None:
        sub = self.submissions[self.current_index]
        full_url = self._resolve_url(sub.video_url)
        total = len(self.submissions)
        self.title(f"{sub.actor_id} — {self.current_index + 1}/{total}")

        self.counter_label.configure(text=f"{self.current_index + 1} / {total}")
        self.prev_btn.configure(state="normal" if self.current_index > 0 else "disabled")
        self.next_btn.configure(
            state="normal" if self.current_index < total - 1 else "disabled"
        )

        for w in self.content_frame.winfo_children():
            w.destroy()

        card = ctk.CTkFrame(self.content_frame, corner_radius=8)
        card.grid(row=0, column=0, sticky="nsew")
        card.grid_columnconfigure(0, weight=1)

        header = ctk.CTkFrame(card, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=12, pady=(10, 4))
        header.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            header, text=sub.actor_id,
            font=ctk.CTkFont(size=15, weight="bold"),
        ).grid(row=0, column=0, sticky="w")

        status_colors = {
            "pending": "#F59E0B", "reviewed": "#3B82F6",
            "selected": "#22C55E", "rejected": "#EF4444",
        }
        ctk.CTkLabel(
            header, text=sub.status.capitalize(),
            font=ctk.CTkFont(size=11),
            text_color=status_colors.get(sub.status, "#6B7280"),
        ).grid(row=0, column=1, sticky="e")

        if sub.score is not None and sub.score > 0:
            stars = round(sub.score / 2)
            ctk.CTkLabel(
                header, text=f"{'★' * stars}{'☆' * (5 - stars)}",
                font=ctk.CTkFont(size=13), text_color="#F59E0B",
            ).grid(row=0, column=2, padx=(8, 0))

        play_frame = ctk.CTkFrame(card, fg_color="#1a1a2e", corner_radius=8)
        play_frame.grid(row=1, column=0, sticky="ew", padx=10, pady=(4, 8))
        play_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkButton(
            play_frame, text="Play Video", height=36,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#22C55E", hover_color="#16A34A",
            command=lambda u=full_url: self._play_video(u),
        ).grid(row=0, column=0, pady=(10, 4), padx=20, sticky="ew")

        ctk.CTkLabel(
            play_frame, text=full_url,
            font=ctk.CTkFont(size=9), text_color="#6B7280",
            wraplength=650,
        ).grid(row=1, column=0, pady=(0, 10), padx=10)

        if sub.feedback:
            fb = ctk.CTkFrame(card, fg_color="transparent")
            fb.grid(row=2, column=0, sticky="ew", padx=10, pady=(0, 6))
            fb.grid_columnconfigure(0, weight=1)

            ctk.CTkLabel(
                fb, text="Feedback:", font=ctk.CTkFont(size=11, weight="bold"),
            ).grid(row=0, column=0, sticky="w", pady=(0, 2))

            fb_box = ctk.CTkTextbox(fb, height=40, state="disabled")
            fb_box.grid(row=1, column=0, sticky="ew")
            fb_box.configure(state="normal")
            fb_box.insert("1.0", sub.feedback)
            fb_box.configure(state="disabled")

        self.feedback_text.delete("1.0", "end")
        if sub.feedback:
            self.feedback_text.insert("1.0", sub.feedback)

        show_review = self.is_director and sub.status not in ("selected", "rejected")
        state = "normal" if show_review else "disabled"
        for btn in self.star_buttons:
            btn.configure(state=state)
        self.feedback_text.configure(state=state)
        self.submit_btn.configure(state=state)

    def _play_video(self, url: str) -> None:
        subprocess.Popen(["mpv", url])

    def _prev_video(self) -> None:
        if self.current_index > 0:
            self.current_index -= 1
            self._show_current_video()

    def _next_video(self) -> None:
        if self.current_index < len(self.submissions) - 1:
            self.current_index += 1
            self._show_current_video()

    def _select_star(self, stars: int) -> None:
        self.selected_stars = 0 if self.selected_stars == stars else stars
        for i, btn in enumerate(self.star_buttons, start=1):
            btn.configure(text="★" if i <= self.selected_stars else "☆")

    def _submit_review(self) -> None:
        if self.selected_stars == 0:
            return
        sub = self.submissions[self.current_index]
        score = self.selected_stars * 2
        feedback = self.feedback_text.get("1.0", "end").strip()
        try:
            self.api._post(
                f"/submissions/{sub.id}/review",
                {"score": score, "feedback": feedback},
            )
            if self.on_review_updated:
                self.on_review_updated()
            self._show_current_video()
        except Exception as exc:
            print(f"Error submitting review: {exc}")
