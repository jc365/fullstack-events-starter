# Slate Casting - Desktop Client

Desktop application for the casting management system, built with Python and CustomTkinter.

## Requirements

- Python 3.10+
- Backend running at `http://localhost:3000`

## Installation

```bash
cd desktop

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

Set the API base URL via environment variable (optional):

```bash
export CASTANT_API_URL=http://localhost:3000/api/v1
```

## Running

```bash
cd desktop
source venv/bin/activate
python3 run.py
```

## Features (Phase 1)

- Login with email/password or demo mode
- View castings list with role badges
- Casting details (title, description, participants, rounds)
- Video player with navigation between submissions
- Embedded video playback (pywebview)
- Star-based scoring and feedback for directors

## Project Structure

```
desktop/
├── src/
│   ├── main.py          # App entry point
│   ├── api/
│   │   └── client.py    # HTTP client with auth
│   ├── ui/
│   │   ├── login.py     # Login window
│   │   ├── dashboard.py # Dashboard with castings
│   │   ├── casting_detail.py  # Casting details
│   │   └── video_player.py    # Video player with review
│   ├── models/
│   │   └── types.py     # Data classes
│   └── utils/
│       └── config.py    # Configuration
├── requirements.txt
├── run.py               # Launcher script
└── README.md
```
