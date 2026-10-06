const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

// ============================================
// CONFIGURATION
// ============================================

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Store shortened URLs in memory
const urlStore = new Map();

/*
  Map structure:

  shortCode -> {
    originalUrl: "https://example.com",
    createdAt: timestamp
  }
*/

// ============================================
// GENERATE SHORT CODE
// ============================================

function generateShortCode() {
  return crypto.randomBytes(4).toString("hex");
}

// ============================================
// CREATE SHORT URL
// ============================================

app.post("/api/shorten", (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL",
      });
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        message: "Only HTTP and HTTPS URLs are allowed",
      });
    }

    // Generate unique short code
    let shortCode;

    do {
      shortCode = generateShortCode();
    } while (urlStore.has(shortCode));

    // Save URL
    urlStore.set(shortCode, {
      originalUrl: url,
      createdAt: Date.now(),
    });

    return res.status(201).json({
      success: true,
      message: "URL shortened successfully",
      data: {
        originalUrl: url,
        shortCode,
        shortUrl: `${BASE_URL}/${shortCode}`,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// ============================================
// REDIRECT SHORT URL
// ============================================

app.get("/:shortCode", (req, res) => {
  const { shortCode } = req.params;

  const urlData = urlStore.get(shortCode);

  // Short code doesn't exist
  if (!urlData) {
    return res.status(404).json({
      success: false,
      message: "Short URL not found",
    });
  }

  // Redirect to original URL
  return res.redirect(urlData.originalUrl);
});

// ============================================
// GET URL DETAILS
// ============================================

app.get("/api/urls/:shortCode", (req, res) => {
  const { shortCode } = req.params;

  const urlData = urlStore.get(shortCode);

  if (!urlData) {
    return res.status(404).json({
      success: false,
      message: "Short URL not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      shortCode,
      originalUrl: urlData.originalUrl,
      shortUrl: `${BASE_URL}/${shortCode}`,
      createdAt: urlData.createdAt,
    },
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "URL Shortener is running",
  });
});

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

app.listen(PORT, () => {
  console.log(`Server running on ${BASE_URL}`);
});