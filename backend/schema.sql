-- ========================================================
-- TIFFIN TRAIL — Relational Database Schema (MySQL 8+)
-- Designed specifically for food delivery platform
-- ========================================================

CREATE DATABASE IF NOT EXISTS tiffin_trail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tiffin_trail;

-- --------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated customers, restaurant owners, admins
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  role ENUM('customer', 'restaurant_owner', 'delivery_partner', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. RESTAURANTS TABLE
-- Stores kitchen partners, operating hours, ratings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  cuisine VARCHAR(100) NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  time_eta VARCHAR(50) NOT NULL DEFAULT '25-30 min',
  tags JSON DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_restaurants_cuisine (cuisine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. MENU ITEMS TABLE
-- Stores dishes linked to specific restaurants with category
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  restaurant_id VARCHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  category ENUM('veg', 'nonveg') NOT NULL DEFAULT 'veg',
  cuisine VARCHAR(100) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  image VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_restaurant (restaurant_id),
  INDEX idx_menu_category (category),
  INDEX idx_menu_price (price),
  CONSTRAINT fk_menu_restaurant FOREIGN KEY (restaurant_id) 
    REFERENCES restaurants(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. OFFERS / PROMOTIONS TABLE
-- Stores discount coupon codes and promo terms
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  theme VARCHAR(50) DEFAULT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  discount_pct INT NOT NULL DEFAULT 0,
  max_discount INT NOT NULL DEFAULT 0,
  min_order INT NOT NULL DEFAULT 0,
  badge VARCHAR(50) DEFAULT NULL,
  valid_until VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. ORDERS TABLE (Order Chit Header)
-- Stores placed orders, status tracking, financial amounts
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  owner_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  status ENUM('placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'placed',
  subtotal INT NOT NULL DEFAULT 0,
  delivery_fee INT NOT NULL DEFAULT 0,
  tax INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_owner (owner_id),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. ORDER ITEMS TABLE (Order Chit Line Items)
-- Stores snapshot of individual items ordered
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  menu_item_id VARCHAR(36) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  qty INT NOT NULL DEFAULT 1,
  line_total INT NOT NULL DEFAULT 0,
  INDEX idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) 
    REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_menu FOREIGN KEY (menu_item_id) 
    REFERENCES menu_items(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6b. PAYMENTS TABLE (Transaction Ledger)
-- Core financial transaction records
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) DEFAULT NULL,
  amount INT NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery',
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'completed',
  transaction_ref VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_user (user_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) 
    REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. CARTS & CART LINES TABLE
-- Stores active carts for authenticated users & guest sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS carts (
  owner_id VARCHAR(100) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_lines (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  owner_id VARCHAR(100) NOT NULL,
  menu_item_id VARCHAR(36) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cart_lines_owner (owner_id),
  CONSTRAINT fk_cart_lines_cart FOREIGN KEY (owner_id) 
    REFERENCES carts(owner_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cart_lines_menu FOREIGN KEY (menu_item_id) 
    REFERENCES menu_items(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. CONTACT MESSAGES TABLE
-- Stores inquiries and support messages
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
