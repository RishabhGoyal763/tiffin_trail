/* ==========================================================
   TIFFIN TRAIL — app data & interactivity (REST API integrated)
   ========================================================== */

const API_BASE_URL = `${window.location.origin}/api`;
// ---------- STATE ----------

let restaurants = [];
let menuItems = [];
let offers = [];
let cart = []; // { id, qty }
let currentModalItem = null;
let modalQty = 1;
let currentUser = null;
let authToken = localStorage.getItem("tt_auth_token");

// ---------- HELPERS ----------

function getGuestId() {
  let gid = localStorage.getItem("tt_guest_id");
  if (!gid) {
    gid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "guest_" + Math.random().toString(36).slice(2);
    localStorage.setItem("tt_guest_id", gid);
  }
  return gid;
}

function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const token = localStorage.getItem("tt_auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["x-guest-id"] = getGuestId();
  }
  return headers;
}

const formatPrice = (n) => `₹${n.toLocaleString("en-IN")}`;
const findItem = (id) => menuItems.find((m) => m.id === id);

function copyOfferCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Copied ${code} to clipboard!`);
    }).catch(() => {
      showToast(`Code: ${code}`);
    });
  } else {
    showToast(`Code: ${code}`);
  }
}
window.copyOfferCode = copyOfferCode;

// ---------- API FETCHERS ----------

async function fetchOffersFromAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/offers`);
    if (res.ok) {
      const data = await res.json();
      offers = data.offers || [];
    }
  } catch (err) {
    console.error("Failed to fetch offers from API:", err);
  }
}

async function fetchRestaurantsFromAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/restaurants`);
    if (res.ok) {
      const data = await res.json();
      restaurants = data.restaurants || [];
    }
  } catch (err) {
    console.error("Failed to fetch restaurants from API:", err);
  }
}

async function fetchMenuFromAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/menu`);
    if (res.ok) {
      const data = await res.json();
      menuItems = data.items || [];
    }
  } catch (err) {
    console.error("Failed to fetch menu from API:", err);
  }
}

async function fetchCartFromAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const cartData = await res.json();
      if (cartData.lines) {
        cart = cartData.lines.map((l) => ({ id: l.menuItemId, qty: l.qty }));
      }
    }
  } catch (err) {
    console.error("Failed to fetch cart from API:", err);
  }
}

// ---------- VISUAL THEMES ----------

const RESTAURANT_THEMES = {
  r1: { banner: "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)", icon: '<i class="bi bi-fire text-warning"></i>', tagline: "Thali Specials" },
  r2: { banner: "linear-gradient(135deg, #047857 0%, #065f46 100%)", icon: '<i class="bi bi-cup-hot-fill text-success"></i>', tagline: "Crisp Dosas & Coffee" },
  r3: { banner: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)", icon: '<i class="bi bi-egg-fried text-danger"></i>', tagline: "Wok & Dimsums" },
  r4: { banner: "linear-gradient(135deg, #b45309 0%, #78350f 100%)", icon: '<i class="bi bi-pie-chart-fill text-warning"></i>', tagline: "Wood-Fired Crusts" },
  r5: { banner: "linear-gradient(135deg, #be123c 0%, #881337 100%)", icon: '<i class="bi bi-bag-heart-fill text-danger"></i>', tagline: "Chaat & Street Bites" },
  r6: { banner: "linear-gradient(135deg, #881337 0%, #4c0519 100%)", icon: '<i class="bi bi-fire text-danger"></i>', tagline: "Clay-Oven Kebabs" },
  r7: { banner: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)", icon: '<i class="bi bi-brightness-high-fill text-info"></i>', tagline: "Steamed Idlis & Podi" },
  r8: { banner: "linear-gradient(135deg, #a21caf 0%, #701a75 100%)", icon: '<i class="bi bi-heart-fill text-danger"></i>', tagline: "Handcrafted Sweets" }
};

function filterByRestaurant(restId) {
  const rest = restaurants.find(r => r.id === restId);
  if (!rest) return;
  const select = document.getElementById("cuisineFilter");
  if (select) {
    select.value = rest.cuisine;
    applyFilters();
  }
  const menuSec = document.getElementById("menu");
  if (menuSec) {
    menuSec.scrollIntoView({ behavior: "smooth" });
  }
  showToast(`Showing items from ${rest.name}`);
}

