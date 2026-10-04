/**
 * In-Process Automated Test Suite for Tiffin Trail.
 * Tests Express routes directly in-memory without requiring external TCP network permissions.
 * Run directly with: node backend/test-auth.js
 */
require("dotenv").config({ path: __dirname + "/.env" });
const http = require("http");
const { Duplex } = require("stream");
const app = require("./src/server");

function mockRequest(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;

    const socket = new Duplex({
      read() {},
      write(chunk, enc, cb) { cb(); }
    });
    socket.remoteAddress = "127.0.0.1";
    socket.encrypted = false;
    socket.address = () => ({ address: "127.0.0.1", port: 4000 });
    socket.on("error", () => {});

    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = urlPath;
    req.headers = {
      "content-type": "application/json",
      host: "localhost:4000",
      ...(payload ? { "content-length": String(Buffer.byteLength(payload)) } : {}),
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
    };

    const res = new http.ServerResponse(req);
    res.assignSocket(socket);

    let resBody = "";
    res.write = (chunk) => {
      if (chunk) resBody += chunk;
      return true;
    };
    res.end = (chunk) => {
      if (chunk) resBody += chunk;
      let parsed = resBody;
      try {
        parsed = JSON.parse(resBody);
      } catch (e) {}
      resolve({
        status: res.statusCode,
        body: parsed,
        raw: resBody,
        headers: res.getHeaders ? res.getHeaders() : {}
      });
    };

    app(req, res);
    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("🧪 STARTING IN-PROCESS TIFFIN TRAIL TEST SUITE");
  console.log("==================================================\n");

  try {
    // 1. Health check
    console.log("🔹 1. Health & Database Check");
    const health = await mockRequest("GET", "/api/health");
    assert(health.status === 200, "Health check returns 200 OK");
    assert(health.body.status === "ok", "Service status is ok");
    assert(health.body.database && health.body.database.mode, `Database active mode: ${health.body.database?.mode}`);

    // 2. Unregistered User Login Protection
    console.log("\n🔹 2. Unregistered User Login Protection");
    const unknownLogin = await mockRequest("POST", "/api/auth/login", {
      email: "unknown.user@example.com",
      password: "password123"
    });
    assert(unknownLogin.status === 401, "Unregistered user login rejected with 401 Unauthorized");
    assert(!!unknownLogin.body.error, "Error message returned for non-existent account");
    assert(!unknownLogin.body.token, "No token issued for unregistered account");

    // 3. User Registration Validations
    console.log("\n🔹 3. User Registration Validation Checks");
    const shortPass = await mockRequest("POST", "/api/auth/register", {
      name: "Test User",
      email: "test.short@example.com",
      password: "123"
    });
    assert(shortPass.status === 400, "Short password rejected with 400 Bad Request");

    const badEmail = await mockRequest("POST", "/api/auth/register", {
      name: "Test User",
      email: "invalid-email-no-at",
      password: "password123"
    });
    assert(badEmail.status === 400, "Invalid email format rejected with 400 Bad Request");

    const missingName = await mockRequest("POST", "/api/auth/register", {
      name: "",
      email: "noname@example.com",
      password: "password123"
    });
    assert(missingName.status === 400, "Empty name rejected with 400 Bad Request");

    // 4. Successful User Registration
    console.log("\n🔹 4. Successful User Registration");
    const uniqueEmail = `test.foodie.${Date.now()}@example.com`;
    const regRes = await mockRequest("POST", "/api/auth/register", {
      name: "Aarav Sharma",
      email: uniqueEmail,
      password: "SecurePassword123!",
      phone: "9876543210"
    });
    assert(regRes.status === 201, "Registration succeeds with 201 Created");
    assert(!!regRes.body.token, "JWT token returned upon registration");
    assert(regRes.body.user.name === "Aarav Sharma", "User name stored correctly");
    assert(!regRes.body.user.passwordHash, "Security: passwordHash is not leaked in response");
    const userToken = regRes.body.token;

    // 5. Duplicate Registration Prevention
    console.log("\n🔹 5. Duplicate Email Conflict Detection");
    const dupRes = await mockRequest("POST", "/api/auth/register", {
      name: "Aarav Again",
      email: uniqueEmail,
      password: "AnotherPassword123!"
    });
    assert(dupRes.status === 409, "Duplicate registration rejected with 409 Conflict");

    // 6. User Login Tests
    console.log("\n🔹 6. User Login Tests");
    const loginOk = await mockRequest("POST", "/api/auth/login", {
      email: uniqueEmail,
      password: "SecurePassword123!"
    });
    assert(loginOk.status === 200, "Valid login returns 200 OK");
    assert(loginOk.body.user.email === uniqueEmail, "Correct user returned");

    const wrongPass = await mockRequest("POST", "/api/auth/login", {
      email: uniqueEmail,
      password: "WrongPassword999!"
    });
    assert(wrongPass.status === 401, "Wrong password rejected with 401 Unauthorized");

    const wrongEmail = await mockRequest("POST", "/api/auth/login", {
      email: "nobody.exists@example.com",
      password: "SomePassword123!"
    });
    assert(wrongEmail.status === 401, "Non-existent user rejected with 401 Unauthorized");

    // 7. Protected Route (GET /api/auth/me)
    console.log("\n🔹 7. Protected Current User Endpoint (/api/auth/me)");
    const meOk = await mockRequest("GET", "/api/auth/me", null, {
      Authorization: `Bearer ${userToken}`
    });
    assert(meOk.status === 200, "Authenticated /auth/me returns 200 OK");
    assert(meOk.body.email === uniqueEmail, "User details verified via JWT");

    const meUnauthorized = await mockRequest("GET", "/api/auth/me");
    assert(meUnauthorized.status === 401, "Unauthenticated /auth/me rejected with 401");

    // 8. Profile Update (PUT /api/auth/profile)
    console.log("\n🔹 8. Profile Update");
    const updateRes = await mockRequest(
      "PUT",
      "/api/auth/profile",
      { name: "Aarav Updated", phone: "9123456789" },
      { Authorization: `Bearer ${userToken}` }
    );
    assert(updateRes.status === 200, "Profile update returns 200 OK");
    assert(updateRes.body.user.name === "Aarav Updated", "Name updated in database");

    // 9. Cart & Order Flow with User Auth
    console.log("\n🔹 9. Authenticated Cart & Checkout Order Flow");
    const addCart = await mockRequest(
      "POST",
      "/api/cart/items",
      { menuItemId: "m1", qty: 2 },
      { Authorization: `Bearer ${userToken}` }
    );
    assert(addCart.status === 201 || addCart.status === 200, "Added dish to authenticated cart (status 201)");

    const cartRes = await mockRequest("GET", "/api/cart", null, {
      Authorization: `Bearer ${userToken}`
    });
    assert(cartRes.status === 200, "Fetched cart for authenticated user");
    assert(cartRes.body.lines && cartRes.body.lines.length > 0, "Cart contains line items");

    const orderRes = await mockRequest(
      "POST",
      "/api/orders",
      {
        name: "Aarav Updated",
        phone: "9123456789",
        address: "Flat 402, Greenfield Apartments, Sector 14",
        paymentMethod: "cash_on_delivery"
      },
      { Authorization: `Bearer ${userToken}` }
    );
    assert(orderRes.status === 201, "Placed order with authenticated account");
    assert(orderRes.body.userId === regRes.body.user.id, "Order linked to user account id");

    const ordersHistory = await mockRequest("GET", "/api/orders", null, {
      Authorization: `Bearer ${userToken}`
    });
    assert(ordersHistory.status === 200, "Fetched order history for user");
    assert(ordersHistory.body.orders && ordersHistory.body.orders.length >= 1, "Order chit appears in user order history");

    console.log("\n==================================================");
    console.log(`📊 RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  }
}

runTests();
