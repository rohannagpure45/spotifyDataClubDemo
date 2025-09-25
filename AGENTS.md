# Repository Guidelines

## Project Structure & Module Organization
- Python app (Streamlit): `demo/app.py` with libraries in `src/`:
  - `src/api/` (Google Sheets, Spotify PKCE), `src/processing/`, `src/models/`, `src/utils/`, `src/visualization/`
- Web app (Next.js): `web/` (TypeScript, Prisma, NextAuth)
- Tests: `tests/{unit,integration}/` (Python), `web/tests` (Playwright)
- Assets/data: `data/` (cache, raw, processed), `.streamlit/` (theme, SSL)
- Docs: `README.md`, `TECHNICAL_DOCS.md`, `docs/`

## Build, Test, and Development Commands
- Python (root):
  - `./run.sh` — Create venv, install, run Streamlit at `:8501`
  - `make install | make run | make test | make clean`
  - Docker: `make docker-build && make docker-run`
- Web (Next.js):
  - `cd web && npm install`
  - `npx prisma generate && npx prisma db push` (local SQLite)
  - `npm run dev` (dev), `npm run build && npm start` (prod)
  - Tests: `npm test` (Playwright)

## Coding Style & Naming Conventions
- Python: 4-space indent, type hints where practical, snake_case for files/functions, `CamelCase` for classes. Prefer logging over prints. Format with Black and lint with Pylint.
  - Examples: `src/processing/feature_engineer.py`, `def create_music_dna(...)`.
- TypeScript/Next: 2-space indent, ESLint rules, React components `PascalCase`, utility files `kebab-case`. Keep server code in `web/src/app/api/*` and shared helpers in `web/src/lib/*`.

## Testing Guidelines
- Python: `pytest` discovery in `tests/` using `test_*.py`. Target fast, deterministic tests; mock external APIs (use `MockGoogleSheetsClient`). Run via `make test`.
- Web: Playwright in `web/tests`. Prefer `data-testid` selectors. Seed data via Prisma where needed.
- No hard coverage gate; aim for meaningful assertions around clustering, enrichment, and API error handling.

## Commit & Pull Request Guidelines
- Conventional Commits are used: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:` (scopes optional).
  - Example: `feat(groups): add constrained clustering for balanced sizes`
- PRs must include: clear description, steps to test, linked issues, and screenshots/GIFs for UI changes (Streamlit/Next).
- If touching both apps, note impacts for Python and Web separately.

## Security & Configuration Tips
- Do not commit secrets. Use `.env` (root) and `.env.local` (`web/`); see `.env.example` and README for keys (SPOTIFY_*, GOOGLE_*).
- Demo mode works without credentials; prefer it for local dev. Clear caches with `make clean`.
- Avoid storing PII in committed data; anonymize when sharing samples.

