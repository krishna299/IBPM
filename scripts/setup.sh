#!/bin/bash
# ──────────────────────────────────────────────
# IBPM Setup Script
# Run this from AWS CloudShell or any terminal with Node.js 18+
# ──────────────────────────────────────────────

set -e

echo "=============================="
echo "  IBPM Setup"
echo "=============================="

# 1. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# 2. Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# 3. Create .env from example if not exists
if [ ! -f .env ]; then
  echo ""
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  IMPORTANT: Edit .env with your actual credentials before proceeding!"
  echo "   Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL"
  echo ""
  read -p "Press Enter after updating .env..."
fi

# 4. Push schema to database
echo ""
echo "🗄️  Pushing schema to database..."
npx prisma db push

# 5. Run seed
echo ""
echo "🌱 Seeding database..."
npm run db:seed

# 6. Build
echo ""
echo "🏗️  Building application..."
npm run build

echo ""
echo "=============================="
echo "✅ Setup complete!"
echo ""
echo "To start the dev server:"
echo "  npm run dev"
echo ""
echo "To start production:"
echo "  npm start"
echo ""
echo "Login credentials:"
echo "  Email: admin@estheticinsights.com"
echo "  Password: Admin@123"
echo "=============================="
