#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="ammmemeshare"

echo "Initializing local git repo (if not already initialized)..."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init

git add .
git commit -m "Initial commit" || echo "No changes to commit"

if command -v gh >/dev/null 2>&1; then
  echo "Creating GitHub repo via gh..."
  gh auth status >/dev/null 2>&1 || { echo "Please run: gh auth login"; exit 1; }
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push || {
    echo "gh create failed — ensure repo name is available or use manual push.";
  }
else
  echo "GitHub CLI (gh) not found. Please create a repo on GitHub and run these commands:";
  echo "  git remote add origin git@github.com:YOUR_USERNAME/$REPO_NAME.git";
  echo "  git branch -M main";
  echo "  git push -u origin main";
fi
