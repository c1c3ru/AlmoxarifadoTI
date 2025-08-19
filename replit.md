# Overview

This project is a warehouse management system for IT equipment (SGAT-TI - Sistema de Gestão de Almoxarifado de T.I.). It's a full-stack web application designed to replace manual inventory control with a centralized, secure, and efficient solution for tracking IT equipment in and out of storage.

The system allows administrators and technicians to manage inventory items, track movements, generate QR codes for equipment, and scan QR codes for quick withdrawals. Key features include automated internal code generation, low stock alerts, comprehensive search functionality, role-based access control, and CSV import/export capabilities for bulk inventory management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and color variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Context-based auth provider with localStorage persistence

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Username/password with bcrypt hashing
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints organized by resource type

## Database Schema
- **Users**: Username-based auth with roles (admin/tech), active status tracking
- **Categories**: Hierarchical organization with icons for visual identification
- **Items**: Complete inventory tracking with internal codes, stock levels, status, and location
- **Movements**: Comprehensive audit trail for all inventory transactions with user attribution

## Key Design Patterns
- **Monorepo Structure**: Shared schema types between client and server
- **Type Safety**: End-to-end TypeScript with Zod validation
- **Component Composition**: Modular UI components with consistent design system
- **Server-Side Validation**: All API endpoints validate input data
- **Optimistic Updates**: Client-side state updates with server reconciliation
- **Error Boundaries**: Comprehensive error handling and user feedback
- **Bulk Operations**: CSV import/export functionality for efficient inventory management

## Authentication & Authorization
- **Two-tier Access Control**: Admin users have full system access, tech users have operational access
- **Role-based Features**: UI components conditionally render based on user permissions
- **Session Persistence**: User state maintained across browser sessions
- **Secure Password Storage**: Bcrypt hashing with salt rounds

# External Dependencies

## Database
- **Supabase PostgreSQL**: Serverless PostgreSQL database hosting
- **Connection**: Environment variable-based connection string (DATABASE_URL)

## UI Components
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Lucide Icons**: Icon library for UI elements
- **FontAwesome**: Icon library for legacy compatibility

## Development Tools
- **Vite**: Development server and build tool with HMR
- **ESBuild**: Production bundling for server code
- **Drizzle Kit**: Database migration and schema management

## Validation & Forms
- **Zod**: Schema validation for both client and server
- **React Hook Form**: Form state management and validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

## Utilities
- **date-fns**: Date manipulation and formatting
- **clsx & tailwind-merge**: Conditional CSS class composition
- **nanoid**: Unique ID generation
- **class-variance-authority**: Component variant management