// ---------- RENDER: OFFERS ----------

function renderOffers() {
  const indicators = document.getElementById("offersIndicators");
  const inner = document.getElementById("offersInner");
  if (!indicators || !inner) return;

  indicators.innerHTML = offers
    .map(
      (o, idx) =>
        `<button type="button" data-bs-target="#offersCarousel" data-bs-slide-to="${idx}" class="${idx === 0 ? "active" : ""}" aria-label="Slide ${idx + 1}" ${idx === 0 ? 'aria-current="true"' : ""}></button>`
    )
    .join("");

  inner.innerHTML = offers
    .map(
      (o, idx) => `
    <div class="carousel-item ${idx === 0 ? "active" : ""}">
      <div class="tt-offer-slide ${o.theme || "tt-offer-mustard"}">
        <div class="tt-offer-text">
          <div class="tt-offer-code"><i class="bi ${o.icon || "bi-gift-fill"} me-1"></i> ${o.code}</div>
          <h3>${o.title}</h3>
          <p>${o.description}</p>
          <div class="d-flex align-items-center gap-3 mt-3">
            <button class="btn btn-sm btn-light fw-bold px-3 py-1 text-dark shadow-sm" onclick="copyOfferCode('${o.code}')">
              <i class="bi bi-clipboard me-1"></i> Copy Code
            </button>
            <span class="small opacity-75">${o.terms?.minOrder ? `Min. order ₹${o.terms.minOrder}` : "No min. order"}</span>
          </div>
        </div>
        <div class="tt-offer-icon d-none d-md-block">
          <i class="bi ${o.icon || "bi-gift-fill"}"></i>
        </div>
      </div>
    </div>`
    )
    .join("");

  const carouselEl = document.getElementById("offersCarousel");
  if (carouselEl && typeof bootstrap !== "undefined" && bootstrap.Carousel) {
    const existing = bootstrap.Carousel.getInstance(carouselEl);
    if (existing) existing.dispose();
    new bootstrap.Carousel(carouselEl, {
      interval: 4500,
      ride: "carousel",
      wrap: true
    });
  }
}

// ---------- RENDER: RESTAURANTS ----------

