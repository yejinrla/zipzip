#!/bin/bash
# Installs this project's npm packages and the five Claude skills used here.
# Skill files are fetched from their upstream repositories at session start
# instead of being committed (third-party content stays out of this repo).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# --- Global tools and skills: install only what is missing ---------------
skill_present() { [ -f "$HOME/.claude/skills/$1/SKILL.md" ]; }
add_skills() {
  # $1 = owner/repo, rest = skill names; adds only the missing ones
  local repo=$1; shift
  local missing=()
  for s in "$@"; do skill_present "$s" || missing+=(-s "$s"); done
  if [ ${#missing[@]} -gt 0 ]; then
    npx -y skills add "$repo" "${missing[@]}" -a claude-code -g -y >/dev/null
  fi
}
add_skills vercel-labs/skills find-skills
add_skills mattpocock/skills grill-me tdd
add_skills anthropics/skills frontend-design
add_skills vercel-labs/agent-browser agent-browser

if ! command -v agent-browser >/dev/null; then
  npm install -g agent-browser >/dev/null
fi
# agent-browser needs its own Chrome for Testing download
if ! ls -d "$HOME"/.agent-browser/browsers/chrome-* >/dev/null 2>&1; then
  agent-browser install >/dev/null
fi

# --- Project dependencies: reinstall only when the manifests change ------
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install
  sha256sum .claude/hooks/session-start.sh package.json package-lock.json 2>/dev/null > "$hashes" || rm -f "$hashes"
fi
