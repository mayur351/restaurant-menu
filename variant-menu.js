const API = "https://opensheet.elk.sh/1Ap-9y8Pu4uHO4q6UvA5r4kwJ9p0ic8vFN31sNYyRARs/Sheet1";

const pagesEl = document.getElementById("pages");
const dotsEl = document.getElementById("dots");
const pageTitle = document.getElementById("pageTitle");
const pageMeta = document.getElementById("pageMeta");
const itemCount = document.getElementById("itemCount");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const viewport = document.getElementById("viewport");

let currentPage = 0;
let pageData = [];
let touchStartX = 0;

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;"
}[char]));

const truthy = (value) => ["TRUE", "YES", "1", "Y"].includes(String(value || "").trim().toUpperCase());
const field = (row, names) => names.map((name) => row[name]).find((value) => String(value || "").trim() !== "") || "";
const numberValue = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const money = (value) => {
  if (String(value || "").trim() === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? `&#8377;${number}` : escapeHtml(value);
};

function normalizeRow(row, index) {
  const page = numberValue(field(row, ["page", "Page", "page_number", "Page Number"]), 1);
  const sortOrder = numberValue(field(row, ["sort_order", "Sort Order", "order", "id"]), index + 1);

  return {
    page,
    sortOrder,
    category: field(row, ["category", "Category"]) || "House Specials",
    name: field(row, ["name", "Name", "item", "Item"]),
    description: field(row, ["description", "Description", "desc"]),
    priceLabel: field(row, ["price_label", "Price Label"]) || "Price",
    price: field(row, ["price", "Price"]),
    altPriceLabel: field(row, ["alt_price_label", "Alt Price Label", "secondary_label"]),
    altPrice: field(row, ["alt_price", "Alt Price", "secondary_price"]),
    seasonal: truthy(field(row, ["seasonal", "Seasonal"])),
    available: truthy(field(row, ["available", "Available"]))
  };
}

function renderPrices(item) {
  const primary = money(item.price);
  const secondary = money(item.altPrice);
  const primaryLabel = item.priceLabel && item.priceLabel.toLowerCase() !== "price" ? escapeHtml(item.priceLabel) : "";
  const secondaryLabel = item.altPriceLabel ? escapeHtml(item.altPriceLabel) : "";

  if (!primary && !secondary) return "";

  if (primary && secondary) {
    return `
      <div class="prices two-column">
        <div class="price-cell">${primaryLabel ? `<span>${primaryLabel}</span>` : ""}<strong>${primary}</strong></div>
        <div class="price-cell">${secondaryLabel ? `<span>${secondaryLabel}</span>` : ""}<strong>${secondary}</strong></div>
      </div>
    `;
  }

  return `<div class="prices"><div class="price-cell">${primaryLabel ? `<span>${primaryLabel}</span>` : ""}<strong>${primary || secondary}</strong></div></div>`;
}

function setPage(index) {
  if (!pageData.length) return;
  currentPage = Math.max(0, Math.min(index, pageData.length - 1));
  pagesEl.style.transform = `translateX(-${currentPage * 100}%)`;

  const active = pageData[currentPage];
  pageTitle.textContent = `Page ${active.page}`;
  pageMeta.textContent = `${active.itemCount} items / ${active.categories.length} sections`;
  prevPage.disabled = currentPage === 0;
  nextPage.disabled = currentPage === pageData.length - 1;

  [...dotsEl.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === currentPage);
  });
}

function renderMenu(data) {
  const items = data
    .map(normalizeRow)
    .filter((item) => item.available && item.name)
    .sort((a, b) => a.page - b.page || a.sortOrder - b.sortOrder);

  const groupedPages = new Map();
  items.forEach((item) => {
    if (!groupedPages.has(item.page)) groupedPages.set(item.page, []);
    groupedPages.get(item.page).push(item);
  });

  pageData = [...groupedPages.entries()].map(([page, pageItems]) => {
    const categoryMap = new Map();
    pageItems.forEach((item) => {
      if (!categoryMap.has(item.category)) categoryMap.set(item.category, []);
      categoryMap.get(item.category).push(item);
    });

    return {
      page,
      itemCount: pageItems.length,
      categories: [...categoryMap.entries()].map(([category, categoryItems]) => ({ category, items: categoryItems }))
    };
  });

  pagesEl.innerHTML = pageData.map((menuPage) => `
    <article class="menu-page">
      <header class="page-strip">
        <span>${menuPage.page}</span>
        <div>
          <h2>Menu Page</h2>
          <p>${escapeHtml(menuPage.categories.map((group) => group.category).join(", "))}</p>
        </div>
      </header>
      <div class="category-grid">
        ${menuPage.categories.map((group) => `
          <section class="category">
            <h3>${escapeHtml(group.category)}</h3>
            ${group.items.map((item) => `
              <div class="item ${item.price && item.altPrice ? "has-dual-price" : ""}">
                <div class="item-copy">
                  <div class="item-name-row">
                    <h4>${escapeHtml(item.name)}</h4>
                    ${item.seasonal ? '<em>Seasonal</em>' : ""}
                  </div>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </div>
                ${renderPrices(item)}
              </div>
            `).join("")}
          </section>
        `).join("")}
      </div>
    </article>
  `).join("");

  dotsEl.innerHTML = pageData.map((menuPage, index) => `<button type="button" aria-label="Open page ${menuPage.page}" data-index="${index}"></button>`).join("");
  dotsEl.querySelectorAll("button").forEach((dot) => dot.addEventListener("click", () => setPage(Number(dot.dataset.index))));
  itemCount.textContent = `${items.length} items`;
  setPage(0);
}

prevPage.addEventListener("click", () => setPage(currentPage - 1));
nextPage.addEventListener("click", () => setPage(currentPage + 1));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") setPage(currentPage - 1);
  if (event.key === "ArrowRight") setPage(currentPage + 1);
});
viewport.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0].clientX;
}, { passive: true });
viewport.addEventListener("touchend", (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 48) setPage(currentPage + (delta < 0 ? 1 : -1));
}, { passive: true });

fetch(API)
  .then((res) => {
    if (!res.ok) throw new Error("Menu sheet failed to load");
    return res.json();
  })
  .then(renderMenu)
  .catch(() => {
    pageTitle.textContent = "Menu unavailable";
    pageMeta.textContent = "Check the linked sheet";
    pagesEl.innerHTML = '<div class="message">The live menu could not be loaded right now.</div>';
  });
