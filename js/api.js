const API_BASE = "https://fakestoreapi.com";
const CACHE_KEY = "marketly-products-cache-v1";
const CACHE_TTL = 15 * 60 * 1000;

// Local demo products keep every UI feature testable when the public API is down.
const DEMO_PRODUCTS = [
  { id: 101, title: "Everyday Canvas Backpack", price: 34.99, category: "accessories", description: "A versatile canvas backpack with practical pockets for daily essentials.", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600", rating: { rate: 4.6, count: 128 } },
  { id: 102, title: "Minimal Wireless Headphones", price: 59.50, category: "electronics", description: "Comfortable over-ear headphones designed for music, calls, and commuting.", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", rating: { rate: 4.4, count: 94 } },
  { id: 103, title: "Classic Everyday Watch", price: 42.00, category: "accessories", description: "A clean, versatile watch style that works for everyday wear.", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", rating: { rate: 4.3, count: 76 } },
  { id: 104, title: "Cotton Crew T-Shirt", price: 18.00, category: "men's clothing", description: "A soft cotton crew-neck tee with a relaxed everyday fit.", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600", rating: { rate: 4.2, count: 201 } },
  { id: 105, title: "Ceramic Coffee Mug", price: 12.50, category: "home", description: "A simple ceramic mug for your morning coffee or evening tea.", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca4e?w=600", rating: { rate: 4.7, count: 52 } },
  { id: 106, title: "Daily Carry Tote Bag", price: 22.00, category: "accessories", description: "A lightweight tote bag for books, shopping, and daily essentials.", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600", rating: { rate: 4.1, count: 66 } },
  { id: 107, title: "Modern Desk Lamp", price: 39.00, category: "home", description: "A minimal desk lamp to bring focused light to your workspace.", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600", rating: { rate: 4.5, count: 87 } },
  { id: 108, title: "Running Sneakers", price: 64.00, category: "men's clothing", description: "Lightweight sneakers made for everyday movement and casual outfits.", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600", rating: { rate: 4.4, count: 113 } },
  { id: 109, title: "Everyday Sunglasses", price: 27.00, category: "accessories", description: "Classic sunglasses with a clean frame and timeless shape.", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600", rating: { rate: 4.0, count: 41 } },
  { id: 110, title: "Soft Knit Sweater", price: 45.00, category: "women's clothing", description: "A soft knit layer designed for comfortable all-day wear.", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600", rating: { rate: 4.6, count: 99 } }
];

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.products) && cached.products.length) return cached;
  } catch (_) { /* Storage may be unavailable or malformed. */ }
  return null;
}
function writeCache(products) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ products, savedAt: Date.now() })); } catch (_) { /* Storage may be full or disabled. */ }
}
export async function fetchProducts({ force = false, signal } = {}) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.savedAt < CACHE_TTL) {
    return { products: cached.products, source: "cache" };
  }
  try {
    const response = await fetch(`${API_BASE}/products`, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Product service returned HTTP ${response.status}.`);
    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) throw new Error("The product service returned no products.");
    writeCache(products);
    return { products, source: "network" };
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (cached?.products?.length) return { products: cached.products, source: "cache-stale", warning: "The live API is unavailable; showing previously cached products." };
    writeCache(DEMO_PRODUCTS);
    return { products: DEMO_PRODUCTS, source: "demo", warning: "The live API is unavailable; showing built-in demo products so you can still test the interface." };
  }
}
