#!/bin/bash
# Script to set up Supabase tables using Supabase CLI
# 
# Prerequisites:
#   1. Install Supabase CLI: npm install -g supabase
#   2. Login: supabase login
#   3. Link your project: supabase link --project-ref your-project-ref
#
# Usage:
#   chmod +x scripts/setup-supabase-cli.sh
#   ./scripts/setup-supabase-cli.sh

set -e

echo "🚀 Setting up Supabase tables using Supabase CLI..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Make sure SUPABASE_URL and SUPABASE_KEY are set"
fi

# Source environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_KEY must be set"
    echo "   Set them in .env.local or export them:"
    echo "   export SUPABASE_URL=https://your-project.supabase.co"
    echo "   export SUPABASE_KEY=your-service-role-key"
    exit 1
fi

echo "📝 Reading SQL schema..."
SCHEMA_FILE="supabase-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: $SCHEMA_FILE not found"
    exit 1
fi

echo "✅ Found $SCHEMA_FILE"
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co||')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Error: Could not extract project ref from SUPABASE_URL"
    exit 1
fi

echo "🔗 Project: $PROJECT_REF"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked. Attempting to link..."
    echo "   Run: supabase link --project-ref $PROJECT_REF"
    echo ""
    echo "   Or run SQL manually:"
    echo "   1. Go to Supabase Dashboard → SQL Editor"
    echo "   2. Copy contents of $SCHEMA_FILE"
    echo "   3. Paste and run"
    exit 1
fi

echo "📤 Executing SQL schema..."
echo ""

# Use Supabase CLI to execute SQL
# Note: This requires the project to be linked
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres" < "$SCHEMA_FILE" || {
    echo ""
    echo "⚠️  Direct execution failed. Please run SQL manually:"
    echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql"
    echo "   2. Copy contents of $SCHEMA_FILE"
    echo "   3. Paste and run"
    exit 1
}

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔍 Verifying tables..."

# Verify tables exist (requires Supabase JS client)
echo "   Run: npm run verify-supabase"
echo "   Or check manually in Supabase Dashboard → Table Editor"

