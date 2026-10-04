# Tiffin Trail — Backend (REST API)

A REST API backend for the **Tiffin Trail** food delivery demo frontend (`index.html` / `script.js` / `style.css`). It mirrors the data and pricing logic that used to be hardcoded in the frontend's `script.js` — restaurants, menu items, cart, checkout math (free delivery ≥ ₹399, 5% tax) — and exposes it over HTTP so the frontend (or Postman, or any client) can talk to a real server instead of an in-memory JS array.

## Stack

- **Node.js + Express** — HTTP layer and routing
- **JWT (jsonwebtoken) + bcryptjs** — auth (register/login, hashed passwords, signed tokens)
- **A tiny JSON-file datastore** (`src/data/store.js`) — no native DB compilation required; each "table" is a JSON file under `src/data/storage/`. Swap this module for Postgres/Mongo/etc. later — every route only calls `readTable`/`writeTable`, so it's the single file you'd change.
- **express-rate-limit**, **cors** — basic hardening

## Getting started

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET
npm start                 # http://localhost:4000
```

The database seeds itself automatically on first run (`src/data/seed.js`), using the same restaurants/menu/offers data as the original frontend.

## Auth model

Two ways to use the cart/orders endpoints, matching the frontend's "no login required to browse and order" feel while still supporting real accounts:

- **Logged in**: register/login to get a JWT, send `Authorization: Bearer <token>`.
- **Guest**: send an `x-guest-id: <any-stable-string>` header (e.g. a UUID generated client-side and stored in the browser). The cart is scoped to that guest id.

`GET/POST/PATCH/DELETE /api/cart*` and `/api/orders*` require **one of the two**.

## Endpoints

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Service status |

### Restaurants
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/restaurants?cuisine=&search=` | — | List restaurants, optional filters |
| GET | `/api/restaurants/:id` | — | One restaurant + its menu |

### Menu
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/menu?diet=veg\|nonveg\|all&cuisine=&maxPrice=&search=&restaurantId=` | — | Filtered menu list (same filters as the frontend's filter bar) |
| GET | `/api/menu/cuisines` | — | Distinct cuisine list (for a dropdown) |
| GET | `/api/menu/:id` | — | One menu item |

### Offers
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/offers` | — | The offers carousel content |

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password, phone? }` → `{ token, user }` |
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Current user |

### Cart
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | Bearer or guest | Current cart with computed `subtotal`, `delivery`, `tax`, `total` |
| POST | `/api/cart/items` | Bearer or guest | `{ menuItemId, qty }` — add / increment |
| PATCH | `/api/cart/items/:menuItemId` | Bearer or guest | `{ qty }` — set an absolute quantity (`qty <= 0` removes it) |
| DELETE | `/api/cart/items/:menuItemId` | Bearer or guest | Remove one line |
| DELETE | `/api/cart` | Bearer or guest | Clear the cart |

### Orders
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | Bearer or guest | `{ name, phone, address, paymentMethod? }` — checks out the current cart, clears it, returns the order |
| GET | `/api/orders` | Bearer or guest | Order history for this user/guest |
| GET | `/api/orders/:id` | Bearer or guest | One order |
| PATCH | `/api/orders/:id/status` | Bearer or guest | `{ status }` — one of `placed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled` (in production this would be admin/restaurant-only) |

### Contact
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/contact` | — | `{ name, email, message }` — stores a support message |

## Pricing logic

Reproduced exactly from the frontend:

```
delivery = cart.length === 0 ? 0 : subtotal >= 399 ? 0 : 40
tax      = round(subtotal * 0.05)
total    = subtotal + delivery + tax
```

## Example: full order flow

```bash
# 1. Register
curl -X POST localhost:4000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Aman","email":"aman@example.com","password":"secret123"}'
# -> { token, user }

# 2. Add items to cart
curl -X POST localhost:4000/api/cart/items -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" -d '{"menuItemId":"m1","qty":2}'

# 3. Checkout
curl -X POST localhost:4000/api/orders -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Aman","phone":"9876543210","address":"123 Model Town, Ludhiana"}'
```

## Wiring up the existing frontend

The current `script.js` keeps `restaurants`, `menuItems`, and `cart` as local arrays. To connect it to this backend:

1. Replace the hardcoded `restaurants`/`menuItems` arrays with a `fetch("/api/restaurants")` / `fetch("/api/menu")` call in `init()`.
2. Generate a guest id once (`crypto.randomUUID()`), store it in `localStorage`, and send it as `x-guest-id` on every cart/order request (or swap in a real login form using `/api/auth`).
3. Replace `addToCart`/`updateQty`/`removeFromCart` with calls to `POST/PATCH/DELETE /api/cart/items/:id`, then re-render from the response.
4. Replace the `checkoutBtn` handler with `POST /api/orders`.
5. Replace the contact form's `preventDefault`-only handler with `POST /api/contact`.

## Project structure

```
src/
  server.js            # Express app entrypoint
  data/
    store.js            # JSON-file datastore
    seed.js              # Seed data (restaurants, menu, offers)
    storage/             # generated at runtime — the actual JSON "tables"
  middleware/
    auth.js              # JWT verification, guest-id fallback
  routes/
    restaurants.js
    menu.js
    offers.js
    auth.js
    cart.js
    orders.js
    contact.js
  utils/
    pricing.js           # shared subtotal/delivery/tax/total math
```

## Notes / production considerations

- The JSON-file store is fine for a demo/prototype; swap it for a real database before handling concurrent traffic.
- Add role-based access control before exposing `PATCH /api/orders/:id/status` to real restaurant/admin users.
- Add HTTPS, stronger rate limits, and input validation middleware (e.g. `zod`) for a production deployment.
