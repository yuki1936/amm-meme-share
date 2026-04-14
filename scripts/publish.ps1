Param(
  [string]$RepoName = 'ammmemeshare'
)

Write-Host "Initializing local git repo (if not already)..."
if (-not (git rev-parse --is-inside-work-tree 2>$null)) {
  git init
}

git add .
try { git commit -m 'Initial commit' } catch { Write-Host 'No changes to commit' }

if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) { Write-Host 'Please run: gh auth login'; exit 1 }
  gh repo create $RepoName --public --source=. --remote=origin --push
} else {
  Write-Host "GitHub CLI (gh) not found. Create repo on GitHub and run:`n  git remote add origin git@github.com:YOUR_USERNAME/$RepoName.git`n  git branch -M main`n  git push -u origin main"
}
