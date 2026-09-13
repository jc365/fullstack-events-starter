import json
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from ..models.types import Submission
from ..utils.video_compressor import (
    compress_video,
    get_file_size_mb,
    sanitize_filename,
)
from ..api.client import ApiClient


def _download_video(api: ApiClient, url: str, dest: str) -> bool:
    try:
        resp = api.session.get(url, stream=True, timeout=60)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return os.path.exists(dest)
    except Exception:
        return False


def _build_manifest(
    round_id: str,
    round_number: int,
    casting_title: str,
    entries: list[dict],
) -> dict:
    total_size = sum(e.get("compressedSize", e.get("originalSize", 0)) for e in entries)
    clean_entries = [{k: v for k, v in e.items() if k != "_localPath"} for e in entries]
    return {
        "exportDate": datetime.now(timezone.utc).isoformat(),
        "roundId": round_id,
        "castingTitle": casting_title,
        "roundNumber": round_number,
        "totalVideos": len(clean_entries),
        "totalSize": total_size,
        "videos": clean_entries,
    }


def _log(msg: str) -> None:
    print(f"[EXPORT] {msg}")


def export_round_videos(
    api: ApiClient,
    round_id: str,
    round_number: int,
    casting_title: str,
    submissions: list[Submission],
    output_dir: str,
    compress: bool = True,
    quality: str = "medium",
    max_size_per_zip: int = 500,
    on_progress: Optional[Callable[[int, int, str], None]] = None,
    is_cancelled: Optional[Callable[[], bool]] = None,
) -> list[str]:
    os.makedirs(output_dir, exist_ok=True)
    tmp_dir = os.path.join(output_dir, "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    from datetime import datetime
    timestamp_prefix = datetime.now().strftime("%Y%m%d-%H%M%S")

    actor_map: dict[str, dict[str, str]] = {}
    try:
        round_data = api.get_round(round_id)
        for p in round_data.participants:
            actor_map[p.user_id] = {
                "name": p.name or p.user_id,
                "email": p.email or "",
            }
    except Exception:
        pass

    def _cancelled() -> bool:
        return is_cancelled is not None and is_cancelled()

    entries: list[dict] = []
    total = len(submissions)
    _log(f"Starting export: {total} videos, compress={compress}, quality={quality}")

    for idx, sub in enumerate(submissions):
        if _cancelled():
            _log("Export cancelled by user")
            break

        actor = actor_map.get(sub.actor_id, {"name": sub.actor_id, "email": ""})
        actor_name = actor["name"]
        actor_email = actor["email"]

        if on_progress:
            on_progress(idx + 1, total, f"Downloading {actor_name}...")

        ext = Path(sub.video_url).suffix or ".mp4"
        safe_actor = sanitize_filename(actor_name)
        original_file = os.path.join(tmp_dir, f"{safe_actor}#{sub.id}_original{ext}")

        full_url = sub.video_url
        if not full_url.startswith("http"):
            base = api.base_url.rsplit("/api", 1)[0]
            full_url = f"{base}/{full_url.lstrip('/')}"

        if not _download_video(api, full_url, original_file):
            _log(f"FAILED to download: {full_url}")
            continue

        original_size = os.path.getsize(original_file)
        _log(f"Downloaded {actor_name}: {original_size / 1024 / 1024:.1f} MB")
        final_file = original_file

        if compress:
            if _cancelled():
                _log("Export cancelled by user")
                break
            if on_progress:
                on_progress(idx + 1, total, f"Compressing {actor_name}...")
            compressed_file = os.path.join(tmp_dir, f"{safe_actor}#{sub.id}_compressed.mp4")
            _log(f"Compressing {actor_name} (CRF={quality})...")
            ok = compress_video(original_file, compressed_file, quality)
            if ok and os.path.exists(compressed_file):
                compressed_size = os.path.getsize(compressed_file)
                ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
                _log(f"Compressed {sub.actor_id}: {compressed_size / 1024 / 1024:.1f} MB ({ratio:.0f}% reduction)")
                final_file = compressed_file
            else:
                _log(f"Compression FAILED for {sub.actor_id}, using original")

        final_name = f"{safe_actor}#{sub.id}{ext}"
        entry = {
            "actorName": actor_name,
            "actorEmail": actor_email,
            "filename": final_name,
            "score": sub.score,
            "feedback": sub.feedback,
            "duration": sub.duration,
            "originalSize": original_size,
            "compressedSize": os.path.getsize(final_file),
            "compressed": final_file != original_file,
            "_localPath": final_file,
        }
        entries.append(entry)

    if on_progress:
        on_progress(total, total, "Creating ZIP files...")

    _log(f"Creating ZIPs from {len(entries)} videos")
    zips = _create_zips(entries, output_dir, round_id, round_number, casting_title, max_size_per_zip, timestamp_prefix)

    for zp in zips:
        _log(f"ZIP created: {zp} ({os.path.getsize(zp) / 1024 / 1024:.1f} MB)")

    for entry in entries:
        entry.pop("_localPath", None)

    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return zips


def _create_zips(
    entries: list[dict],
    output_dir: str,
    round_id: str,
    round_number: int,
    casting_title: str,
    max_size_mb: int,
    timestamp_prefix: str = "",
) -> list[str]:
    zip_paths: list[str] = []
    batch: list[dict] = []
    batch_size = 0
    batch_num = 1
    max_bytes = max_size_mb * 1024 * 1024

    for entry in entries:
        file_size = entry.get("compressedSize", entry.get("originalSize", 0))
        if batch and batch_size + file_size > max_bytes:
            zip_path = _write_zip(batch, batch_num, output_dir, round_id, round_number, casting_title, timestamp_prefix)
            zip_paths.append(zip_path)
            batch_num += 1
            batch = []
            batch_size = 0
        batch.append(entry)
        batch_size += file_size

    if batch:
        zip_path = _write_zip(batch, batch_num, output_dir, round_id, round_number, casting_title, timestamp_prefix)
        zip_paths.append(zip_path)

    return zip_paths


def _write_zip(
    entries: list[dict],
    batch_num: int,
    output_dir: str,
    round_id: str,
    round_number: int,
    casting_title: str,
    timestamp_prefix: str = "",
) -> str:
    safe_title = sanitize_filename(casting_title)
    prefix = f"{timestamp_prefix}_" if timestamp_prefix else ""
    zip_name = f"{prefix}{safe_title}_round{round_number}_#zip{batch_num}.zip"
    zip_path = os.path.join(output_dir, zip_name)

    manifest = _build_manifest(round_id, round_number, casting_title, entries)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
        for entry in entries:
            local_path = entry.get("_localPath")
            if local_path and os.path.exists(local_path):
                zf.write(local_path, entry["filename"])

    return zip_path
