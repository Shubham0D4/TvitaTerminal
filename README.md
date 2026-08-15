# Tvita — Modern Agency & Client Operations Platform

**Tvita** is an enterprise-grade agency and project management platform built with Next.js 16 (App Router), Prisma ORM, Supabase Authentication, PostgreSQL, and a tailored Vanilla CSS Design System.

Tvita provides a three-portal architecture designed for seamless agency collaboration:
1. **Admin Portal** (`/admin`) — High-level agency administration, client onboarding, team member provisioning, subscription plan management, billing, and system settings.
2. **Staff & Leads Portal** (`/team`) — Project milestone execution, task assignment & management, workload tracking, deliverable submission, and document management.
3. **Client & Sub-Teams Portal** (`/client`) — Client workspace for project tracking, deliverable approvals, subscriptions, invoices, and granular sub-team access control.

---

## Key Features

### 🏢 Granular Client Sub-Team Access System
Clients can create internal sub-teams (e.g. QA, Marketing, Billing Reviewers) and invite members individually via magic links:
- **Project-Level Access Boundaries**: Restrict specific sub-teams to authorized projects (`allowedProjects`) or grant workspace-wide visibility.
- **Financial Scope Protection**: Toggle financial visibility (Invoices, Subscriptions, Billing) ON or OFF per team.
- **Individual Member Magic Link Invites**: Client team members receive secure magic login links sent directly to their registered email addresses.
- **Component-Level Access Scope**: Customize access permissions per member (Milestones, Approvals, Documents, Updates).
- **Independent Member Revocation**: Clients can revoke or reactivate individual member accounts or delete members safely without affecting the parent team.

### 🛡️ Administrative Control & Revocation
- Admins can provision client accounts, leads, developers, and QA testers.
- Admins possess high-level access revocation capabilities (`revokedByAdmin`) to immediately suspend sub-team access across the platform.

### 📧 Automated Magic Links & Email Integration
- Integrated email dispatch via SMTP / Gmail OAuth2 (`lib/mailer.ts`).
- Admin-configurable SMTP credentials directly in Admin Settings (`/admin/settings`).
- Dynamic base URL resolution using `NEXT_PUBLIC_APP_URL` (`lib/url.ts`).

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (Turbopack, App Router)](https://nextjs.org/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Styling**: Vanilla CSS Design System with CSS Custom Properties, modern typography, glassmorphism, and responsive layouts
- **Email Service**: Nodemailer with SMTP / Gmail integration
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or v20.x
- **npm** or **pnpm**
- **PostgreSQL Database**: A running PostgreSQL instance (or Supabase Postgres connection string)

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/tvita?schema=public"

# Supabase Authentication & Admin
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Application Base URL (Used for Magic Link Invites)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# SMTP / Gmail Configuration (Configurable via Admin Settings UI as well)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Tvita Platform <noreply@tvita.local>"
```

### 3. Database Migration & Prisma Client

```bash
# Generate Prisma Client
npx prisma generate

# Run Database Migrations
npx prisma migrate dev --name init
```

### 4. Running Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the platform.

---

## 📁 Project Structure

```
├── app/
│   ├── (admin)/             # Admin Portal Pages (/admin)
│   ├── (client)/            # Client Portal Pages (/client)
│   │   └── client/teams/    # Sub-Team Management & Detail Routes
│   ├── (team)/              # Staff / Lead Portal Pages (/team)
│   ├── api/                 # RESTful API Endpoints
│   │   ├── admin/           # Administrative API Endpoints
│   │   ├── client/          # Client & Sub-Team API Endpoints
│   │   └── team/            # Staff & Task API Endpoints
│   ├── auth/                # Supabase Auth Callbacks & Magic Link handlers
│   ├── login/               # Portal Login Page
│   └── reset-password/      # Password Reset Handler
├── components/              # Shared Reusable UI Components
│   └── layout/              # Navbars, Sidebars, Footers
├── lib/
│   ├── auth/                # Server & Sub-Team Policy Resolvers
│   ├── mailer.ts            # Dynamic SMTP / Gmail Email Dispatcher
│   ├── prisma.ts            # Prisma Client Singleton
│   ├── supabase/            # Supabase SSR & Admin SDK Clients
│   └── url.ts               # Base URL Resolution Utility
└── prisma/
    └── schema.prisma        # Database Schema & Model Definitions
```

---

## 🧪 Verification & Build

To compile a production build and run TypeScript checks:

```bash
npx next build
```

---

## 📄 License

Copyright © 2026 Tvita. All rights reserved.
