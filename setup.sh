#!/usr/bin/env bash
# ==============================================================================
# setup.sh — fullstack-events-starter project initializer
#
# Usage:
#   ./setup.sh <project-name>              # Interactive mode
#   ./setup.sh <project-name> --dry-run    # Preview changes without applying
#
# Idempotent: safe to run multiple times.
# ==============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Globals ───────────────────────────────────────────────────────────────────
DRY_RUN=false
PROJECT_NAME=""
AUTHOR=""
DOMAIN=""
ADMIN_EMAIL=""
CHANGES=0

# ── Helpers ───────────────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}ℹ ${NC}$*"; }
ok()    { echo -e "${GREEN}✔ ${NC}$*"; }
warn()  { echo -e "${YELLOW}⚠ ${NC}$*"; }
err()   { echo -e "${RED}✘ ${NC}$*" >&2; }

to_pascal() {
  echo "$1" | sed -r 's/(^|-)([a-z])/\U\2/g'
}

to_snake() {
  echo "$1" | tr '-' '_'
}

# ── Argument parsing ──────────────────────────────────────────────────────────
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --help|-h)
        echo "Usage: $0 <project-name> [--dry-run]"
        echo ""
        echo "  <project-name>  Kebab-case name (e.g. my-app)"
        echo "  --dry-run        Preview changes without applying"
        exit 0
        ;;
      -*)
        err "Unknown option: $1"
        exit 1
        ;;
      *)
        if [[ -z "$PROJECT_NAME" ]]; then
          PROJECT_NAME="$1"
        fi
        shift
        ;;
    esac
  done
}

