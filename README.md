# Recipe App

A personal recipe management app built with React + Vite + Tailwind CSS + Supabase.

## Features

- Browse recipes with search, folder, status, category, and dietary filters
- Star ratings (auto-marks as "tried")
- Multi-category tagging
- Hide/unhide recipes (keeps them in the database)
- Recipe images via Supabase Storage
- Freezer inventory tracker
- Bulk import from text
- PIN-protected access

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/planginc/recipe-app.git
cd recipe-app
npm install
```

### 2. Set up Supabase (free tier)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In your Supabase dashboard, go to **SQL Editor** and run the schema below
3. Go to **Settings > API** and copy your Project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase URL and anon key.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:5173

### 5. Deploy to Netlify (free)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

Or connect your GitHub repo to Netlify for auto-deploys.

## Supabase Schema

Run this in your Supabase SQL Editor to create the required table:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  note_type TEXT DEFAULT 'recipe',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  user_telegram_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write (for personal use)
CREATE POLICY "Allow all access" ON notes FOR ALL USING (true) WITH CHECK (true);
```

## Customization

- **PIN**: Change the PIN in `src/components/PinGate.jsx`
- **Categories**: Edit the list in `src/lib/constants.js`
- **Styling**: Tailwind CSS classes throughout the components

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS
- Supabase (database + storage)
- Deployed on Netlify
