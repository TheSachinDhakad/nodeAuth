const express = require("express");

const app = express();

app.use(express.json());

const PORT = 3000;

// ============================================
// PRODUCTS
// ============================================

const products = [
  {
    id: 1,
    name: "Laptop",
    price: 60000,
    stock: 10,
  },
  {
    id: 2,
    name: "Mobile",
    price: 30000,
    stock: 20,
  },
  {
    id: 3,
    name: "Keyboard",
    price: 1500,
    stock: 50,
  },
  {
    id: 4,
    name: "Mouse",
    price: 800,
    stock: 30,
  },
];

// ============================================
// CART STORAGE
// ============================================

/*
  Map structure:

  userId -> [
    {
      productId: 1,
      name: "Laptop",
      price: 60000,
      quantity: 2
    }
  ]
*/

const carts = new Map();

// ============================================
// GET PRODUCTS
// ============================================

app.get("/api/products", (req, res) => {
  res.status(200).json({
    success: true,
    data: products,
  });
});

// ============================================
// GET CART
// ============================================

app.get("/api/cart/:userId", (req, res) => {
  const { userId } = req.params;

  const cart = carts.get(userId) || [];

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalAmount = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  res.status(200).json({
    success: true,
    data: {
      userId,
      items: cart,
      totalItems,
      totalAmount,
    },
  });
});

// ============================================
// ADD TO CART
// ============================================

app.post("/api/cart/:userId/items", (req, res) => {
  const { userId } = req.params;
  const { productId, quantity = 1 } = req.body;

  // Validate productId
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "productId is required",
    });
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a positive integer",
    });
  }

  // Find product
  const product = products.find(
    (product) => product.id === Number(productId)
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Get existing cart
  let cart = carts.get(userId) || [];

  // Check if product already exists
  const existingItem = cart.find(
    (item) => item.productId === product.id
  );

  if (existingItem) {
    const newQuantity =
      existingItem.quantity + quantity;

    // Check stock
    if (newQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`,
      });
    }

    existingItem.quantity = newQuantity;
  } else {
    // Check stock
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available`,
      });
    }

    cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
    });
  }

  carts.set(userId, cart);

  res.status(201).json({
    success: true,
    message: "Product added to cart",
    data: cart,
  });
});

// ============================================
// UPDATE CART ITEM
// ============================================

app.put("/api/cart/:userId/items/:productId", (req, res) => {
  const { userId, productId } = req.params;
  const { quantity } = req.body;

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Quantity must be a positive integer",
    });
  }

  const product = products.find(
    (product) => product.id === Number(productId)
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Check stock
  if (quantity > product.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock} items available`,
    });
  }

  const cart = carts.get(userId) || [];

  const item = cart.find(
    (item) => item.productId === Number(productId)
  );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "Product not found in cart",
    });
  }

  item.quantity = quantity;

  carts.set(userId, cart);

  res.status(200).json({
    success: true,
    message: "Cart updated successfully",
    data: cart,
  });
});

// ============================================
// REMOVE FROM CART
// ============================================

app.delete("/api/cart/:userId/items/:productId", (req, res) => {
  const { userId, productId } = req.params;

  const cart = carts.get(userId) || [];

  const itemIndex = cart.findIndex(
    (item) => item.productId === Number(productId)
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Product not found in cart",
    });
  }

  cart.splice(itemIndex, 1);

  carts.set(userId, cart);

  res.status(200).json({
    success: true,
    message: "Product removed from cart",
    data: cart,
  });
});

// ============================================
// CLEAR CART
// ============================================

app.delete("/api/cart/:userId", (req, res) => {
  const { userId } = req.params;

  carts.delete(userId);

  res.status(200).json({
    success: true,
    message: "Cart cleared successfully",
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
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
// SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});