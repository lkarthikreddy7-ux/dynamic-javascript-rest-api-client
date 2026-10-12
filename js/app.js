import { fetchProducts } from "./api.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { products: [], category: "all", query: "", sort: "featured", visibleCount: 12, saved: new Set(), cart: new Map(), controller: null };
const els = {
  grid: $("#product-grid"), skeleton: $("#skeleton-grid"), status: $("#status-message"),
  error: $("#error-banner"), errorText: $("#error-text"), empty: $("#empty-state"),
  count: $("#result-count"), categories: $("#category-filter"), tabs: $("#category-tabs"),
  search: $("#search-input"), sort: $("#sort-select"), loadMore: $("#load-more"),
  savedList: $("#saved-list"), savedCount: $("#saved-count"), cartCount: $("#cart-count"),
  dialog: $("#product-dialog"), dialogContent: $("#dialog-content"), announcer: $("#announcer")
};
function announce(message) { if (els.announcer) els.announcer.textContent = message; }
function readSet(key) {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return new Set(Array.isArray(value) ? value.map(String) : []); }
  catch (_) { return new Set(); }
}
function saveSet(key, set) { try { localStorage.setItem(key, JSON.stringify([...set])); } catch (_) { announce("Your browser could not save this preference."); } }
state.saved = readSet("marketly-saved");
try {
  const cart = JSON.parse(localStorage.getItem("marketly-cart") || "[]");
  if (Array.isArray(cart)) state.cart = new Map(cart.filter(x => Array.isArray(x) && x.length === 2));
} catch (_) {}
function persistCart() { try { localStorage.setItem("marketly-cart", JSON.stringify([...state.cart])); } catch (_) {} updateCart(); }
function updateCart() {
  const total = [...state.cart.values()].reduce((sum, quantity) => sum + Number(quantity || 0), 0);
  els.cartCount.textContent = total;
  $("#cart-button").setAttribute("aria-label", `Cart, ${total} ${total === 1 ? "item" : "items"}`);
}
function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function getProduct(id) { return state.products.find(product => String(product.id) === String(id)); }

