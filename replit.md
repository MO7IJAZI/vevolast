# Vevoline - Marketing Agency Dashboard

## Overview
Vevoline is a bilingual marketing agency dashboard designed to manage various aspects of agency operations including goals, clients, packages, invoices, finance, employees, calendar, and permissions. It supports RTL/LTR layouts, multi-currency transactions (TRY, USD, EUR, SAR), and offers light/dark theme modes. The project aims to provide a comprehensive and intuitive platform for marketing agencies to streamline their operations and enhance efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, Vite for bundling.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state, React Context for UI state.
- **UI Components**: shadcn/ui built on Radix UI.
- **Styling**: Tailwind CSS with custom purple color scheme, CSS variables for theming.
- **Internationalization**: Custom context-based system supporting Arabic (RTL, default) and English (LTR).

### Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript.
- **API Design**: RESTful JSON API endpoints (`/api/`).
- **Storage Layer**: Abstracted via `IStorage` interface, with PostgreSQL schema readiness.

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema**: `shared/schema.ts` for shared definitions.
- **Validation**: Zod schemas generated from Drizzle schemas.
- **Migrations**: Drizzle Kit.

### Key Design Patterns
- **Shared Types**: Common schema definitions in `shared/` for client/server.
- **Path Aliases**: `@/` for client, `@shared/` for shared code.
- **Form Handling**: React Hook Form with Zod resolver.
- **API Requests**: Centralized fetch wrapper in `queryClient.ts`.

### Build System
- **Development**: Vite for frontend HMR, tsx for Express server.
- **Production**: Vite builds static frontend, esbuild bundles server.

### UI/UX Decisions
- **Dashboard**: Behance-style with KPI cards, Recharts for income/expenses, donut charts for revenue.
- **Layout**: Collapsible sidebar, enhanced header with search, notifications, currency/language/theme toggles.
- **Settings Page**: Comprehensive with 9 collapsible sections (General, Financial, Goals, Clients, Invoices, Team, Notifications, Appearance, Data).
- **Client Management**: 3-tab structure (Confirmed, Leads, Completed), multi-employee assignments, `EmployeeChip` and `EmployeeMultiSelect` components.
- **Packages Module**: Hierarchical two-level structure (MainPackage categories, SubPackage plans), deliverables system with icons, multi-currency, billing types, quick templates for package creation.
- **Employee Management**: Two-tier salary system (monthly/per-project), avatar system with profile picture upload and fallback initials, job title/specialization system with department-based selection.
- **Global Features**: Global currency switcher with locale-aware formatting, persistent currency selection.

### Technical Implementations
- **Authentication**: Session-based with Express-session and `connect-pg-simple`, bcrypt hashing, role-based access (admin, sales, execution, finance, viewer), invitation flow for new employees.
- **Permissions System**: Granular permission control with 18 permissions (view_clients, edit_clients, view_leads, etc.) stored per user. Roles have default permission sets but can be customized per user.
- **Client Portal**: Separate authentication system for clients to view their services and invoices. Uses `clientUsers` table with separate login flow at `/client/login` and dashboard at `/client`.
- **Route Protection**: Frontend uses `PermissionGuard` component for route-level access control. Sidebar menu items filtered based on user permissions. Backend uses `requirePermission` middleware.
- **Employee Details**: Enhanced profile drawer with monthly filters and department-specific KPIs.
- **Avatar System**: `EmployeeAvatar` component with size variants, hash-based fallback colors, and `AvatarUpload` component using Replit Object Storage.
- **Job Title System**: Typed job titles (`SalesJobTitle`, `DeliveryJobTitle`, etc.) with bilingual labels and department-based filtering in forms.
- **Work Tracking**: Client-centric tracking page that groups services by client using collapsible accordion cards. Services sourced from clients in DataContext, created/edited in Clients page. Features:
  - **Client Grouping**: Each client shows as expandable card with summary stats (active packages, overdue count, next deadline)
  - **Deliverables Templates**: Package-specific templates auto-generate when service has no deliverables:
    - Social Media: posts, reels, stories, monthly report
    - Websites: requirements, design, development, content, testing, launch
    - Branding/Logo: concepts, revisions, final files
    - AI Services: discovery, data, model, integration, testing, deployment
    - Apps: requirements, UI/UX, backend, frontend, testing, store submission, launch
  - **Deliverable Types**: Boolean (checkboxes for milestones) and numeric (counters with done/total)
  - **Bilingual Labels**: Derived at render time from templates for language switching support
  - **Active/Completed Tabs**: Filter clients by whether they have active or completed services
  - **Completion Sync**: Marking all services complete auto-updates client status
  - **Search Filter**: Bilingual search across client name, company, service names
