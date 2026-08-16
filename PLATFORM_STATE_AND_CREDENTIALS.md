# 🚀 Tvita Agency Platform — State, Credentials & Roadmap

**Date**: August 16, 2026  
**System Status**: Production-Ready Build (Exit Code 0 across 41 Routes)  
**Database**: Supabase PostgreSQL + Prisma ORM  

---

## 🔑 1. User Credentials & Access Directory

> ⚠️ **Universal Default Password for ALL Seeded Accounts**: `Pass1234`

### 👑 Primary Admin Account
| Name | Email | Role | Access Level |
| :--- | :--- | :--- | :--- |
| **Shubham Verma** | `shubhamd@tvita.in` | `ADMIN` | Organization Control Tower / Full Platform Access |

---

### 👥 Agency Staff & Team Accounts (10 Members)

#### 👔 Team Leads (3)
* `lead1@tvita.dev` — **Rahul Sharma** (Senior Team Lead)
* `lead2@tvita.dev` — **Priya Mehta** (Project & Delivery Lead)
* `lead3@tvita.dev` — **Vikram Singh** (Technical Lead)

#### 💻 Software Developers (5)
* `dev1@tvita.dev` — **Amit Patel** (Fullstack Developer)
* `dev2@tvita.dev` — **Sneha Reddy** (Frontend Developer)
* `dev3@tvita.dev` — **Arjun Nair** (Backend Developer)
* `dev4@tvita.dev` — **Pooja Verma** (E-commerce Specialist)
* `dev5@tvita.dev` — **Karan Joshi** (VFX / WebGL Developer)

#### 🧪 QA & Testing Specialists (2)
* `tester1@tvita.dev` — **Neha Gupta** (Senior QA Automation Engineer)
* `tester2@tvita.dev` — **Ravi Kumar** (Manual & UAT Specialist)

---

### 🏢 Client Organizations & Sub-Teams with RBAC (4 Clients, 22 Sub-Teams)

#### 1. TechVision Solutions (`client1@tvita.dev` — Rajesh Kumar)
* Primary Client Portal: `client1@tvita.dev`
* **Sub-Teams**:
  * `tv-product@techvision.in` — Product Strategy *(Access: Projects, Milestones, Tasks)*
  * `tv-qa@techvision.in` — QA & UAT Reviewers *(Access: Approvals & Testing)*
  * `tv-finance@techvision.in` — Finance & Accounts *(Access: Invoices & Subscriptions)*
  * `tv-design@techvision.in` — Design & UI Review *(Access: UI Assets & Approvals)*
  * `tv-exec@techvision.in` — Executive Steering *(Access: Full Executive Dashboard)*
  * `tv-sec@techvision.in` — Infrastructure & Security *(Access: Systems & Architecture)*

#### 2. Greenleaf Organics (`client2@tvita.dev` — Anita Patel)
* Primary Client Portal: `client2@tvita.dev`
* **Sub-Teams**:
  * `gl-ops@greenleaf.co` — E-commerce Operations *(Access: Store Catalog & Fulfillment)*
  * `gl-marketing@greenleaf.co` — Marketing & Brand *(Access: Creatives & Approvals)*
  * `gl-finance@greenleaf.co` — Finance & Audit *(Access: Billing & Invoices)*
  * `gl-qc@greenleaf.co` — Quality Control *(Access: Store Testing & Reviews)*
  * `gl-exec@greenleaf.co` — Executive Board *(Access: Executive Overview)*

#### 3. Aerocraft Studios (`client3@tvita.dev` — Vikram Kapoor)
* Primary Client Portal: `client3@tvita.dev`
* **Sub-Teams**:
  * `ac-vfx@aerocraft.io` — VFX Production *(Access: Rendering Pipelines & Assets)*
  * `ac-creative@aerocraft.io` — Creative Direction *(Access: Storyboards & Approvals)*
  * `ac-finance@aerocraft.io` — Finance & Legal *(Access: Invoices & Contracts)*
  * `ac-staging@aerocraft.io` — Staging Reviewers *(Access: Demo Reel Testing)*
  * `ac-exec@aerocraft.io` — Executive Council *(Access: Full Client Portal)*

#### 4. Zenitech Retail (`client4@tvita.dev` — Deepa Sharma)
* Primary Client Portal: `client4@tvita.dev`
* **Sub-Teams**:
  * `zt-ops@zenitech.in` — Retail Operations *(Access: Inventory Modules)*
  * `zt-pos@zenitech.in` — POS Integration Team *(Access: POS Hardware Tasks)*
  * `zt-finance@zenitech.in` — Finance & Accounts *(Access: Retainers & Tax Invoices)*
  * `zt-qa@zenitech.in` — Quality Assurance *(Access: Regression Testing)*
  * `zt-it@zenitech.in` — IT Leadership *(Access: Architecture & Milestones)*
  * `zt-exec@zenitech.in` — Executive Committee *(Access: Complete Overview)*

---

## ✅ 2. What We Have Accomplished

1. **Project Lead & Team Member Assignment Fixes**:
   * Resolved data sync issues between `Project.leadId` and `ProjectMember` records.
   * Fixed candidate dropdown filtering on `/admin/projects/[id]` to list all active agency staff.
   * Corrected `AdminProjectLeadSelector.tsx` to target `/api/team/projects/[id]/lead`.
   * Replaced rigid `409 Conflict` errors with `prisma.projectMember.upsert` so team roles can be seamlessly updated.

2. **Full-Platform UI/UX Professionalization**:
   * Removed decorative elements, emojis, glassmorphism, floating blobs, and informal copy across Admin, Team Lead, and Client portals.
   * Standardized status badges, table density, and metric cards to match production-grade agency standards.

3. **Prisma Decimal Serialization Resolution**:
   * Fixed Next.js Server-to-Client Component props serialization errors using `JSON.parse(JSON.stringify(data))`.

4. **Complete Agency Seed Engine**:
   * Built `scripts/seed-agency-data.ts` and added `npm run seed:agency` script.
   * Seeded 1 Admin, 10 Team Members, 4 Clients, 22 Sub-Teams with RBAC, 6 Projects, 4 Subscription Retainers, Milestones, Tasks, and GST-compliant Invoices.

5. **Build Stability**:
   * `npm run build` succeeds cleanly with **Exit Code 0** across all 41 application routes.

---

## 🔄 3. What Is Currently In Progress

1. **Sub-Team RBAC Field-Level Filtering**:
   * Verifying that sub-team login accounts correctly inherit non-financial access policies when accessing `/client/dashboard` and `/client/projects`.
2. **Operational Team Task Filtering**:
   * Auditing task filter parameters (Assignee, Status, Priority) on `/team/tasks` for assigned developers and testers.

---

## 🚀 4. What We Can & Will Do Next (Roadmap)

1. **Automated PDF Invoice Email Dispatch**:
   * Connect Gmail API / SMTP integration to send GST-compliant PDF invoice attachments directly to client finance sub-teams (`tv-finance@techvision.in`, etc.) upon issuance.
2. **Stripe Webhook Dynamic Subscription Upgrades**:
   * Automate instant plan upgrades and seat allocation when clients check out via Stripe hosted checkout pages.
3. **Advanced Audit Log Filtering & Export**:
   * Expand `/admin/audit-logs` with date range pickers, actor role filters, and CSV export functionality.
4. **Sub-Team Magic Link Onboarding**:
   * Provide direct one-click invitation links in `/client/teams` for frictionless sub-team member onboarding.
