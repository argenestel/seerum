# Supabase Setup Scripts

Scripts to automate Supabase database setup for Seerum App.

## Quick Start

### Option 1: Manual Setup (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor**

2. **Run SQL Schema:**
   - Click **"New Query"**
   - Copy contents of `supabase-schema.sql`
   - Paste and click **"Run"**

3. **Verify:**
   ```bash
   npm run verify-supabase
   ```

### Option 2: Using Scripts

#### Setup Tables
```bash
# Using tsx
npm run setup-supabase

# Or using bun
bun run scripts/setup-supabase.ts
```

#### Verify Tables
```bash
npm run verify-supabase
```

## Prerequisites

1. **Environment Variables:**
   Create `.env.local` with:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   ```

2. **Dependencies:**
   ```bash
   npm install -D tsx
   # or
   bun install
   ```

## Scripts

### `setup-supabase.ts`
- Reads `supabase-schema.sql`
- Provides instructions for manual setup
- Verifies tables after setup

### `verify-supabase.ts`
- Checks if tables exist
- Verifies table structure
- Shows row counts

### `setup-supabase-cli.sh`
- Uses Supabase CLI (requires linking project)
- Alternative method for automation

## Troubleshooting

### "SUPABASE_URL and SUPABASE_KEY not set"
- Make sure `.env.local` exists in project root
- Verify variable names are correct
- Restart terminal/IDE after adding variables

### "Table does not exist"
- Run the SQL schema manually in Supabase SQL Editor
- Or use: `npm run setup-supabase` for instructions

### "Cannot find module 'tsx'"
- Install: `npm install -D tsx`
- Or use: `bun run scripts/setup-supabase.ts`

## Manual SQL Execution

If scripts don't work, always fall back to manual execution:

1. Copy SQL from `supabase-schema.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run

This is the most reliable method and works 100% of the time.

