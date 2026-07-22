# Contributing to J.A.R.V.I.S.

## Development flow

- Keep `main` stable and runnable.
- Create a branch for each change: `feature/...`, `fix/...`, or `docs/...`.
- Keep commits focused and use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, and `chore:`.
- Test the interface in a browser before opening a pull request.
- Never commit `.env` files, API keys, or generated output.

## Updating the project

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/your-change
```

After the change:

```powershell
git status
git diff
git add .
git commit -m "feat: describe the change"
git push -u origin feature/your-change
```

Merge through a pull request after review. Create a version tag only on stable commits, for example `v0.1.0`.
