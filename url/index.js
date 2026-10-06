const express = require("express");

const app = express();

app.use(express.json());

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;      // Maximum 5 requests per minute

// Stores request information for each IP
const rateLimitStore = new Map();

/*
  Map structure:

  IP -> {
    count: number,
    windowStart: timestamp
  }
*/

// ============================================
// RATE LIMIT MIDDLEWARE
// ============================================

function rateLimiter(req, res, next) {
  // Get client IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const currentTime = Date.now();

  // Get existing record
  let record = rateLimitStore.get(ip);

  // First request from this IP
  if (!record) {
    record = {
      count: 1,
      windowStart: currentTime,
    };

    rateLimitStore.set(ip, record);

    // Rate limit headers
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);

    return next();
  }

  // Check whether the current window has expired
  const windowExpired =
    currentTime - record.windowStart >= WINDOW_MS;

  if (windowExpired) {
    // Start a new window
    record.count = 1;
    record.windowStart = currentTime;

    rateLimitStore.set(ip, record);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);

    return next();
  }

  // Check rate limit
  if (record.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil(
      (WINDOW_MS - (currentTime - record.windowStart)) / 1000
    );

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("Retry-After", retryAfter);

    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      retryAfter: `${retryAfter} seconds`,
    });
  }

  // Increment request count
  record.count++;

  rateLimitStore.set(ip, record);

  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader(
    "X-RateLimit-Remaining",
    MAX_REQUESTS - record.count
  );

  next();
}

// ============================================
// APPLY RATE LIMITER
// ============================================

app.use(rateLimiter);

// ============================================
// ROUTES
// ============================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Rate limiter API is running",
  });
});

app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    users: [
      {
        id: 1,
        name: "Sachin",
      },
      {
        id: 2,
        name: "Rahul",
      },
    ],
  });
});

app.get("/api/products", (req, res) => {
  res.json({
    success: true,
    products: [
      {
        id: 1,
        name: "Laptop",
      },
      {
        id: 2,
        name: "Mobile",
      },
    ],
  });
});

// ============================================
// CLEANUP OLD IP RECORDS
// ============================================

// Prevent memory from growing forever
setInterval(() => {
  const currentTime = Date.now();

  for (const [ip, record] of rateLimitStore.entries()) {
    if (currentTime - record.windowStart >= WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, WINDOW_MS);

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});