validate_name() {
  local name="$1"
  if [[ ! "$name" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
    err "Invalid project name: '$name'"
    echo "  Must be kebab-case: lowercase, starts with letter, hyphens allowed."
    echo "  Examples: my-app, my-project, events-starter"
    exit 1
  fi
}

# ── Interactive prompts ────────────────────────────────────────────────────────
prompt_missing() {
  if [[ -z "$PROJECT_NAME" ]]; then
    read -rp "Project name (kebab-case, e.g. my-app): " PROJECT_NAME
    if [[ -z "$PROJECT_NAME" ]]; then
      err "Project name is required."
      exit 1
    fi
  fi
  validate_name "$PROJECT_NAME"

  if [[ -z "$AUTHOR" ]]; then
    local default_author="The ${PROJECT_NAME} contributors"
    read -rp "Author [$default_author]: " AUTHOR
    AUTHOR="${AUTHOR:-$default_author}"
  fi

  if [[ -z "$DOMAIN" ]]; then
    read -rp "Domain [example.com]: " DOMAIN
    DOMAIN="${DOMAIN:-example.com}"
  fi

  if [[ -z "$ADMIN_EMAIL" ]]; then
    read -rp "Admin email [admin@${DOMAIN}]: " ADMIN_EMAIL
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"
  fi
}

# ── Check idempotency ─────────────────────────────────────────────────────────
check_idempotent() {
  local marker=".setup_done"
  if [[ -f "$marker" ]]; then
    local saved_name
    saved_name=$(cat "$marker")
    if [[ "$saved_name" == "$PROJECT_NAME" ]]; then
      warn "Setup already ran for '$PROJECT_NAME'. Running again (idempotent)."
    else
      warn "Different project previously configured: '$saved_name'."
      read -rp "Continue anyway? [y/N]: " confirm
      if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        exit 0
      fi
    fi
  fi
}

# ── Replace in file ───────────────────────────────────────────────────────────
replace_in_file() {
  local file="$1"
  local old="$2"
  local new="$3"

  if [[ ! -f "$file" ]]; then
    return 0
  fi

  if grep -q "$old" "$file" 2>/dev/null; then
    if $DRY_RUN; then
      echo "  [dry-run] $file: '$old' → '$new'"
    else
      sed -i "s|$old|$new|g" "$file"
    fi
    CHANGES=$((CHANGES + 1))
  fi
}

# ── Apply replacements ────────────────────────────────────────────────────────
apply_replacements() {
  local PASCAL SNAKE
  PASCAL=$(to_pascal "$PROJECT_NAME")
  SNAKE=$(to_snake "$PROJECT_NAME")

  info "Replacing placeholders across project..."

  # Find all text files (exclude binary, node_modules, .git, venv, __pycache__, .opencode/skills)
  local files
  files=$(find . -type f \
    -not -path './.git/*' \
    -not -path './node_modules/*' \
    -not -path './.opencode/skills/*' \
    -not -path './.opencode/node_modules/*' \
    -not -path './backend/node_modules/*' \
    -not -path './frontend/node_modules/*' \
    -not -path './orchestration/venv/*' \
    -not -path './__pycache__/*' \
    -not -path './orchestration/__pycache__/*' \
    -not -path './orchestration/utils/__pycache__/*' \
    -not -path './orchestration/webhooks/__pycache__/*' \
    -not -path './orchestration/workflows/__pycache__/*' \
    -not -path './coverage/*' \
    -not -path './backend/dev.db' \
    -not -path './backend/test.db' \
    -not -path './backend/uploads/*' \
    -not -name '*.db' \
    -not -name '*.sqlite' \
    -not -name '*.lock' \
    -not -name 'package-lock.json' \
    -not -name '*.sql' \
    -not -name '*.png' -not -name '*.jpg' -not -name '*.ico' \
    -not -name '*.woff' -not -name '*.woff2' -not -name '*.ttf' \
    -not -name '*.eot' \
    -not -name 'setup.sh' \
    2>/dev/null || true)

  # 1. Replace {{PROJECT_NAME}} with actual name
  while IFS= read -r file; do
    replace_in_file "$file" "{{PROJECT_NAME}}" "$PROJECT_NAME"
  done <<< "$files"

  # 2. Replace {{PROJECT_NAME_PASCAL}} with PascalCase
  while IFS= read -r file; do
    replace_in_file "$file" "{{PROJECT_NAME_PASCAL}}" "$PASCAL"
  done <<< "$files"

  # 3. Replace {{PROJECT_NAME_SNAKE}} with snake_case
  while IFS= read -r file; do
    replace_in_file "$file" "{{PROJECT_NAME_SNAKE}}" "$SNAKE"
  done <<< "$files"

  # 4. Replace {{AUTHOR}}
  while IFS= read -r file; do
    replace_in_file "$file" "{{AUTHOR}}" "$AUTHOR"
  done <<< "$files"

  # 5. Replace {{DOMAIN}}
  while IFS= read -r file; do
    replace_in_file "$file" "{{DOMAIN}}" "$DOMAIN"
  done <<< "$files"

  # 6. Replace {{ADMIN_EMAIL}}
  while IFS= read -r file; do
    replace_in_file "$file" "{{ADMIN_EMAIL}}" "$ADMIN_EMAIL"
  done <<< "$files"
}

# ── Update LICENSE author ─────────────────────────────────────────────────────
update_license() {
  if [[ ! -f "LICENSE" ]]; then
    return 0
  fi

  local current_author
  current_author=$(grep -oP 'Copyright \(c\) \d+ \K.+' LICENSE 2>/dev/null || true)

  if [[ "$current_author" != "$AUTHOR" ]]; then
    if $DRY_RUN; then
      echo "  [dry-run] LICENSE: '$current_author' → '$AUTHOR'"
    else
      local year
      year=$(date +%Y)
      sed -i "s|Copyright (c) .*|Copyright (c) $year $AUTHOR|" LICENSE
    fi
    CHANGES=$((CHANGES + 1))
  fi
}

# ── Rename git repo if applicable ─────────────────────────────────────────────
rename_git_remote() {
  if git rev-parse --git-dir >/dev/null 2>&1; then
    if $DRY_RUN; then
      echo "  [dry-run] git remote would be set"
    fi
  fi
}

# ── Summary ────────────────────────────────────────────────────────────────────
print_summary() {
  local PASCAL SNAKE
  PASCAL=$(to_pascal "$PROJECT_NAME")
  SNAKE=$(to_snake "$PROJECT_NAME")

  echo ""
  echo "════════════════════════════════════════════════════════"
  if $DRY_RUN; then
    echo "  DRY RUN SUMMARY"
  else
    echo "  SETUP COMPLETE"
  fi
  echo "════════════════════════════════════════════════════════"
  echo ""
  echo "  Project name:     $PROJECT_NAME"
  echo "  PascalCase:       $PASCAL"
  echo "  snake_case:       $SNAKE"
  echo "  Author:           $AUTHOR"
  echo "  Domain:           $DOMAIN"
  echo "  Admin email:      $ADMIN_EMAIL"
  echo ""
  echo "  Changes applied:  $CHANGES files modified"
  echo ""

  if ! $DRY_RUN; then
    echo "  Next steps:"
    echo "    1. Edit .env files with your real credentials (DATABASE_URL, JWT_SECRET, etc.)"
    echo "    2. npm install && cd backend && npm install && cd ../frontend && npm install"
    echo "    3. npm run db:up && npm run db:migrate && npm run db:seed"
    echo "    4. npm run dev:all"
    echo ""
  fi
  echo "════════════════════════════════════════════════════════"
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"
  prompt_missing
  check_idempotent

  if $DRY_RUN; then
    info "DRY RUN mode — no files will be modified"
    echo ""
  fi

  apply_replacements
  update_license
  rename_git_remote

  # ── Copy .env.example → .env (if missing) ──────────────────────────────────
  if ! $DRY_RUN; then
    echo ""
    echo "→ Copying .env.example to .env (if missing)..."

    # backend
    [ -f backend/.env.example ] && [ ! -f backend/.env ] && cp backend/.env.example backend/.env && echo "  ✓ backend/.env"

    # frontend
    [ -f frontend/.env.example ] && [ ! -f frontend/.env ] && cp frontend/.env.example frontend/.env && echo "  ✓ frontend/.env"

    # orchestration
    [ -f orchestration/.env.example ] && [ ! -f orchestration/.env ] && cp orchestration/.env.example orchestration/.env && echo "  ✓ orchestration/.env"

    # tests/REST Client
    [ -f "tests/REST Client/.env.example" ] && [ ! -f "tests/REST Client/.env" ] && cp "tests/REST Client/.env.example" "tests/REST Client/.env" && echo "  ✓ tests/REST Client/.env"

    echo ""
    echo "⚠ IMPORTANT: Edit the .env files with your real credentials (DATABASE_URL, JWT_SECRET, etc.)"
  fi

  if ! $DRY_RUN; then
    echo "$PROJECT_NAME" > .setup_done
  fi

  print_summary
}

main "$@"