function buildCategories() {
  const categories = [...new Set(state.products.map(p => p.category))].sort();
  els.categories.replaceChildren(new Option("All categories", "all"));
  els.tabs.replaceChildren();
  const all = element("button", "category-chip is-active", "All items");
  all.type = "button"; all.dataset.category = "all"; all.setAttribute("aria-pressed", "true"); els.tabs.append(all);
  categories.forEach(category => {
    els.categories.add(new Option(category.replace(/(^|\s)\S/g, char => char.toUpperCase()), category));
    const chip = element("button", "category-chip", category.replace(/(^|\s)\S/g, char => char.toUpperCase()));
    chip.type = "button"; chip.dataset.category = category; chip.setAttribute("aria-pressed", "false"); els.tabs.append(chip);
  });
}
function filteredProducts() {
  let list = state.products.filter(product => {
    const query = state.query.trim().toLowerCase();
    const matchesQuery = !query || `${product.title} ${product.description} ${product.category}`.toLowerCase().includes(query);
    return matchesQuery && (state.category === "all" || product.category === state.category);
  });
  switch (state.sort) {
    case "price-asc": list.sort((a,b) => a.price - b.price); break;
    case "price-desc": list.sort((a,b) => b.price - a.price); break;
    case "rating-desc": list.sort((a,b) => (b.rating?.rate || 0) - (a.rating?.rate || 0)); break;
    case "title-asc": list.sort((a,b) => a.title.localeCompare(b.title)); break;
  }
  return list;
}
function renderProduct(product) {
  const card = element("article", "product-card");
  const imageWrap = element("div", "product-image-wrap");
  const image = element("img", "product-image");
  image.src = product.image; image.alt = product.title; image.loading = "lazy";
  image.addEventListener("error", () => { image.alt = `${product.title} image unavailable`; image.removeAttribute("src"); imageWrap.classList.add("image-fallback"); imageWrap.append(element("span", "", "Image unavailable")); }, { once: true });
  const save = element("button", "save-button", state.saved.has(String(product.id)) ? "♥" : "♡");
  save.type = "button"; save.setAttribute("aria-pressed", String(state.saved.has(String(product.id))));
  save.setAttribute("aria-label", `${state.saved.has(String(product.id)) ? "Remove from" : "Add to"} saved items: ${product.title}`);
  save.addEventListener("click", () => toggleSaved(product.id));
  imageWrap.append(image, save);
  const category = element("p", "product-category", product.category);
  const title = element("h3", "product-title", product.title);
  title.title = product.title;
  const rating = element("p", "product-rating", `★ ${product.rating?.rate ?? "—"} · ${product.rating?.count ?? 0} reviews`);
  const bottom = element("div", "product-bottom");
  const price = element("span", "product-price", money(product.price));
  const add = element("button", "add-button", "＋ Add");
  add.type = "button"; add.setAttribute("aria-label", `Add ${product.title} to cart`);
  add.addEventListener("click", () => addToCart(product.id));
  bottom.append(price, add);
  card.append(imageWrap, category, title, rating, bottom);
  card.addEventListener("dblclick", event => { if (!event.target.closest("button")) openDetails(product.id); });
  const details = element("button", "details-trigger", "View details");
  details.type = "button"; details.addEventListener("click", () => openDetails(product.id));
  card.append(details);
  return card;
}
function render() {
  const all = filteredProducts();
  const shown = all.slice(0, state.visibleCount);
  els.grid.replaceChildren(...shown.map(renderProduct));
  els.error.hidden = true;
  els.grid.hidden = false;
  els.skeleton.hidden = true;
  els.empty.hidden = all.length !== 0;
  els.grid.hidden = all.length === 0;
  els.count.textContent = all.length ? `Showing ${shown.length} of ${all.length} products` : "No matching products";
  els.status.textContent = `Loaded ${state.products.length} products. ${all.length} match your filters.`;
  els.loadMore.hidden = shown.length >= all.length || all.length === 0;
  els.loadMore.textContent = "Load more products";
  $$(".category-chip", els.tabs).forEach(chip => {
    const active = chip.dataset.category === state.category;
    chip.classList.toggle("is-active", active); chip.setAttribute("aria-pressed", String(active));
  });
  renderSaved();
}
function toggleSaved(id) {
  const key = String(id);
  if (state.saved.has(key)) state.saved.delete(key); else state.saved.add(key);
  saveSet("marketly-saved", state.saved);
  render();
  announce(state.saved.has(key) ? "Product added to saved items." : "Product removed from saved items.");
}
function renderSaved() {
  els.savedCount.textContent = state.saved.size;
  const savedProducts = [...state.saved].map(getProduct).filter(Boolean);
  if (!savedProducts.length) { els.savedList.replaceChildren(element("p", "muted", "Save a product with the heart button to see it here.")); return; }
  els.savedList.replaceChildren(...savedProducts.map(product => {
    const item = element("div", "saved-item");
    const image = element("img"); image.src = product.image; image.alt = "";
    const title = element("span", "", product.title);
    const remove = element("button", "", "×"); remove.type = "button"; remove.setAttribute("aria-label", `Remove ${product.title} from saved items`);
    remove.addEventListener("click", () => toggleSaved(product.id));
    item.append(image, title, remove); return item;
  }));
}
function addToCart(id) {
  const key = String(id);
  state.cart.set(key, (state.cart.get(key) || 0) + 1);
  persistCart();
  announce(`${getProduct(id)?.title || "Product"} added to cart.`);
}
function openDetails(id) {
  const product = getProduct(id); if (!product) return;
  els.dialogContent.replaceChildren();
  const wrap = element("div", "dialog-product");
  const image = element("img"); image.src = product.image; image.alt = product.title;
  const info = element("div");
  info.append(element("p", "product-category", product.category), element("h2", "", product.title), element("p", "", product.description), element("p", "product-rating", `★ ${product.rating?.rate ?? "—"} · ${product.rating?.count ?? 0} reviews`), element("div", "dialog-price", money(product.price)));
  const actions = element("div", "dialog-actions");
  const add = element("button", "button button-dark", "Add to cart"); add.type = "button"; add.addEventListener("click", () => addToCart(product.id));
  const save = element("button", "button button-outline", state.saved.has(String(product.id)) ? "♥ Saved" : "♡ Save item"); save.type = "button"; save.addEventListener("click", () => { toggleSaved(product.id); save.textContent = state.saved.has(String(product.id)) ? "♥ Saved" : "♡ Save item"; });
  actions.append(add, save); info.append(actions); wrap.append(image, info); els.dialogContent.append(wrap);
  if (typeof els.dialog.showModal === "function") els.dialog.showModal(); else els.dialog.setAttribute("open", "");
}
async function loadProducts(force = false) {
  state.controller?.abort();
  state.controller = new AbortController();
  els.error.hidden = true; els.skeleton.hidden = false; els.grid.hidden = true; els.empty.hidden = true;
  els.status.textContent = "Loading the latest products…"; els.status.hidden = false;
  try {
    const result = await fetchProducts({ force, signal: state.controller.signal });
    state.products = result.products;
    buildCategories();
    render();
    updateCart();
    els.error.hidden = true;
    els.skeleton.hidden = true;
    els.grid.hidden = state.products.length === 0;
    els.status.hidden = false;
    if (result.warning) {
      els.status.textContent = `${result.warning} Loaded ${state.products.length} products.`;
    } else {
      const sourceLabel = result.source === "network" ? "the live API" : result.source === "cache" ? "local cache" : "local demo data";
      els.status.textContent = `Loaded ${state.products.length} products from ${sourceLabel}.`;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    els.skeleton.hidden = true; els.grid.hidden = true; els.error.hidden = false;
    els.errorText.textContent = error instanceof TypeError ? "The API may be unavailable or your connection may block the request. Try again in a moment." : error.message;
    els.status.textContent = "Product loading failed.";
  }
}
els.search.addEventListener("input", () => { state.query = els.search.value; state.visibleCount = 12; render(); });
els.categories.addEventListener("change", () => { state.category = els.categories.value; state.visibleCount = 12; render(); });
els.sort.addEventListener("change", () => { state.sort = els.sort.value; render(); });
els.tabs.addEventListener("click", event => {
  const button = event.target.closest("[data-category]"); if (!button) return;
  state.category = button.dataset.category; els.categories.value = state.category; state.visibleCount = 12; render();
});
els.loadMore.addEventListener("click", () => { state.visibleCount += 12; render(); });
$("#clear-filters").addEventListener("click", () => { state.query = ""; state.category = "all"; state.sort = "featured"; state.visibleCount = 12; els.search.value = ""; els.categories.value = "all"; els.sort.value = "featured"; render(); });
$("#refresh-button").addEventListener("click", () => loadProducts(true));
$("#retry-button").addEventListener("click", () => loadProducts(true));
function renderCartDialog() {
  const cartDialog = $("#cart-dialog");
  const items = $("#cart-items");
  const totalElement = $("#cart-total");
  if (!cartDialog || !items || !totalElement) return;
  const entries = [...state.cart].map(([id, quantity]) => ({ product: getProduct(id), quantity: Number(quantity) })).filter(entry => entry.product && entry.quantity > 0);
  items.replaceChildren();
  if (!entries.length) items.append(element("p", "muted", "Your cart is empty. Add a product to get started."));
  let total = 0;
  entries.forEach(({ product, quantity }) => {
    total += product.price * quantity;
    const row = element("div", "cart-item");
    const image = element("img", "cart-item-image");
    image.src = product.image; image.alt = "";
    const details = element("div", "cart-item-details");
    details.append(element("strong", "", product.title), element("span", "muted", `${quantity} × ${money(product.price)}`));
    const amount = element("strong", "cart-item-total", money(product.price * quantity));
    const controls = element("div", "cart-quantity");
    const minus = element("button", "quantity-button", "−");
    minus.type = "button"; minus.setAttribute("aria-label", `Remove one ${product.title}`);
    minus.addEventListener("click", () => {
      const key = String(product.id);
      const next = (state.cart.get(key) || 0) - 1;
      if (next <= 0) state.cart.delete(key); else state.cart.set(key, next);
      persistCart(); renderCartDialog();
    });
    const qty = element("span", "", String(quantity));
    const plus = element("button", "quantity-button", "+");
    plus.type = "button"; plus.setAttribute("aria-label", `Add one ${product.title}`);
    plus.addEventListener("click", () => {
      const key = String(product.id); state.cart.set(key, (state.cart.get(key) || 0) + 1);
      persistCart(); renderCartDialog();
    });
    controls.append(minus, qty, plus);
    row.append(image, details, amount, controls);
    items.append(row);
  });
  totalElement.textContent = money(total);
}
$("#cart-button").addEventListener("click", () => {
  renderCartDialog();
  const cartDialog = $("#cart-dialog");
  if (typeof cartDialog.showModal === "function") cartDialog.showModal();
  else cartDialog.setAttribute("open", "");
});
$("#cart-dialog-close").addEventListener("click", () => {
  const cartDialog = $("#cart-dialog");
  if (typeof cartDialog.close === "function") cartDialog.close();
  else cartDialog.removeAttribute("open");
});
$("#continue-shopping").addEventListener("click", () => {
  const cartDialog = $("#cart-dialog");
  if (typeof cartDialog.close === "function") cartDialog.close();
  else cartDialog.removeAttribute("open");
});
$("#clear-cart").addEventListener("click", () => {
  state.cart.clear(); persistCart(); renderCartDialog(); announce("Cart cleared.");
});
$("#cart-dialog").addEventListener("click", event => {
  if (event.target === event.currentTarget) {
    if (typeof event.currentTarget.close === "function") event.currentTarget.close();
    else event.currentTarget.removeAttribute("open");
  }
});
$("#theme-toggle").addEventListener("click", event => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  event.currentTarget.setAttribute("aria-pressed", String(dark));
  event.currentTarget.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  try { localStorage.setItem("marketly-theme", dark ? "dark" : "light"); } catch (_) {}
});
try {
  const savedTheme = localStorage.getItem("marketly-theme");
  if (savedTheme) { document.documentElement.dataset.theme = savedTheme; $("#theme-toggle").setAttribute("aria-pressed", String(savedTheme === "dark")); $("#theme-toggle").setAttribute("aria-label", savedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"); }
} catch (_) {}
$(".dialog-close").addEventListener("click", () => {
  if (typeof els.dialog.close === "function") els.dialog.close();
  else els.dialog.removeAttribute("open");
});
els.dialog.addEventListener("click", event => {
  if (event.target === els.dialog) {
    if (typeof els.dialog.close === "function") els.dialog.close();
    else els.dialog.removeAttribute("open");
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) { event.preventDefault(); els.search.focus(); }
});
loadProducts();
