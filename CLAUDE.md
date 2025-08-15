# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (Vite dev server)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Architecture Overview

This is a React-based household ledger application that tracks income and expenses with the following key architecture:

### Data Layer
- **IndexedDB with Dexie**: Uses Dexie library to manage local browser storage
- **Database Schema**: Single `transactions` table with fields: id, date, description, amount, type (income/expense), category
- **Database file**: `src/utils/db.js` - defines the Dexie database connection and schema

### State Management
- **Local State**: Uses React hooks (useState, useEffect) for component state
- **No external state library**: All state is managed locally within components
- **Context stub**: `src/context/TransactionContext.jsx` exists but is currently empty

### Component Structure
- **Single Page Application**: No routing - everything renders through `Home` component
- **Main Components**:
  - `Home.jsx` - Main container with all business logic, backup/restore functionality
  - `CalendarBox.jsx` - React Calendar integration with transaction display
  - `TransactionForm.jsx` - Modal form for adding/editing transactions with category selection
  - `TransactionList.jsx`, `TransactionItem.jsx` - List components for displaying transactions

### Key Features
- **Categories**: Predefined list with emojis (식비, 간식류, 카페, 농구 패배, etc.) defined in both CalendarBox and TransactionForm
- **Backup/Restore**: JSON file export/import with automatic 30-day backup reminders
- **Assets Toggle**: Shows/hides total assets calculation across all transactions
- **Modal Management**: ESC key handling for closing modals (forms, sidebar, alerts)

### Korean Language Support
- All UI text and comments are in Korean
- Categories and transaction descriptions use Korean terms
- File naming includes Korean characters (가계부_백업_*.json)

## Important Implementation Notes

- Transaction editing is handled through the `editTarget` state in Home component
- Calendar integration uses `react-calendar` library for date selection
- Backup files are saved with Korean filename format including date
- Directory-based restore allows selecting entire backup folders to find latest file
- Number formatting includes Korean comma separators for currency display