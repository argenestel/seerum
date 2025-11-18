# Supabase Setup Guide

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (the one with URL: `ublqkfdvmkprgkbgskfc.supabase.co`)
3. Click on **"SQL Editor"** in the left sidebar

## Step 2: Run the Schema SQL

1. Click **"New Query"** button
2. Copy and paste the entire contents of `supabase-schema.sql` file
3. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)

The SQL will create:
- ✅ `trades` table - stores all trades from monitored traders
- ✅ `copy_subscribers` table - stores who is copying which trader
- ✅ `monitored_traders` table - stores which traders are being monitored

## Step 3: Verify Tables Created

1. Go to **"Table Editor"** in the left sidebar
2. You should see all three tables listed:
   - `trades`
   - `copy_subscribers`
   - `monitored_traders`

## Step 4: Restart Your Server

After creating the tables, restart your listener server:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
# or
bun run dev
```

You should now see:
```
✅ Connected to Supabase
   Database: postgres
```

Instead of the warning about missing tables.

## Troubleshooting

If you get permission errors:
- Make sure you're using the **Service Role Key** (not the anon key) in your `.env` file
- The Service Role Key can be found in: Project Settings → API → `service_role` key (keep this secret!)

If tables still don't appear:
- Check the SQL Editor for any error messages
- Make sure you ran the entire SQL file, not just part of it
- Try refreshing the Table Editor page