- **Finance Module**: Complete financial management with 6 internal tabs:
  - **Overview**: KPI cards (Total Revenue, Total Expenses, Net Income) with real-time currency conversion
  - **Revenues**: Income transactions table with add income modal (amount, currency, client, date, description)
  - **Expenses**: Expense transactions table with add expense modal (amount, currency, category, date, description)
  - **Payroll**: Employee salary tracking with Pay Now functionality and payment history
  - **Client Finance**: Payment tracking per client with outstanding balance calculations
  - **Transactions Ledger**: Unified view of all financial transactions
  - **Currency Conversion**: Real-time rates from exchangerate.host (fallback: frankfurter.app), 6-hour caching strategy
  - **Display Currency**: Global selector supporting 6 currencies (USD, TRY, SAR, EGP, EUR, AED)
  - **Key Files**: `client/src/pages/finance.tsx`, `server/exchangeRates.ts`, `shared/schema.ts` (transactions, exchange_rates, etc.)
- **Time Tracking**: Workday time tracker for employee attendance management:
  - **Employee Widget**: Dashboard widget showing real-time work timer with Start/Break/Resume/End controls
  - **Session States**: not_started → working ↔ on_break → ended (with admin reopen capability)
  - **Break Types**: lunch, short, meeting, other (with optional notes)
  - **Segments Tracking**: Each work/break period stored with timestamps for detailed analysis
  - **Totals Calculation**: Automatic calculation of workSeconds and breakSeconds
  - **Admin Panel**: Settings page section showing all employee sessions for the day with reopen functionality
  - **Database Schema**: `work_sessions` table with id, employeeId, date, status, startAt, endAt, segments (JSON), totals (JSON)
  - **Key Files**: `shared/schema.ts` (work_sessions), `server/routes.ts` (work session endpoints), `client/src/components/dashboard/time-tracker-widget.tsx`, `client/src/pages/settings.tsx` (time tracking section)
  - **API Endpoints**: GET /api/work-sessions, GET /api/work-sessions/today/:employeeId, POST /api/work-sessions/:id/start, POST /api/work-sessions/:id/break, POST /api/work-sessions/:id/resume, POST /api/work-sessions/:id/end, POST /api/work-sessions/:id/reopen

### Permissions Reference
- **Available Roles**: admin, sales, execution, finance, viewer
- **Permission Categories**: clients, leads, packages, invoices, goals, finance, employees, work tracking
- **Key Files**: `shared/schema.ts` (PermissionEnum), `server/auth.ts` (roleDefaultPermissions), `client/src/contexts/AuthContext.tsx` (permission hooks)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **connect-pg-simple**: PostgreSQL session store.

### UI Framework
- **Radix UI**: Accessible UI primitives.
- **shadcn/ui**: Pre-styled component library.
- **Lucide React**: Icon library.

### Development Tools
- **Replit Plugins**: Runtime error overlay, Cartographer, Dev Banner.
- **Drizzle Kit**: Database schema toolkit.

### Fonts
- **IBM Plex Sans Arabic**: Arabic typeface.
- **Inter**: English/Latin typeface.

## Routing Notes

### Client Portal vs Clients Management Route
- **Client Portal**: Routes starting with `/client/` or exactly `/client` (e.g., `/client/login`, `/client`)
- **Clients Management**: Route `/clients` (the internal CRM page for managing clients)
- **Important**: The route check in `AppRouter` must use `location.startsWith("/client/") || location === "/client"` to prevent `/clients` from being incorrectly matched as a client portal route.