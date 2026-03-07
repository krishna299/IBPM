# IBPM Deployment Guide

## Quick Start (5 minutes)

### 1. Clone and Extract
```bash
git clone https://github.com/krishna299/IBPM.git
cd IBPM
# Extract source (if using tarball)
tar -xzf ibpm-source.tar.gz --strip-components=1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# REQUIRED
DATABASE_URL="postgresql://user:password@host:5432/ibpm?schema=public"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# ZOHO (required for accounting sync)
ZOHO_CLIENT_ID="client id enter here.................."
ZOHO_REFRESH_TOKEN="----------------------------------"
ZOHO_ORGANIZATION_ID="your-org-id"

# NOTIFICATIONS (optional, configure as needed)
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@estheticinsights.com"
SMSSTRIKER_API_KEY="your-key"
WATI_API_TOKEN="your-token"
```

### 4. Setup Database
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Run
```bash
npm run dev    # Development (localhost:3000)
npm run build  # Production build
npm start      # Production server
```

### 6. Login
- Email: `admin@estheticinsights.com`
- Password: `Admin@123`

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Connect to GitHub for auto-deploy
```

## Database Setup (AWS RDS)

If using AWS RDS PostgreSQL:
```
DATABASE_URL="postgresql://ibpm_admin:YourPassword@your-rds-endpoint.rds.amazonaws.com:5432/ibpm?schema=public"
```

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (JWT sessions)
- **Styling**: Tailwind CSS
- **Integrations**: Zoho Books (one-way push), SendGrid, SMSStriker, WATI
