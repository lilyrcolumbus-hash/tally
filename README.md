# Tally.ly — Inventory & Money, tallied

Tell it by **voice**, snap a **receipt photo**, or **type** it — Tally.ly extracts the item,
quantity and cost, calculates totals, and saves it. Track your inventory and your spending
in one place, and mirror everything to a Google Sheet.

Built with React 19 + Vite + TypeScript + Tailwind v4 (installable PWA), Supabase (database),
Gemini (AI extraction), and a Google Apps Script (Sheets mirror).

## Runs out of the box

With **no setup**, the app works in **local + demo mode**: data is saved on your device and a
simple parser pulls numbers out of typed text. Add the env vars below to unlock the real thing.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## Unlock the full app (3 one-time steps)

Copy `.env.example` to `.env.local` and fill in:

### 1. AI — voice & photo (Gemini)
- Get a free key: https://aistudio.google.com/apikey
- Set `VITE_GEMINI_API_KEY`.
- Without it, voice/photo are disabled and typed text uses the offline parser.

### 2. Cloud database (Supabase)
- Create a project at https://supabase.com.
- SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql).
- Settings → API → copy the URL + anon key into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- In the app → Settings → Cloud sync → create an account / sign in. Now data syncs and is backed up.

### 3. Google Sheets mirror
- Create a blank Google Sheet → Extensions → Apps Script.
- Paste [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
- Deploy → New deployment → **Web app**, execute as **Me**, access **Anyone**.
- Copy the Web app URL into `VITE_SHEETS_WEBHOOK_URL`.
- Every add/edit/delete now mirrors into the sheet, keyed by id.

## How it works

- **Capture** (`src/components/capture`) → sends text/audio/image to `extractEntries` (`src/lib/gemini.ts`).
- The AI returns one or more **drafts** → you confirm/fix them in a sheet → saved as **entries**.
- **Storage** (`src/lib/store.ts`) uses Supabase when signed in, else `localStorage`; every write
  also fires a mirror to the Sheet (`src/lib/sheets.ts`).
- Two record types: **inventory** (things you have, with quantity + low-stock alerts) and
  **expense** (money out). The **Stats** page totals spending by month and category.

## Notes
- Voice uses `MediaRecorder` + Gemini (not the Web Speech API, which iOS Safari PWAs don't support).
- The confirmation screen exists so the AI never writes unverified data — you always approve first.
