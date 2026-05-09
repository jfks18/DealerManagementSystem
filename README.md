# Branch Management System

A Laravel 11 API-only backend with React 19 frontend for managing branch operations, daily sales tracking, and quota management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Accessing the System](#accessing-the-system)
- [User Roles & Workflows](#user-roles--workflows)
- [Default Test Credentials](#default-test-credentials)
- [Features](#features)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **PHP 8.1 or higher** - [Download](https://www.php.net/downloads)
- **Composer** - [Download](https://getcomposer.org/)
- **Node.js 18+** and **npm 9+** - [Download](https://nodejs.org/)
- **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download](https://git-scm.com/)

Verify installations:
```bash
php --version
composer --version
node --version
npm --version
mysql --version
```

---

## Installation

### 1. Clone the Repository

```bash
cd c:\Users\jfk\Desktop\laravel-Project
git clone <repository-url> branchmanagement
cd branchmanagement
```

### 2. Copy Environment File

```bash
cp .env.example .env
```

Or manually copy:
- Duplicate `.env.example` to `.env`

### 3. Configure the Database in `.env`

Edit `.env` and set:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=branchmanagement
DB_USERNAME=root
DB_PASSWORD=
```

**Note:** The default MySQL root user has no password on Windows. If you set a password, update it in `.env`.

### 4. Install PHP Dependencies

```bash
composer install
```

### 5. Generate Application Key

```bash
php artisan key:generate
```

### 6. Create Database & Run Migrations

```bash
# Create the database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS branchmanagement;"

# Run migrations and seed data
php artisan migrate --seed
```

**Note:** The database will be created with:
- **Area Manager** account: `admin@example.com` / `password`
- **Branch Manager** account: `branch@example.com` / `password`
- Sample branches and quotas

### 7. Install Frontend Dependencies

```bash
npm install
```

---

## Running the Application

### Terminal 1: Start Laravel Backend Server

```bash
php artisan serve
```

The backend will run on **http://localhost:8000**

### Terminal 2: Start Vite Development Server (Optional)

For development with hot reload:

```bash
npm run dev
```

Or for production build:

```bash
npm run build
```

**After running `npm run build`, the app will be accessible at `http://localhost:8000` without needing the Vite dev server.**

---

## Accessing the System

### Login Page

1. Open your browser and go to: **http://localhost:8000/login**
2. Enter your credentials (see [Default Test Credentials](#default-test-credentials))
3. Click **Login**

### First-Time Access

If you're seeing a login page but the frontend doesn't load:
1. Run `npm run build` to compile the React frontend
2. Restart the Laravel server: `php artisan serve`
3. Refresh the page

---

## User Roles & Workflows

### **Area Manager** 🏢

**Login with:** `admin@example.com` / `password`

**Available Actions:**
- **Dashboard** - View branch submission status and daily summaries
- **Branches** - Create new branches and manage branch manager accounts
- **Quotas** - Set monthly sales quotas for each branch
- **Reports** - View monthly sales reports by branch vs. quota
- **History** - Track branch performance over past months

**Workflow:**
1. Create branches with manager emails
2. Set monthly quotas per branch
3. Monitor daily submissions and reports
4. Track branch performance over time

---

### **Branch Manager** 📱

**Login with:** `branch@example.com` / `password`

**Available Actions:**
- **Dashboard** - View current branch info and today's submission status
- **Daily Entry** - Record daily sales with interactive calendar
- **My Reports** - View monthly reports and export to Excel

**Workflow:**
1. View your assigned branch and monthly quota
2. Use the interactive calendar to enter daily sales
3. Edit previous entries if sales come in late
4. Export monthly reports to Excel for record-keeping

**Important Notes:**
- You **cannot enter data on Sundays** (system enforces this)
- You can **edit previous days' entries** to add late sales
- Your **monthly quota is set by the Area Manager**

---

## Default Test Credentials

Use these accounts to test the system:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Area Manager | `admin@example.com` | `password` | Manage branches, quotas, reports |
| Branch Manager | `branch@example.com` | `password` | Daily entry, view reports, export |

**⚠️ Security Note:** Change these credentials before deploying to production.

---

## Features

### Authentication & Security
- ✅ Token-based authentication (Laravel Sanctum)
- ✅ Role-based access control (Area Manager / Branch Manager)
- ✅ Automatic logout on token expiry
- ✅ Secure session persistence

### Area Manager Features
- ✅ Branch creation and management
- ✅ Monthly quota setting per branch
- ✅ Comprehensive sales reports
- ✅ Branch performance history

### Branch Manager Features
- ✅ Interactive calendar for daily entry
- ✅ Sunday work blocking
- ✅ Edit-on-submit for late sales
- ✅ Monthly report export to Excel
- ✅ Quota display and tracking

### Data Management
- ✅ MySQL database with migrations
- ✅ Automatic database seeding
- ✅ Monthly quota vs. actual tracking
- ✅ Excel export functionality

---

## Troubleshooting

### 1. **Database Connection Error**

**Error:** `SQLSTATE[HY000]: General error: 1030`

**Solution:**
```bash
# Ensure MySQL is running
# On Windows, start MySQL Service:
net start MySQL80

# Clear Laravel cache
php artisan config:clear
php artisan cache:clear

# Re-run migrations
php artisan migrate --seed
```

### 2. **Frontend Not Loading (Blank Page)**

**Error:** Page loads but shows nothing

**Solution:**
```bash
# Build the frontend
npm run build

# Clear Laravel cache
php artisan config:clear

# Restart the server
php artisan serve
```

### 3. **Port 8000 Already in Use**

**Error:** `Address already in use`

**Solution:**
```bash
# Use a different port
php artisan serve --port=8001

# Then access: http://localhost:8001/login
```

### 4. **SMTP/Email Errors (Optional)**

If you see email errors when creating branches:
- Update SMTP credentials in `.env` (Gmail, Office365, etc.)
- Or skip SMTP setup for local development

The system will still function without email.

### 5. **Node Modules Issues**

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -r node_modules
npm install
```

### 6. **Permission Issues on Windows**

If you get permission errors:
- Run your terminal as **Administrator**
- Or adjust file permissions in folder properties

### 7. **Token Expired - Redirects to Login**

This is **normal behavior**. Token expires after inactivity.

**Solution:** Simply log in again.

---

## Common Commands

```bash
# Backend Commands
php artisan serve                    # Start Laravel server
php artisan migrate --seed           # Run migrations + seeders
php artisan config:clear            # Clear config cache
php artisan cache:clear             # Clear app cache
php artisan tinker                  # Interactive shell

# Frontend Commands
npm run dev                          # Start Vite dev server with hot reload
npm run build                        # Build for production
npm install                          # Install dependencies
npm install <package-name>          # Install specific package
```

---

## Project Structure

```
branchmanagement/
├── app/
│   ├── Http/Controllers/Api/      # API endpoints
│   ├── Models/                     # Database models
│   └── Providers/                  # Service providers
├── database/
│   ├── migrations/                 # Database schema
│   └── seeders/                    # Sample data
├── resources/
│   ├── css/                        # Tailwind CSS
│   ├── js/                         # React + TypeScript frontend
│   └── views/                      # Blade templates
├── routes/
│   ├── api.php                     # API routes
│   └── web.php                     # Web routes
├── config/                         # Configuration files
├── .env                            # Environment variables
├── composer.json                   # PHP dependencies
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

---

## Support & Troubleshooting

If you encounter issues:

1. **Check Laravel Logs** - `storage/logs/laravel.log`
2. **Check Browser Console** - Press `F12` in your browser
3. **Verify Database** - `mysql -u root branchmanagement`
4. **Restart Services** - Stop and restart both Laravel and Vite servers

---

## Production Deployment

Before deploying to production:

- [ ] Change `.env` database credentials
- [ ] Update `APP_KEY` in `.env` (run `php artisan key:generate`)
- [ ] Change default test credentials (`admin@example.com`, `branch@example.com`)
- [ ] Enable HTTPS and SSL certificates
- [ ] Set up proper SMTP credentials for emails
- [ ] Run `npm run build` for optimized frontend
- [ ] Use a proper web server (Nginx, Apache) instead of `php artisan serve`
- [ ] Set `APP_DEBUG=false` in `.env`

---

## Tech Stack

- **Backend**: Laravel 11, PHP 8.1+
- **Frontend**: React 19, TypeScript, Inertia.js
- **Database**: MySQL 8.0+
- **Authentication**: Laravel Sanctum (Token-based)
- **Build Tool**: Vite + npm
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Export**: SheetJS (xlsx)

---

## License

This project is proprietary software. All rights reserved.

---

**Last Updated:** May 2026  
**Version:** 1.0.0