function renderRestaurants() {
  const grid = document.getElementById("restaurantGrid");
  if (!grid) return;
  grid.innerHTML = restaurants
    .map((r) => {
      const theme = RESTAURANT_THEMES[r.id] || {
        banner: "linear-gradient(135deg, #1B3327 0%, #12241B 100%)",
        icon: '<i class="bi bi-shop text-muted"></i>',
        badge: "Kitchen",
        tagline: "Local Specials"
      };
      const uniqueTags = (r.tags || []).filter(
        (t) => t.toLowerCase() !== (r.cuisine || "").toLowerCase()
      );
      return `
    <div class="col-sm-6 col-lg-3">
      <div class="tt-restaurant-card" onclick="filterByRestaurant('${r.id}')" title="Click to view menu from ${r.name}">
        <div class="tt-restaurant-banner" style="background: ${theme.banner}">
          <div class="tt-restaurant-rating-chip">
            <i class="bi bi-star-fill me-1"></i>${r.rating}
          </div>
          <div class="tt-restaurant-icon-circle">${theme.icon}</div>
        </div>
        <div class="tt-restaurant-body">
          <h3 class="tt-restaurant-title">${r.name}</h3>
          <p class="tt-restaurant-subtitle">${r.cuisine} · ${theme.tagline}</p>
          <div class="tt-restaurant-meta-row mb-2">
            <span class="tt-time-chip"><i class="bi bi-clock me-1"></i>${r.time}</span>
          </div>
          <div class="tt-restaurant-tags mt-auto">
            ${uniqueTags.map((t) => `<span class="tt-tag">${t}</span>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("");
}

// ---------- FILTERS ----------

function populateCuisineFilter() {
  const select = document.getElementById("cuisineFilter");
  select.innerHTML = '<option value="all">All Cuisines</option>';
  const cuisines = [...new Set(menuItems.map((m) => m.cuisine))].sort();
  cuisines.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

function getFilters() {
  const diet = document.querySelector('input[name="dietFilter"]:checked').value;
  const cuisine = document.getElementById("cuisineFilter").value;
  const maxPrice = Number(document.getElementById("priceFilter").value);
  const search = document.getElementById("navSearchInput").value.trim().toLowerCase();
  return { diet, cuisine, maxPrice, search };
}

function applyFilters() {
  const { diet, cuisine, maxPrice, search } = getFilters();

  const filtered = menuItems.filter((item) => {
    if (diet !== "all" && item.category !== diet) return false;
    if (cuisine !== "all" && item.cuisine !== cuisine) return false;
    if (item.price > maxPrice) return false;
    if (search && !(item.name.toLowerCase().includes(search) || item.restaurant.toLowerCase().includes(search))) return false;
    return true;
  });

  renderMenu(filtered);
}

function getFoodMedia(item, extraClass = "") {
  if (item && item.image) {
    return `<img src="${item.image}" alt="${item.name}" loading="lazy" referrerpolicy="no-referrer" class="${extraClass}">`;
  }
  return `<div class="tt-food-placeholder"></div>`;
}

// ---------- RENDER: MENU ----------

function renderMenu(items) {
  const grid = document.getElementById("menuGrid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");

  resultCount.textContent = `${items.length} dish${items.length !== 1 ? "es" : ""} found`;

  if (items.length === 0) {
    grid.innerHTML = "";
    emptyState.classList.remove("d-none");
    return;
  }
  emptyState.classList.add("d-none");

  grid.innerHTML = items
    .map((item) => {
      return `
    <div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="tt-food-card" data-item-id="${item.id}">
        <div class="tt-food-media">
          ${getFoodMedia(item)}
          <div class="tt-food-media-overlay"></div>
        </div>
        <div class="tt-food-body">
          <div class="tt-food-top">
            <div>
              <div class="tt-food-name">
                ${item.category === "veg" ? '<span class="tt-veg-dot" title="Vegetarian"></span>' : '<span class="tt-nonveg-dot" title="Non-Vegetarian"></span>'}
                ${item.name}
              </div>
              <div class="tt-food-restaurant">
                <i class="bi bi-shop me-1"></i>${item.restaurant || (restaurants.find(r => r.id === item.restaurantId)?.name) || "Tiffin Trail Kitchen"}
              </div>
            </div>
            <div class="tt-food-price">${formatPrice(item.price)}</div>
          </div>
          <p class="tt-food-desc">${item.desc ? item.desc : ""}</p>
          <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
            <span class="tt-food-cuisine">${item.cuisine}</span>
            <button type="button" class="btn tt-add-btn" data-add-id="${item.id}">
              <i class="bi bi-plus-lg me-1"></i> Add
            </button>
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("");

  grid.querySelectorAll(".tt-food-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add-id]")) return;
      openItemModal(card.dataset.itemId);
    });
  });

  grid.querySelectorAll("[data-add-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(btn.dataset.addId, 1);
      const item = findItem(btn.dataset.addId);
      showToast(`Added ${item ? item.name : 'item'} to your chit.`);
    });
  });
}

// ---------- MODAL ----------

const itemModalEl = document.getElementById("itemModal");
const bsItemModal = new bootstrap.Modal(itemModalEl);

function openItemModal(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  currentModalItem = item;
  modalQty = 1;

  document.getElementById("itemModalLabel").textContent = item.name;
  document.getElementById("modalQtyValue").textContent = modalQty;
  document.getElementById("itemModalBody").innerHTML = `
    <div class="d-flex gap-3 align-items-start">
      <div class="tt-food-media rounded" style="width:90px;height:90px;flex-shrink:0;font-size:2.4rem;overflow:hidden;">${getFoodMedia(item)}</div>
      <div>
        <p class="mb-1">
          ${item.category === "veg" ? '<span class="tt-veg-dot"></span> Veg' : '<span class="tt-nonveg-dot"></span> Non-Veg'}
          · <span class="tt-food-cuisine">${item.cuisine}</span>
        </p>
        <p class="mb-1 text-muted small">${item.restaurant}</p>
        <p class="fw-bold tt-food-price mb-2">${formatPrice(item.price)}</p>
        <p class="mb-0">${item.desc}</p>
      </div>
    </div>
  `;
  bsItemModal.show();
}

document.getElementById("modalQtyMinus").addEventListener("click", () => {
  modalQty = Math.max(1, modalQty - 1);
  document.getElementById("modalQtyValue").textContent = modalQty;
});
document.getElementById("modalQtyPlus").addEventListener("click", () => {
  modalQty = Math.min(20, modalQty + 1);
  document.getElementById("modalQtyValue").textContent = modalQty;
});
document.getElementById("modalAddBtn").addEventListener("click", (e) => {
  e.preventDefault();
  if (!currentModalItem) return;
  addToCart(currentModalItem.id, modalQty);
  showToast(`Added ${modalQty} × ${currentModalItem.name} to your chit.`);
  bsItemModal.hide();
});

// ---------- CART ----------

async function addToCart(itemId, qty) {
  const existing = cart.find((c) => c.id === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: itemId, qty });
  }
  renderCart();

  try {
    await fetch(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ menuItemId: itemId, qty })
    });
  } catch (err) {
    console.error("Cart add error:", err);
  }
}

async function updateQty(itemId, delta) {
  const line = cart.find((c) => c.id === itemId);
  if (!line) return;
  line.qty += delta;
  const newQty = line.qty;
  if (line.qty <= 0) {
    cart = cart.filter((c) => c.id !== itemId);
  }
  renderCart();

  try {
    await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ qty: newQty })
    });
  } catch (err) {
    console.error("Cart update error:", err);
  }
}

async function removeFromCart(itemId) {
  cart = cart.filter((c) => c.id !== itemId);
  renderCart();

  try {
    await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.error("Cart remove error:", err);
  }
}

function cartSubtotal() {
  return cart.reduce((sum, line) => {
    const item = findItem(line.id);
    return sum + (item ? item.price : 0) * line.qty;
  }, 0);
}

function renderCart() {
  const container = document.getElementById("cartItems");
  const totalQty = cart.reduce((sum, l) => sum + l.qty, 0);
  document.getElementById("cartCount").textContent = totalQty;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="tt-cart-empty">
        <i class="bi bi-basket"></i>
        Your chit is empty. Add a dish from the menu to get started.
      </div>`;
  } else {
    container.innerHTML = cart
      .map((line) => {
        const item = findItem(line.id);
        if (!item) return "";
        return `
        <div class="tt-cart-item">
          <div class="tt-cart-item-icon">${getFoodMedia(item)}</div>
          <div class="tt-cart-item-info">
            <div class="tt-cart-item-name">${item.name}</div>
            <div class="tt-cart-item-price">${formatPrice(item.price)} each</div>
          </div>
          <div class="tt-cart-qty">
            <button class="tt-qty-btn" data-qty-minus="${item.id}">−</button>
            <span>${line.qty}</span>
            <button class="tt-qty-btn" data-qty-plus="${item.id}">+</button>
          </div>
          <button class="tt-remove-btn" data-remove="${item.id}" aria-label="Remove ${item.name}">
            <i class="bi bi-trash3"></i>
          </button>
        </div>`;
      })
      .join("");

    container.querySelectorAll("[data-qty-minus]").forEach((btn) =>
      btn.addEventListener("click", () => updateQty(btn.dataset.qtyMinus, -1))
    );
    container.querySelectorAll("[data-qty-plus]").forEach((btn) =>
      btn.addEventListener("click", () => updateQty(btn.dataset.qtyPlus, 1))
    );
    container.querySelectorAll("[data-remove]").forEach((btn) =>
      btn.addEventListener("click", () => removeFromCart(btn.dataset.remove))
    );
  }

  const subtotal = cartSubtotal();
  const delivery = cart.length === 0 ? 0 : subtotal >= 399 ? 0 : 40;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + delivery + tax;

  document.getElementById("cartSubtotal").textContent = formatPrice(subtotal);
  document.getElementById("cartDelivery").textContent = delivery === 0 ? "Free" : formatPrice(delivery);
  document.getElementById("cartTax").textContent = formatPrice(tax);
  document.getElementById("cartTotal").textContent = formatPrice(total);
}

// ---------- AUTHENTICATION & USER MANAGEMENT ----------

async function checkAuthState() {
  const token = localStorage.getItem("tt_auth_token");
  if (!token) {
    currentUser = null;
    renderAuthUI();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      localStorage.setItem("tt_user", JSON.stringify(currentUser));
    } else {
      // Invalid/expired token
      localStorage.removeItem("tt_auth_token");
      localStorage.removeItem("tt_user");
      currentUser = null;
    }
  } catch (err) {
    console.warn("Could not verify auth token with server, using cached user if present:", err);
    const cached = localStorage.getItem("tt_user");
    if (cached) {
      try { currentUser = JSON.parse(cached); } catch (e) {}
    }
  }

  renderAuthUI();
}

function renderAuthUI() {
  const container = document.getElementById("navAuthSection");
  if (!container) return;

  if (currentUser) {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U";
    container.innerHTML = `
      <div class="dropdown">
        <button class="btn tt-user-badge dropdown-toggle" type="button" id="userMenuBtn" data-bs-toggle="dropdown" aria-expanded="false">
          <span class="tt-user-avatar">${initial}</span>
          <span class="d-none d-sm-inline">${currentUser.name}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end tt-user-dropdown-menu" aria-labelledby="userMenuBtn">
          <li class="px-3 py-1 text-muted" style="font-size: 0.78rem;">
            Signed in as<br><strong class="text-dark">${currentUser.email}</strong>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="viewOrdersBtn"><i class="bi bi-receipt"></i> My Order Chits</a></li>
          <li><a class="dropdown-item" href="#" id="viewProfileBtn"><i class="bi bi-person-circle"></i> Profile Settings</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Sign Out</a></li>
        </ul>
      </div>
    `;

    document.getElementById("logoutBtn").addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });

    document.getElementById("viewOrdersBtn").addEventListener("click", (e) => {
      e.preventDefault();
      openOrdersModal();
    });

    document.getElementById("viewProfileBtn").addEventListener("click", (e) => {
      e.preventDefault();
      openProfileModal();
    });

  } else {
    container.innerHTML = `
      <a href="login.html" class="btn btn-outline-light btn-sm rounded-pill px-3 me-2">
        <i class="bi bi-box-arrow-in-right"></i> Sign In
      </a>
      <a href="register.html" class="btn tt-btn-primary btn-sm rounded-pill px-3">
        <i class="bi bi-person-plus-fill"></i> Register
      </a>
    `;
  }
}

function logoutUser() {
  localStorage.removeItem("tt_auth_token");
  localStorage.removeItem("tt_user");
  currentUser = null;
  authToken = null;
  renderAuthUI();
  fetchCartFromAPI().then(renderCart);
  showToast("You have been signed out. Browsing as guest.");
}

// ---------- ORDER CHITS MODAL (HISTORY) ----------

const bsOrdersModal = new bootstrap.Modal(document.getElementById("ordersModal"));

async function openOrdersModal() {
  const modalBody = document.getElementById("ordersModalBody");
  modalBody.innerHTML = `
    <div class="text-center py-4 text-muted">
      <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
      <div>Loading your order chits...</div>
    </div>
  `;
  bsOrdersModal.show();

  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      modalBody.innerHTML = `<div class="alert alert-warning">Could not load orders. Please try again.</div>`;
      return;
    }

    const data = await res.json();
    const orders = data.orders || [];

    if (orders.length === 0) {
      modalBody.innerHTML = `
        <div class="text-center py-5">
          <div class="fs-1 text-muted mb-2">🍱</div>
          <h5 class="fw-bold">No Order Chits Yet</h5>
          <p class="text-muted" style="font-size: 0.9rem;">Add items from our kitchens to build and track your first order chit.</p>
        </div>
      `;
      return;
    }

    modalBody.innerHTML = orders.map((o) => {
      const dateStr = new Date(o.createdAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });

      const statusColors = {
        placed: "bg-warning text-dark",
        preparing: "bg-info text-dark",
        out_for_delivery: "bg-primary text-white",
        delivered: "bg-success text-white",
        cancelled: "bg-danger text-white"
      };
      const badgeClass = statusColors[o.status] || "bg-secondary text-white";
      const statusLabel = (o.status || "placed").replace(/_/g, " ");

      const itemsHtml = (o.items || []).map((it) => `
        <div class="tt-chit-line" style="font-size: 0.88rem;">
          <span>${it.qty} × ${it.name}</span>
          <span style="font-family: var(--font-mono);">${formatPrice(it.price * it.qty)}</span>
        </div>
      `).join("");

      return `
        <div class="tt-order-chit-card">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <span class="fw-bold" style="font-family: var(--font-mono);">CHIT #${o.id.slice(0, 8).toUpperCase()}</span>
              <span class="text-muted ms-2" style="font-size: 0.78rem;">${dateStr}</span>
            </div>
            <span class="badge ${badgeClass} tt-chit-status-badge">${statusLabel}</span>
          </div>

          <div class="mb-2">${itemsHtml}</div>
          <div class="tt-chit-divider my-2"></div>

          <div class="d-flex justify-content-between align-items-center" style="font-size: 0.82rem; color: #666;">
            <div>Delivery to: <strong>${o.customer?.name || "You"}</strong> (${o.customer?.phone || ""})</div>
            <div style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 700; color: var(--tt-ink);">
              TOTAL: ${formatPrice(o.total || 0)}
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Order history fetch error:", err);
    modalBody.innerHTML = `<div class="alert alert-danger">Error loading orders. Check server connection.</div>`;
  }
}

// ---------- USER PROFILE MODAL ----------

const bsProfileModal = new bootstrap.Modal(document.getElementById("profileModal"));

function openProfileModal() {
  if (!currentUser) return;
  document.getElementById("profEmail").value = currentUser.email || "";
  document.getElementById("profName").value = currentUser.name || "";
  document.getElementById("profPhone").value = currentUser.phone || "";
  document.getElementById("profRole").textContent = (currentUser.role || "customer").toUpperCase();
  document.getElementById("profileAlert").classList.add("d-none");
  bsProfileModal.show();
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById("profileAlert");
  const saveBtn = document.getElementById("saveProfileBtn");

  const name = document.getElementById("profName").value.trim();
  const phone = document.getElementById("profPhone").value.trim();

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "PUT",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, phone })
    });

    const data = await res.json();
    if (res.ok) {
      currentUser = { ...currentUser, ...data.user };
      localStorage.setItem("tt_user", JSON.stringify(currentUser));
      renderAuthUI();
      alertEl.className = "alert alert-success py-2";
      alertEl.textContent = "Profile updated successfully!";
      alertEl.classList.remove("d-none");
      setTimeout(() => bsProfileModal.hide(), 900);
    } else {
      alertEl.className = "alert alert-danger py-2";
      alertEl.textContent = data.error || "Update failed.";
      alertEl.classList.remove("d-none");
    }
  } catch (err) {
    alertEl.className = "alert alert-danger py-2";
    alertEl.textContent = "Server connection error.";
    alertEl.classList.remove("d-none");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
});

// ---------- CHECKOUT MODAL & FLOW ----------

const bsCheckoutModal = new bootstrap.Modal(document.getElementById("checkoutModal"));

document.getElementById("checkoutBtn").addEventListener("click", () => {
  if (cart.length === 0) {
    showToast("Your chit is empty — add a dish first.");
    return;
  }

  // Hide the cart offcanvas
  const offcanvasEl = document.getElementById("cartOffcanvas");
  const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
  if (offcanvasInstance) offcanvasInstance.hide();

  // Populate checkout modal values
  const total = document.getElementById("cartTotal").textContent;
  document.getElementById("checkoutModalTotal").textContent = total;

  const authAlert = document.getElementById("checkoutAuthAlert");
  const custNameInput = document.getElementById("orderCustName");
  const custPhoneInput = document.getElementById("orderCustPhone");

  if (currentUser) {
    custNameInput.value = currentUser.name || "";
    custPhoneInput.value = currentUser.phone || "";
    authAlert.className = "alert alert-success py-2 mb-3";
    authAlert.innerHTML = `<i class="bi bi-person-check-fill me-1"></i> Ordering as <strong>${currentUser.name}</strong> (${currentUser.email}). Chit will be linked to your account.`;
  } else {
    authAlert.className = "alert alert-info py-2 mb-3";
    authAlert.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> Ordering as guest. <a href="login.html" class="alert-link">Sign in</a> to save order to your account.`;
  }

  bsCheckoutModal.show();
});

