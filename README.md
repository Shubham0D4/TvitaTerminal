# ⚡ Tvita — Enterprise Agency & Client Operations Platform

**Tvita** is a serious, production-grade agency management platform built with Next.js 16 (App Router with Turbopack), Prisma ORM (v7.9), Supabase Authentication, PostgreSQL, Stripe, and a professional Vanilla CSS design system.

---

## 🏛️ Architecture Overview

Tvita is engineered around a three-tier portal architecture with strict Role-Based Access Control (RBAC):

```text
                               ┌──────────────────────────┐
                               │     ADMIN PORTAL         │
                               │  /admin (Control Tower)  │
                               └────────────┬─────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
     ┌────────────────────────────┐                  ┌────────────────────────────┐
     │     STAFF & LEADS PORTAL   │                  │   CLIENT & SUB-TEAMS PORTAL│
     │      /team (Operational)   │                  │  /client (Action-Oriented) │
     └────────────────────────────┘                  └────────────────────────────┘
```

1. **Admin Portal (`/admin`)**: Organization control tower for overall platform health, client onboarding, staff provisioning, project assignment, retainer/subscription management, billing, and system audit logs.
2. **Staff & Leads Portal (`/team`)**: Operational dashboard for project leads, software developers, and QA testers. Features milestone tracking, task auto-assignment, issue tracking, and deliverable management.
3. **Client & Sub-Teams Portal (`/client`)**: Action-oriented portal for client organizations and internal sub-teams (e.g. Finance, Product, QA, Marketing) with granular component-level RBAC and project isolation.

---

## 🔑 Demo Credentials & Quick Start Seeding

> ⚠️ **Default Password for ALL Seeded Accounts**: `Pass1234`

### 📜 Seed the Database
To populate the database with 1 Admin, 10 Agency Staff Members, 4 Clients, 22 Sub-Teams with RBAC, 6 Projects, 4 Subscription Retainers, Milestones, Tasks, and GST Invoices:

```bash
npm run seed:agency
# Or directly:
npx tsx --env-file=.env scripts/seed-agency-data.ts
```

---

## ✨ Key Features & Technical Capabilities

### 🗂️ Project & Team Assignment Engine
* **Synchronized Roster & Lead Management**: Automatically pairs `Project.leadId` with `ProjectMember` records (`role: 'TEAM_LEAD'`).
* **Role Upsert**: Seamlessly modify project roles (`DEVELOPER`, `TESTER`, `TEAM_LEAD`) without database conflicts.
* **Agency-Wide Staff Selector**: Allows Admins to select any active team member or lead for project allocation.

### 🔐 Granular Client Sub-Team Access & RBAC
* **Project Isolation**: Restrict specific sub-teams to authorized project IDs or grant workspace-wide access.
* **Field-Level Scope Protection**: Independently grant or restrict financial data (Invoices, Retainers, Subscriptions) per sub-team.
* **Independent Invites & Revocation**: Magic-link invitations for sub-team members with single-click admin revocation (`revokedByAdmin`).

### 📦 Subscription & Retainer Billing Engine
* **Tiered & Custom Plans**: Support for Starter, Growth, Agency Enterprise, and Custom Retainers.
* **GST-Compliant Invoices**: Invoice generation with tax calculations (`18% GST`), line itemization, and status tracking (`PAID`, `PENDING`).
* **Prisma Decimal Handling**: Safe JSON serialization boundary for Next.js Server Components to Client Components.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Database & ORM**: PostgreSQL with [Prisma v7.9.1](https://www.prisma.io/) (`@prisma/adapter-pg`)
* **Authentication**: [Supabase Auth](https://supabase.com/) & Local Password Hashing (Bcrypt)
* **Payments & Billing**: [Stripe](https://stripe.com/) Node SDK
* **Styling**: Vanilla CSS Design System with CSS Custom Properties & Responsive Grid
* **Icons**: [Lucide React](https://lucide.dev/)
* **Email Service**: Nodemailer & Gmail API / SMTP integration

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: v18.x or v20.x
* **npm**
* **PostgreSQL Database**: PostgreSQL connection string (Supabase or direct instance)

### 2. Environment Configuration
Copy `.env.example` or update `.env` in the root directory:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tvita?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@localhost:5432/tvita"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database Setup & Migration
```bash
# Generate Prisma Client
npx prisma generate

# Seed Database with Demo Accounts & Projects
npm run seed:agency
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to log in.

---

## 📁 Repository Structure

```text
Tvita/
├── app/
│   ├── (admin)/             # Admin Control Tower (/admin)
│   ├── (client)/            # Client & Sub-Team Portal (/client)
│   ├── (team)/              # Staff & Project Lead Portal (/team)
│   ├── api/                 # REST API Routes (/api/admin, /api/team, /api/client)
│   └── auth/                # Authentication Callbacks & Magic Links
├── components/              # Shared UI Components & Layouts
├── lib/
│   ├── auth/                # Auth & RBAC Policy Resolvers
│   ├── repositories/        # Data Access Layer & Repositories
│   └── prisma.ts            # Prisma Client Initialization
├── prisma/
│   └── schema.prisma        # Database Schema Definitions
├── scripts/
│   └── seed-agency-data.ts  # Complete Data Seeding Script
└── PLATFORM_STATE_AND_CREDENTIALS.md # Full Account & Password Directory
```

---

## 🧪 Build & Verification

To verify TypeScript types and build production bundles:
```bash
npm run build
```

---

## 📄 License
Copyright © 2026 Tvita Agency Platform. All rights reserved.
