import subprocess
import os
from pathlib import Path


CRF_MAP = {
    "high": "18",
    "medium": "23",
    "low": "28",
}


def compress_video(input_path: str, output_path: str, quality: str = "medium") -> bool:
    crf = CRF_MAP.get(quality, "23")
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-c:v", "libx264", "-crf", crf,
        "-preset", "medium",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
        )
        if result.returncode != 0:
            _log(f"ffmpeg error: {result.stderr[:500]}")
            return False
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except subprocess.TimeoutExpired:
        _log("ffmpeg timed out after 600s")
        return False
    except FileNotFoundError:
        _log("ffmpeg not found in PATH")
        return False


def _log(msg: str) -> None:
    print(f"[COMPRESS] {msg}")


def get_file_size_mb(path: str) -> float:
    return os.path.getsize(path) / (1024 * 1024)


def sanitize_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name).strip("_")
