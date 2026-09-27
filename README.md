# VitaScan AI Frontend v2

Separate pages:
- `/` — Home
- `/biomarker-guide` — Biomarker Guide
- `/privacy` — Privacy Policy
- `/analyze` — Analysis/upload page reserved for API integration

## Run
```bash
npm install
npm run dev
```

## Important for Gemini/API keys
Do not put a real secret API key directly into React source code. A Vite `VITE_*` variable is still exposed to the browser after build. For production, call Gemini through a backend/serverless API and keep the secret there.

The `/analyze` page is intentionally prepared for the API integration you plan to add later.

## JSX popup error
If you see `Expected ")" but found "{"`, make sure popup JSX uses `<InfoPopup ... />` and `</>` with no backslash before `<`.
