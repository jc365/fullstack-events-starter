import customtkinter as ctk
import tkinter.messagebox as messagebox
import threading
import os
from typing import Callable

from ..api.client import ApiClient
from ..models.types import Submission
from ..utils.zip_exporter import export_round_videos
from ..utils.paths import get_downloads_dir


class ExportDialog(ctk.CTkToplevel):
    """Export dialog for round videos."""

    def __init__(
        self,
        master: ctk.CTk,
        api: ApiClient,
        round_id: str,
        round_number: int,
        casting_title: str,
        submissions: list[Submission],
        on_complete: Callable[[list[str]], None],
    ) -> None:
        super().__init__(master)
        self.api = api
        self.round_id = round_id
        self.round_number = round_number
        self.casting_title = casting_title
        self.submissions = submissions
        self.on_complete = on_complete

        self.title(f"Export Round {round_number} Videos")
        self.geometry("480x380")
        self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        self._exporting = False
        self._cancelled = False
        self._created_zips: list[str] = []
        self._build_ui()

    def _build_ui(self) -> None:
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=20, pady=15)

        ctk.CTkLabel(
            main, text=f"Export Round {self.round_number}",
            font=ctk.CTkFont(size=18, weight="bold"),
        ).pack(anchor="w", pady=(0, 4))

        ctk.CTkLabel(
            main, text=f"{len(self.submissions)} videos to export",
            font=ctk.CTkFont(size=12), text_color="gray",
        ).pack(anchor="w", pady=(0, 12))

        opts = ctk.CTkFrame(main)
        opts.pack(fill="x", pady=(0, 12))
        opts.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(opts, text="Compress videos:").grid(
            row=0, column=0, sticky="w", padx=10, pady=8,
        )
        self.compress_var = ctk.BooleanVar(value=True)
        ctk.CTkSwitch(opts, text="", variable=self.compress_var, width=50).grid(
            row=0, column=1, sticky="w", pady=8,
        )

        ctk.CTkLabel(opts, text="Quality:").grid(
            row=1, column=0, sticky="w", padx=10, pady=8,
        )
        self.quality_var = ctk.StringVar(value="medium")
        quality_menu = ctk.CTkOptionMenu(
            opts, variable=self.quality_var,
            values=["high", "medium", "low"], width=120,
        )
        quality_menu.grid(row=1, column=1, sticky="w", pady=8)

        ctk.CTkLabel(opts, text="Max ZIP size (MB):").grid(
            row=2, column=0, sticky="w", padx=10, pady=8,
        )
        self.max_size_var = ctk.StringVar(value="500")
        ctk.CTkEntry(opts, textvariable=self.max_size_var, width=80).grid(
            row=2, column=1, sticky="w", pady=8,
        )

        self.progress_label = ctk.CTkLabel(
            main, text="", font=ctk.CTkFont(size=11), text_color="gray",
        )
        self.progress_label.pack(anchor="w", pady=(4, 4))

        self.progress_bar = ctk.CTkProgressBar(main, width=400, height=14)
        self.progress_bar.pack(fill="x", pady=(0, 12))
        self.progress_bar.set(0)

        btn_frame = ctk.CTkFrame(main, fg_color="transparent")
        btn_frame.pack(fill="x")

        self.export_btn = ctk.CTkButton(
            btn_frame, text="Export", height=36, width=120,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color="#22C55E", hover_color="#16A34A",
            command=self._start_export,
        )
        self.export_btn.pack(side="left")

        self.cancel_btn = ctk.CTkButton(
            btn_frame, text="Cancel", height=36, width=100,
            font=ctk.CTkFont(size=12),
            fg_color="#6B7280", hover_color="#4B5563",
            command=self._on_cancel,
        )
        self.cancel_btn.pack(side="right")

    def _start_export(self) -> None:
        if self._exporting:
            return
        self._exporting = True
        self._cancelled = False
        self._created_zips = []
        self.export_btn.configure(state="disabled", text="Exporting...")

        try:
            max_size = int(self.max_size_var.get())
        except ValueError:
            max_size = 500

        output_dir = os.path.join(get_downloads_dir(), "casting_exports")

        def _run():
            zips = export_round_videos(
                api=self.api,
                round_id=self.round_id,
                round_number=self.round_number,
                casting_title=self.casting_title,
                submissions=self.submissions,
                output_dir=output_dir,
                compress=self.compress_var.get(),
                quality=self.quality_var.get(),
                max_size_per_zip=max_size,
                on_progress=self._on_progress,
                is_cancelled=lambda: self._cancelled,
            )
            self._created_zips = zips
            self.after(0, lambda: self._on_done(zips))

        threading.Thread(target=_run, daemon=True).start()

    def _on_progress(self, current: int, total: int, message: str) -> None:
        def _update():
            self.progress_label.configure(text=message)
            self.progress_bar.set(current / total if total > 0 else 0)
        self.after(0, _update)

    def _on_done(self, zips: list[str]) -> None:
        self._exporting = False
        self.progress_bar.set(1.0)

        if self._cancelled:
            self._cleanup_partial_zips()
            self.destroy()
            messagebox.showinfo("Export cancelled", "The export has been cancelled.")
            return

        if zips:
            names = ", ".join(os.path.basename(z) for z in zips)
            self.on_complete(zips)
            self.destroy()
            messagebox.showinfo("Export completed", f"Exported: {names}")
        else:
            self.progress_label.configure(
                text="Export failed. Check if ffmpeg is installed.",
                text_color="#EF4444",
            )
            self.export_btn.configure(state="normal", text="Retry")
            self.cancel_btn.configure(state="normal")

    def _cleanup_partial_zips(self) -> None:
        for zp in self._created_zips:
            try:
                if os.path.exists(zp):
                    os.remove(zp)
            except OSError:
                pass

    def _on_cancel(self) -> None:
        if not self._exporting:
            self.destroy()
            return
        self._cancelled = True
        self.cancel_btn.configure(state="disabled", text="Cancelling...")
        self.progress_label.configure(text="Cancelling...", text_color="#F59E0B")

    def _on_close(self) -> None:
        if not self._exporting:
            self.destroy()