document.getElementById("orderConfirmForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("orderCustName").value.trim();
  const phone = document.getElementById("orderCustPhone").value.trim();
  const address = document.getElementById("orderCustAddress").value.trim();
  const paymentMethod = document.getElementById("orderPaymentMethod").value;

  if (!name || !phone || !address) {
    showToast("Please fill in all delivery details.");
    return;
  }

  const confirmBtn = document.getElementById("confirmOrderBtn");
  const spinner = document.getElementById("orderSpinner");
  confirmBtn.disabled = true;
  spinner.classList.remove("d-none");

  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, phone, address, paymentMethod })
    });

    if (res.ok) {
      const order = await res.json();
      bsCheckoutModal.hide();
      cart = [];
      renderCart();
      showToast(`Chit #${order.id.slice(0, 6).toUpperCase()} placed! Hot dabba on its way. 🍱`);
      document.getElementById("orderConfirmForm").reset();
    } else {
      const errData = await res.json();
      showToast(errData.error || "Could not place order. Please try again.");
    }
  } catch (err) {
    console.error("Order placement error:", err);
    showToast("Checkout failed. Please check server connection.");
  } finally {
    confirmBtn.disabled = false;
    spinner.classList.add("d-none");
  }
});

// ---------- TOAST ----------

const toastEl = document.getElementById("ttToast");
const bsToast = new bootstrap.Toast(toastEl, { delay: 2800 });
function showToast(message) {
  document.getElementById("ttToastBody").textContent = message;
  bsToast.show();
}

