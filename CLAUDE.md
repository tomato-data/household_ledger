# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based household ledger application that tracks income and expenses. The project is currently undergoing migration from a local-only IndexedDB solution to a full-stack application with FastAPI backend, PostgreSQL database, and Clerk authentication.

## Development Commands

### Frontend (current)
- **Start development server**: `cd frontend && npm run dev` (Vite dev server)
- **Build for production**: `cd frontend && npm run build`
- **Preview production build**: `cd frontend && npm run preview`

### Infrastructure
- **Deploy infrastructure**: `cd infrastructure/terraform && terraform apply`
- **Plan infrastructure**: `cd infrastructure/terraform && terraform plan`

## Current Architecture (Frontend-Only)

### Data Layer
- **IndexedDB with Dexie**: Uses Dexie library to manage local browser storage
- **Database Schema**: 
  - `transactions` table: id, date, description, amount, type, category, status, recurring_id
  - `recurring_transactions` table: id, template_name, description, amount, type, frequency, start_date, end_date, day_of_month, is_active, is_variable_amount
  - `categories` table: id, name, emoji
- **Database file**: `frontend/src/utils/db.js` - defines the Dexie database connection and schema

### State Management
- **Local State**: Uses React hooks (useState, useEffect) for component state
- **No external state library**: All state is managed locally within components
- **Context stub**: `frontend/src/context/TransactionContext.jsx` exists but is currently empty

### Component Structure
- **Single Page Application**: No routing - everything renders through `Home` component
- **Main Components**:
  - `Home.jsx` - Main container with all business logic, backup/restore functionality
  - `CalendarBox.jsx` - React Calendar integration with transaction display
  - `TransactionForm.jsx` - Modal form for adding/editing transactions with category selection
  - `RecurringTransactionForm.jsx` - Modal form for managing recurring transactions
  - `TransactionList.jsx`, `TransactionItem.jsx` - List components for displaying transactions

### Key Features
- **Categories**: Predefined list with emojis (식비, 간식류, 카페, 농구 패배, etc.) defined in both CalendarBox and TransactionForm
- **Recurring Transactions**: Monthly recurring income/expense with variable amount support
- **Backup/Restore**: JSON file export/import with automatic 30-day backup reminders
- **Assets Toggle**: Shows/hides total assets calculation across all transactions
- **Modal Management**: ESC key handling for closing modals (forms, sidebar, alerts)

### Korean Language Support
- All UI text and comments are in Korean
- Categories and transaction descriptions use Korean terms
- File naming includes Korean characters (가계부_백업_*.json)

## Migration Plan to Full-Stack

### Target Architecture
- **Frontend**: React (Vite) with Clerk authentication
- **Backend**: FastAPI with PostgreSQL
- **Infrastructure**: Kubernetes cluster on Proxmox (managed by Terraform)
- **Authentication**: Clerk for user management and JWT tokens

### Migration Guide
See `BACKEND_MIGRATION_GUIDE.md` for detailed migration instructions including:
- Database schema design
- API endpoint specifications
- Clerk integration steps
- Deployment configurations
- Step-by-step migration plan

## Infrastructure

### Proxmox Setup
- **API URL**: https://192.168.100.2:8006/api2/json
- **Node**: calcifer
- **Template**: ubuntu-22.04-template
- **Planned VMs**: 
  - k8s-master (2 cores, 2GB RAM, 80GB disk)
  - k8s-worker1-3 (2 cores, 4GB RAM, 130-150GB disk each)

### Terraform Configuration
- **Provider**: telmate/proxmox v2.9.10 (downgraded due to permission issues in v2.9.14)
- **Authentication**: API token (root@pam!terraform)
- **Location**: `infrastructure/terraform/`

## Important Implementation Notes

### Current Implementation
- Transaction editing is handled through the `editTarget` state in Home component
- Calendar integration uses `react-calendar` library for date selection
- Backup files are saved with Korean filename format including date
- Directory-based restore allows selecting entire backup folders to find latest file
- Number formatting includes Korean comma separators for currency display
- Recurring transactions are processed by `recurringScheduler.js` utility

### Migration Considerations
- User data isolation required for multi-tenant architecture
- Existing IndexedDB data needs migration path to PostgreSQL
- Backup/restore functionality should be maintained through API
- Korean language support must be preserved
- Performance optimization needed for larger datasets in PostgreSQL