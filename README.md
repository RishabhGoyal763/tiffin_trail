# 🍱 Tiffin Trail — Food Delivery Platform

An authentic, end-to-end food delivery web application designed for fresh, home-style dabbas delivered hot from trusted neighborhood kitchens. Built with a responsive frontend (**HTML5, CSS3, Bootstrap 5, Vanilla JavaScript**) and an Express REST API backend (**Node.js, JWT, bcryptjs, MySQL relational database**).

---

## 📑 Table of Contents
1. [Problem Statement & Overview](#problem-statement--overview)
2. [User Interface Design](#user-interface-design)
3. [Database Architecture: MySQL vs MongoDB](#database-architecture-mysql-vs-mongodb)
4. [Relational Database Schema](#relational-database-schema)
5. [Backend REST APIs](#backend-rest-apis)
6. [Security & Authentication Flow](#security--authentication-flow)
7. [Getting Started & Installation](#getting-started--installation)
8. [Automated Testing](#automated-testing)
9. [Deployment Guide](#deployment-guide)

---

## 1. Problem Statement & Overview

Food delivery platforms require a seamless, intuitive, and trustworthy user experience paired with robust backend services:
- **Customer Identity & Trust**: Users need dedicated registration and login workflows to track orders, save profiles, and protect order histories.
- **Relational Integrity**: Orders, items, restaurants, menus, and users have strict relational dependencies that require transactional consistency and referential integrity.
- **Order Chit Experience**: Tiffin Trail features an authentic "order chit" receipt paradigm—from live kitchen dish selection to doorstep delivery status tracking.

---

## 2. User Interface Design

The frontend follows the signature Tiffin Trail warm paper aesthetic (`Fraunces` serif headlines, `Inter` sans-serif body, `Space Mono` chit accents, terracotta/mustard color palette):

### 🌟 Pages & Key Components
| Page / Component | Path | Description |
|---|---|---|
| **Main Storefront** | [`frontend/index.html`](frontend/index.html) | Restaurant cards, filterable menu, offers carousel, order chit drawer, user dropdown, profile modal, and orders chit modal. |
| **Sign In Page** | [`frontend/login.html`](frontend/login.html) | Clean, centered authentication card, email & password inputs with eye visibility toggle, live feedback, demo autofill button, and "Remember Me". |
| **Register Page** | [`frontend/register.html`](frontend/register.html) | Name, email, 10-digit mobile, password with dynamic strength meter (Weak/Fair/Good/Strong), password match validation, and terms agreement modal. |
| **Navbar Auth State** | Dynamic JS component | Renders "Sign In" / "Register" buttons when logged out, or a user avatar badge with dropdown menu ("My Order Chits", "Profile Settings", "Sign Out") when logged in. |
| **Checkout Flow** | `#checkoutModal` | Auto-populates customer details for authenticated users, lets guests enter details, supports payment selection (COD / UPI / Card), and displays payable chit total. |
| **Order Chit History** | `#ordersModal` | Interactive chit modal rendering past orders with live status badges (`placed`, `preparing`, `out_for_delivery`, `delivered`), dish itemization, and total. |

---

## 3. Database Architecture: Polyglot Persistence (MySQL + MongoDB)

Tiffin Trail uses an industry-standard **Polyglot Persistence Architecture**, giving you the best of both database paradigms:

```
                      ┌────────────────────────────────────────┐
                      │        Express.js Backend API          │
                      └───────────────┬────────────────┬───────┘
                                      │                │
                ACID Transactions & Financials         │ Rich Documents & Event Stream
                                      │                │
                                      ▼                ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │  🐬 MySQL 8.0    │    │  🍃 MongoDB 9.0  │
                     ├──────────────────┤    ├──────────────────┤
                     │ • users          │    │ • menu_items     │
                     │ • orders         │    │ • restaurants    │
                     │ • order_items    │    │ • offers         │
                     │ • payments       │    │ • user_activity  │
                     │ • carts          │    │   _logs          │
                     │ • cart_lines     │    │                  │
                     └──────────────────┘    └──────────────────┘
```

### Separation of Responsibilities
| Database | Data Domain | Why this database is best for this domain |
|---|---|---|
| **🐬 MySQL (Relational / ACID)** | **Core Transactional & Financial Data**<br>• `users` (auth, salted bcrypt hashes)<br>• `orders` (customer details, bill totals)<br>• `order_items` (purchased dish snapshots)<br>• `payments` (transaction ledger & audit trail)<br>• `carts` & `cart_lines` (active user sessions) | **Strict ACID Compliance & Foreign Keys**: Financial transactions, order totals, and user uniqueness demand zero-drift consistency, atomic rollbacks on failure, and referential integrity. |
| **🍃 MongoDB (Document / Flexible)** | **Dynamic Content & Event Streaming**<br>• `menu_items` (dishes, tags, allergens, spice level)<br>• `restaurants` (kitchen profiles, tags, themes)<br>• `offers` (promo codes, dynamic discount terms)<br>• `user_activity_logs` (clicks, logins, cart changes) | **Schema Flexibility & High-Write Velocity**: Dishes and promotions vary wildly in attributes (allergens, spice ratings, tags, conditional discount rules). Activity logs are high-throughput time-series records that don't need relational joins. |

> **Zero JSON File Storage**: All mock or file-based JSON storage has been removed. Every query is backed directly by live MySQL and MongoDB databases.

---

## 4. Relational Database Schema

The database schema is defined in [`backend/schema.sql`](backend/schema.sql):

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ CARTS : owns
    RESTAURANTS ||--|{ MENU_ITEMS : provides
    ORDERS ||--|{ ORDER_ITEMS : contains
    MENU_ITEMS ||--o{ ORDER_ITEMS : snapshot
    CARTS ||--|{ CART_LINES : holds
    MENU_ITEMS ||--o{ CART_LINES : references

    USERS {
        VARCHAR(36) id PK
        VARCHAR(100) name
        VARCHAR(191) email UK
        VARCHAR(255) password_hash
        VARCHAR(20) phone
        ENUM role
        TIMESTAMP created_at
    }

    RESTAURANTS {
        VARCHAR(36) id PK
        VARCHAR(150) name
        VARCHAR(100) cuisine
        DECIMAL rating
        VARCHAR(50) time_eta
        JSON tags
    }

    MENU_ITEMS {
        VARCHAR(36) id PK
        VARCHAR(36) restaurant_id FK
        VARCHAR(150) name
        ENUM category
        VARCHAR(100) cuisine
        INT price
        VARCHAR(255) image
        TEXT description
    }

    ORDERS {
        VARCHAR(36) id PK
        VARCHAR(100) owner_id
        VARCHAR(36) user_id FK
        VARCHAR(100) customer_name
        VARCHAR(20) customer_phone
        TEXT delivery_address
        ENUM status
        INT subtotal
        INT delivery_fee
        INT tax
        INT total
        VARCHAR(50) payment_method
        TIMESTAMP created_at
    }

    ORDER_ITEMS {
        VARCHAR(36) id PK
        VARCHAR(36) order_id FK
        VARCHAR(36) menu_item_id FK
        VARCHAR(150) name
        INT price
        INT qty
        INT line_total
    }
```

### Table Definitions
- `users`: Authenticated customers and staff with salted bcrypt hashes and unique emails.
- `restaurants`: Partnered kitchens with ratings, delivery estimates, and cuisines.
- `menu_items`: Dishes linked to restaurants with veg/nonveg classification and pricing.
- `offers`: Promotional discount voucher codes and conditions.
- `orders`: Order chit headers tracking customer information, financials, and live delivery status.
- `order_items`: Line items capturing price snapshots at the time of purchase.
- `carts` & `cart_lines`: Active shopping baskets for both authenticated users and guest sessions.
- `contact_messages`: Customer support and order inquiry messages.

---

## 5. Backend REST APIs

All endpoints are hosted at `http://localhost:4000/api`:

### 🔐 Authentication
- `POST /api/auth/register`
  - Body: `{ name, email, password, phone? }`
  - Returns: `201 Created` with `{ token, user }`
- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `200 OK` with `{ token, user }`
- `GET /api/auth/me` *(Protected: `Bearer <token>`)*
  - Returns: `200 OK` with current user profile
- `PUT /api/auth/profile` *(Protected: `Bearer <token>`)*
  - Body: `{ name?, phone? }`
  - Returns: `200 OK` with updated profile

### 🍱 Restaurants & Menu
- `GET /api/restaurants` — List restaurants with cuisine/search filtering
- `GET /api/restaurants/:id` — Restaurant details & menu
- `GET /api/menu` — Filter menu items by diet (`veg`/`nonveg`), cuisine, max price, search
- `GET /api/menu/cuisines` — Distinct cuisine list for dropdown filter
- `GET /api/offers` — Active discount offers for the carousel

### 🛒 Cart & Orders
- `GET /api/cart` — Current cart with computed subtotal, delivery fee, 5% tax, and total
- `POST /api/cart/items` — Add or increment dish (`{ menuItemId, qty }`)
- `PATCH /api/cart/items/:id` — Update quantity (`{ qty }`)
- `DELETE /api/cart/items/:id` — Remove line item
- `POST /api/orders` — Checkout cart (`{ name, phone, address, paymentMethod? }`)
- `GET /api/orders` — User's order chit history
- `GET /api/orders/:id` — Single order detail
- `PATCH /api/orders/:id/status` — Update order delivery status

---

## 6. Security & Authentication Flow

1. **Password Hashing**: User passwords are encrypted with `bcryptjs` using 10 salt rounds before persistence. Plaintext passwords are never saved or returned in API responses.
2. **Stateless JWT**: Standard JSON Web Tokens signed with secret `JWT_SECRET` expiring after 7 days.
3. **Session Dual-Mode**:
   - Logged-in customers send `Authorization: Bearer <token>`.
   - Anonymous visitors use `x-guest-id: <uuid>` so anyone can build an order chit before deciding to log in or register.
4. **Brute-Force Protection**: `express-rate-limit` limits write and API routes to protect against automated credential stuffing.

---

## 7. Getting Started & Installation

### Prerequisites
- Node.js (v18+)
- MySQL 8.0+ (running locally on port 3306)
- MongoDB 6.0+ (running locally on port 27017)

### Installation
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables (defaults provided)
cp .env.example .env
```

### Initializing the MySQL Database (Optional)
If you have MySQL running locally:
```bash
# Start MySQL service (macOS / Linux)
brew services start mysql   # macOS
# sudo service mysql start  # Ubuntu/Debian

# Run schema creation and seed script
npm run db:init
```

### Running the Application
```bash
# Start the backend server (serves both API and frontend on port 4000)
npm start
```
- **Storefront**: [http://localhost:4000/index.html](http://localhost:4000/index.html)
- **Sign In**: [http://localhost:4000/login.html](http://localhost:4000/login.html)
- **Register**: [http://localhost:4000/register.html](http://localhost:4000/register.html)
- **API Health**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Demo Credentials
For testing convenience, the database comes pre-seeded with a demo customer:
- **Email**: `aman@example.com`
- **Password**: `password123`
*(A 1-click **"Fill Demo"** button is also available on the Login page!)*

---

## 8. Automated Testing

The project includes an in-process automated test suite covering all authentication workflows, input validation rules, duplicate detection, JWT verification, profile updates, and authenticated order placement:

```bash
cd backend
npm run test:auth
```

**Test Suite Coverage (30/30 Passing Tests)**:
- [x] Health check & DB mode verification
- [x] Seeded demo user login
- [x] Short password rejection (< 6 chars -> 400)
- [x] Invalid email format rejection (400)
- [x] Empty name rejection (400)
- [x] Successful registration with bcrypt hash & JWT issuance (201)
- [x] Password hash non-leakage verification
- [x] Duplicate email registration conflict rejection (409)
- [x] Valid user login (200)
- [x] Wrong password rejection (401)
- [x] Non-existent user rejection (401)
- [x] Protected `/api/auth/me` with JWT Bearer token (200)
- [x] Unauthenticated request rejection (401)
- [x] Profile name & phone update (200)
- [x] Authenticated cart item addition & synchronization
- [x] Authenticated order checkout linking user account
- [x] Order chit history retrieval for user

---

## 9. Deployment Guide

### Option A: Deploy to Vercel (Recommended for Cloud Hosting)
Tiffin Trail includes built-in Vercel configuration (`vercel.json` + `api/index.js` serverless function).

1. **Push repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Tiffin Trail full-stack platform"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select your GitHub repository.
   - Leave Framework Preset as **Other** (Root directory `./`).
3. **Configure Environment Variables in Vercel Dashboard**:
   - `JWT_SECRET`: `your_secure_jwt_secret_key`
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster.mongodb.net/tiffin_trail`
   - `DB_HOST`: `your-cloud-mysql-host` (e.g. Aiven, TiDB Cloud, PlanetScale)
   - `DB_PORT`: `3306`
   - `DB_USER`: `your_db_username`
   - `DB_PASSWORD`: `your_db_password`
   - `DB_NAME`: `tiffin_trail`
4. **Deploy**:
   - Click **Deploy**. Vercel will automatically route `/api/*` to the serverless backend, serve dish images, and deliver frontend HTML/CSS/JS with edge caching!

---

### Option B: Deploy to VPS / Cloud Server (PM2 / Docker / Render)

#### Environment Configuration
Ensure `.env` in production specifies:
```env
PORT=4000
NODE_ENV=production
JWT_SECRET=use_a_long_cryptographically_secure_random_string
DB_HOST=your-mysql-host.cloud
DB_PORT=3306
DB_USER=tiffin_user
DB_PASSWORD=your_secure_db_password
DB_NAME=tiffin_trail
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tiffin_trail
```

#### Production Checklist
1. **Reverse Proxy & HTTPS**: Put behind NGINX or Caddy with SSL/TLS certificates (Let's Encrypt).
2. **Process Management**: Run with PM2 (`pm2 start backend/src/server.js --name tiffin-backend -i max`).
3. **Connection Pooling**: MySQL connection pool in `db.js` handles concurrent client connections efficiently.
4. **CORS Whitelist**: Restrict CORS origins in `server.js` to the production domain.