// ---------- CONTACT FORM ----------

document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = e.target.querySelector('input[type="text"]');
  const emailInput = e.target.querySelector('input[type="email"]');
  const msgInput = e.target.querySelector('textarea');

  const name = nameInput ? nameInput.value : "";
  const email = emailInput ? emailInput.value : "";
  const message = msgInput ? msgInput.value : "";

  if (name && email && message) {
    try {
      await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });
    } catch (err) {
      console.error("Contact form error:", err);
    }
  }

  document.getElementById("contactStatus").classList.remove("d-none");
  e.target.reset();
});

// ---------- FILTER EVENT WIRING ----------

document.querySelectorAll('input[name="dietFilter"]').forEach((el) => el.addEventListener("change", applyFilters));
document.getElementById("cuisineFilter").addEventListener("change", applyFilters);
document.getElementById("priceFilter").addEventListener("input", (e) => {
  document.getElementById("priceValue").textContent = formatPrice(Number(e.target.value));
  applyFilters();
});
document.getElementById("navSearchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
  applyFilters();
});
document.getElementById("navSearchInput").addEventListener("input", applyFilters);

document.getElementById("resetFilters").addEventListener("click", () => {
  document.getElementById("dietAll").checked = true;
  document.getElementById("cuisineFilter").value = "all";
  document.getElementById("priceFilter").value = 500;
  document.getElementById("priceValue").textContent = formatPrice(500);
  document.getElementById("navSearchInput").value = "";
  applyFilters();
});

// ---------- INIT ----------

async function init() {
  await checkAuthState();
  await fetchOffersFromAPI();
  await fetchRestaurantsFromAPI();
  await fetchMenuFromAPI();
  await fetchCartFromAPI();

  renderOffers();
  renderRestaurants();
  populateCuisineFilter();
  renderMenu(menuItems);
  renderCart();
}

document.addEventListener("DOMContentLoaded", init);