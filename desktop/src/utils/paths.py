import os
import platform


def get_downloads_dir() -> str:
    """Obtiene la ruta de la carpeta de descargas del usuario (multiplataforma)."""
    home = os.path.expanduser("~")

    if platform.system() == "Windows":
        return os.path.join(os.environ.get("USERPROFILE", home), "Downloads")
    elif platform.system() == "Darwin":
        return os.path.join(home, "Downloads")
    else:
        try:
            import subprocess
            result = subprocess.run(
                ["xdg-user-dir", "DOWNLOAD"],
                capture_output=True, text=True, check=True,
            )
            path = result.stdout.strip()
            if path and os.path.isdir(path):
                return path
        except Exception:
            pass
        for name in ["Descargas", "Downloads", "Download"]:
            path = os.path.join(home, name)
            if os.path.isdir(path):
                return path
        return os.path.join(home, "Downloads")
