/**
 * Homepage App - Markdown-driven bookmark start page
 * Parses a markdown file and renders categorized bookmark cards.
 */

const BOOKMARKS_FILE = 'bookmarks.md';

let dragLocked = true;

// ============================================
// Markdown Parser
// ============================================

/**
 * Parses the bookmarks markdown file into a structured object.
 *
 * Expected format:
 *   # Page Title
 *   ## Section Name
 *   <!-- color: #hexcolor -->
 *   - [Link Title](https://url.com)
 *
 * @param {string} markdown - Raw markdown content
 * @returns {{ title: string, sections: Array<{ name: string, color: string, links: Array<{ title: string, url: string }> }> }}
 */
function parseBookmarksMarkdown(markdown) {
  const lines = markdown.split('\n');
  let title = '';
  let editUrl = '';
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // H1 - Page title
    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      title = h1Match[1].trim();
      continue;
    }

    // Edit URL comment (global, before any section)
    const editUrlMatch = trimmed.match(/^<!--\s*edit_url:\s*(.+?)\s*-->$/);
    if (editUrlMatch && !currentSection) {
      editUrl = editUrlMatch[1].trim();
      continue;
    }

    // H2 - Section title
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      currentSection = {
        name: h2Match[1].trim(),
        color: '#6366f1', // default color
        links: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Color comment
    const colorMatch = trimmed.match(/^<!--\s*color:\s*(#[0-9a-fA-F]{3,8})\s*-->$/);
    if (colorMatch && currentSection) {
      currentSection.color = colorMatch[1];
      continue;
    }

    // Link item
    const linkMatch = trimmed.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch && currentSection) {
      currentSection.links.push({
        title: linkMatch[1].trim(),
        url: linkMatch[2].trim(),
      });
    }
  }

  return { title, editUrl, sections };
}

// ============================================
// Favicon Helper
// ============================================

/**
 * Returns the Google favicon service URL for a given page URL.
 * @param {string} url
 * @returns {string}
 */
function getFaviconUrl(url) {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return '';
  }
}

// ============================================
// Renderer
// ============================================

/**
 * Renders the parsed bookmark data into the DOM.
 * @param {{ title: string, sections: Array }} data
 */
function render(data) {
  // Set page title
  const titleEl = document.getElementById('page-title');
  if (titleEl && data.title) {
    titleEl.textContent = data.title;
    document.title = data.title;
  }

  // Set footer edit link
  const footerLink = document.getElementById('footer-edit-link');
  const footerNoLink = document.getElementById('footer-edit-nolink');
  if (data.editUrl && footerLink) {
    footerLink.href = data.editUrl;
    footerLink.style.display = '';
    if (footerNoLink) footerNoLink.style.display = 'none';
  }

  // Render cards
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (const section of data.sections) {
    const card = document.createElement('article');
    card.className = 'card';
    card.style.setProperty('--card-color', section.color);
    card.dataset.section = section.name.toLowerCase();

    const sectionId = section.name.toLowerCase().replace(/\s+/g, '-');
    card.dataset.sectionId = sectionId;

    const header = document.createElement('div');
    header.className = 'card__header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'true');

    const dot = document.createElement('span');
    dot.className = 'card__color-dot';

    const titleH2 = document.createElement('h2');
    titleH2.className = 'card__title';
    titleH2.textContent = section.name;

    const chevron = document.createElement('span');
    chevron.className = 'card__chevron';
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    header.append(dot, titleH2, chevron);

    const linksList = document.createElement('ul');
    linksList.className = 'card__links';

    for (const link of section.links) {
      const li = document.createElement('li');

      const anchor = document.createElement('a');
      anchor.className = 'card__link';
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.dataset.title = link.title.toLowerCase();

      const favicon = document.createElement('img');
      favicon.className = 'card__link-favicon';
      favicon.src = getFaviconUrl(link.url);
      favicon.alt = '';
      favicon.loading = 'lazy';
      favicon.onerror = () => { favicon.style.display = 'none'; };

      const text = document.createElement('span');
      text.className = 'card__link-text';
      text.textContent = link.title;

      anchor.append(favicon, text);
      li.append(anchor);
      linksList.append(li);
    }

    const body = document.createElement('div');
    body.className = 'card__body';
    body.append(linksList);

    card.append(header, body);
    grid.append(card);
  }

  // Apply saved collapse states
  applyCollapseStates();

  // Apply saved card order
  applySavedOrder();
}

// ============================================
// Collapse / Expand Cards
// ============================================

function getCollapseStates() {
  try {
    return JSON.parse(localStorage.getItem('collapsed') || '{}');
  } catch {
    return {};
  }
}

function saveCollapseState(sectionId, collapsed) {
  const states = getCollapseStates();
  if (collapsed) {
    states[sectionId] = true;
  } else {
    delete states[sectionId];
  }
  localStorage.setItem('collapsed', JSON.stringify(states));
}

function applyCollapseStates() {
  const states = getCollapseStates();
  for (const card of document.querySelectorAll('.card')) {
    const id = card.dataset.sectionId;
    if (states[id]) {
      card.classList.add('card--collapsed');
      card.querySelector('.card__header')?.setAttribute('aria-expanded', 'false');
    }
  }
}

function setupCollapse() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const header = e.target.closest('.card__header');
    if (!header) return;

    // Don't collapse if clicking a link inside header (future-proof)
    if (e.target.closest('a')) return;

    const card = header.closest('.card');
    if (!card) return;

    const isCollapsed = card.classList.toggle('card--collapsed');
    header.setAttribute('aria-expanded', String(!isCollapsed));
    saveCollapseState(card.dataset.sectionId, isCollapsed);
  });

  // Keyboard support
  grid.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const header = e.target.closest('.card__header');
      if (header) {
        e.preventDefault();
        header.click();
      }
    }
  });
}

// ============================================
// Lock / Unlock Drag
// ============================================

function applyLockState(locked) {
  dragLocked = locked;
  document.documentElement.classList.toggle('drag-locked', locked);
}

function setupLock() {
  const btn = document.getElementById('lock-btn');
  if (!btn) return;

  const saved = localStorage.getItem('dragLocked');
  applyLockState(saved !== 'false');

  btn.addEventListener('click', () => {
    dragLocked = !dragLocked;
    applyLockState(dragLocked);
    localStorage.setItem('dragLocked', String(dragLocked));
    btn.title = dragLocked ? 'Desbloquear posición' : 'Bloquear posición';
  });
}

// ============================================
// Drag & Drop Reorder
// ============================================

function getSavedOrder() {
  try {
    return JSON.parse(localStorage.getItem('cardOrder') || '[]');
  } catch {
    return [];
  }
}

function saveCurrentOrder() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const order = [...grid.querySelectorAll('.card')].map((c) => c.dataset.sectionId);
  localStorage.setItem('cardOrder', JSON.stringify(order));
}

function applySavedOrder() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  const order = getSavedOrder();
  if (!order.length) return;

  const cards = new Map();
  for (const card of grid.querySelectorAll('.card')) {
    cards.set(card.dataset.sectionId, card);
  }

  for (const id of order) {
    const card = cards.get(id);
    if (card) grid.append(card);
  }
}

function setupDragAndDrop() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  let draggedCard = null;
  let placeholder = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function getCardFromEvent(e) {
    return e.target.closest('.card');
  }

  function createPlaceholder(card) {
    const el = document.createElement('div');
    el.className = 'card card--placeholder';
    el.style.height = `${card.offsetHeight}px`;
    return el;
  }

  function getInsertPosition(grid, y) {
    const cards = [...grid.querySelectorAll('.card:not(.card--dragging):not(.card--placeholder)')];
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        return card;
      }
    }
    return null;
  }

  // --- Pointer-based drag (works for mouse + touch) ---

  function onPointerDown(e) {
    if (dragLocked) return;

    const header = e.target.closest('.card__header');
    if (!header) return;
    // Ignore if clicking links or buttons inside header
    if (e.target.closest('a, button')) return;

    const card = header.closest('.card');
    if (!card) return;

    // Need a small delay / movement threshold to distinguish click from drag
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    function onPointerMove(e2) {
      const dx = e2.clientX - startX;
      const dy = e2.clientY - startY;

      if (!started) {
        // Require 5px movement to start drag
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        started = true;
        startDrag(card, startX, startY);
      }

      moveDrag(e2.clientX, e2.clientY);
    }

    function onPointerUp(e2) {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);

      if (started) {
        endDrag();
      }
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function startDrag(card, x, y) {
    draggedCard = card;
    const rect = card.getBoundingClientRect();
    dragOffsetX = x - rect.left;
    dragOffsetY = y - rect.top;

    placeholder = createPlaceholder(card);
    card.parentNode.insertBefore(placeholder, card);

    card.classList.add('card--dragging');
    card.style.width = `${rect.width}px`;
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;

    document.body.style.userSelect = 'none';
  }

  function moveDrag(x, y) {
    if (!draggedCard) return;

    draggedCard.style.left = `${x - dragOffsetX}px`;
    draggedCard.style.top = `${y - dragOffsetY}px`;

    const insertBefore = getInsertPosition(grid, y);
    if (insertBefore) {
      grid.insertBefore(placeholder, insertBefore);
    } else {
      grid.append(placeholder);
    }
  }

  function endDrag() {
    if (!draggedCard || !placeholder) return;

    // Insert card where placeholder is
    grid.insertBefore(draggedCard, placeholder);
    placeholder.remove();

    draggedCard.classList.remove('card--dragging');
    draggedCard.style.width = '';
    draggedCard.style.left = '';
    draggedCard.style.top = '';

    document.body.style.userSelect = '';

    draggedCard = null;
    placeholder = null;

    saveCurrentOrder();
  }

  grid.addEventListener('pointerdown', onPointerDown);

  // Prevent default drag behavior on images/links inside cards
  grid.addEventListener('dragstart', (e) => e.preventDefault());
}

// ============================================
// Search / Filter
// ============================================

function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.card');

    for (const card of cards) {
      const links = card.querySelectorAll('.card__link');
      let hasVisibleLink = false;

      for (const link of links) {
        const title = link.dataset.title || '';
        const url = link.href || '';
        const matches = !query || title.includes(query) || url.toLowerCase().includes(query);

        link.parentElement.classList.toggle('card__link--hidden', !matches);
        link.classList.toggle('card__link--match', matches && query.length > 0);

        if (matches) hasVisibleLink = true;
      }

      // Also match section name
      const sectionName = card.dataset.section || '';
      if (sectionName.includes(query)) hasVisibleLink = true;

      card.classList.toggle('card--hidden', !hasVisibleLink);
    }
  });

  // Keyboard shortcut: "/" to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
      input.blur();
    }
  });
}

// ============================================
// Theme Toggle
// ============================================

function setupTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // Load saved preference or detect system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.dataset.theme = theme;

  toggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    // Re-apply palette colors for new theme
    const currentPalette = PALETTES[document.documentElement.dataset.palette];
    if (currentPalette) applyPaletteColors(currentPalette);
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
      const currentPalette = PALETTES[document.documentElement.dataset.palette];
      if (currentPalette) applyPaletteColors(currentPalette);
    }
  });
}

// ============================================
// Palette Switcher
// ============================================

const PALETTES = {
  ocean: {
    label: 'Oceano',
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1, #ec4899, #f59e0b)',
    focusColor: '#6366f1',
    focusShadow: 'rgba(99, 102, 241, 0.15)',
    light: { bg: '#eef2ff', surface: '#ffffff', headerBg: 'rgba(238, 242, 255, 0.8)', inputBg: '#e0e7ff' },
    dark:  { bg: '#0f172a', surface: '#1e293b', headerBg: 'rgba(15, 23, 42, 0.85)', inputBg: '#1e1b4b' },
  },
  rose: {
    label: 'Rosa',
    accent: '#e11d48',
    gradient: 'linear-gradient(135deg, #e11d48, #f472b6, #fb923c)',
    focusColor: '#e11d48',
    focusShadow: 'rgba(225, 29, 72, 0.15)',
    light: { bg: '#fff1f2', surface: '#ffffff', headerBg: 'rgba(255, 241, 242, 0.8)', inputBg: '#ffe4e6' },
    dark:  { bg: '#1a0a10', surface: '#2d1520', headerBg: 'rgba(26, 10, 16, 0.85)', inputBg: '#3b0f1e' },
  },
  forest: {
    label: 'Bosque',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #34d399, #fbbf24)',
    focusColor: '#059669',
    focusShadow: 'rgba(5, 150, 105, 0.15)',
    light: { bg: '#ecfdf5', surface: '#ffffff', headerBg: 'rgba(236, 253, 245, 0.8)', inputBg: '#d1fae5' },
    dark:  { bg: '#0a1a14', surface: '#152d23', headerBg: 'rgba(10, 26, 20, 0.85)', inputBg: '#0f3d2a' },
  },
  sunset: {
    label: 'Atardecer',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #ea580c, #f59e0b, #eab308)',
    focusColor: '#ea580c',
    focusShadow: 'rgba(234, 88, 12, 0.15)',
    light: { bg: '#fff7ed', surface: '#ffffff', headerBg: 'rgba(255, 247, 237, 0.8)', inputBg: '#ffedd5' },
    dark:  { bg: '#1a120a', surface: '#2d1f15', headerBg: 'rgba(26, 18, 10, 0.85)', inputBg: '#3b1f0f' },
  },
};

function applyPalette(name) {
  const palette = PALETTES[name];
  if (!palette) return;

  const root = document.documentElement;
  root.style.setProperty('--palette-accent', palette.accent);
  root.style.setProperty('--palette-gradient', palette.gradient);
  root.style.setProperty('--palette-focus-color', palette.focusColor);
  root.style.setProperty('--palette-focus-shadow', palette.focusShadow);
  root.dataset.palette = name;

  // Apply palette background colors based on current theme
  applyPaletteColors(palette);

  // Update active button state
  document.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.classList.toggle('palette-btn--active', btn.dataset.palette === name);
  });
}

function applyPaletteColors(palette) {
  if (!palette) return;
  const root = document.documentElement;
  const isDark = root.dataset.theme === 'dark';
  const colors = isDark ? palette.dark : palette.light;

  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-header-bg', colors.headerBg);
  root.style.setProperty('--color-input-bg', colors.inputBg);
}

function setupPalette() {
  const container = document.getElementById('palette-switcher');
  if (!container) return;

  for (const [name, palette] of Object.entries(PALETTES)) {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.dataset.palette = name;
    btn.setAttribute('aria-label', `Paleta ${palette.label}`);
    btn.title = palette.label;
    btn.style.setProperty('--dot-color', palette.accent);

    btn.addEventListener('click', () => {
      applyPalette(name);
      localStorage.setItem('palette', name);
    });

    container.append(btn);
  }

  const saved = localStorage.getItem('palette') || 'ocean';
  applyPalette(saved);
}

// ============================================
// Reload Config
// ============================================

async function reloadBookmarks() {
  try {
    const response = await fetch(BOOKMARKS_FILE + '?t=' + Date.now());
    if (!response.ok) throw new Error(response.status);
    const markdown = await response.text();
    const data = parseBookmarksMarkdown(markdown);
    render(data);
  } catch (error) {
    console.error('Error recargando bookmarks:', error);
  }
}

function setupReload() {
  const btn = document.getElementById('reload-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.classList.add('header-btn--spin');
    await reloadBookmarks();
    setTimeout(() => btn.classList.remove('header-btn--spin'), 600);
  });
}

// ============================================
// Clock
// ============================================

function setupClock() {
  const el = document.getElementById('clock');
  if (!el) return;

  function update() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  update();
  setInterval(update, 1000);
}

// ============================================
// Init
// ============================================

async function init() {
  setupTheme();
  setupPalette();
  setupLock();
  setupReload();
  setupClock();

  try {
    const response = await fetch(BOOKMARKS_FILE);
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${BOOKMARKS_FILE}: ${response.status}`);
    }

    const markdown = await response.text();
    const data = parseBookmarksMarkdown(markdown);
    render(data);
    setupCollapse();
    setupDragAndDrop();
    setupSearch();
  } catch (error) {
    console.error('Error cargando bookmarks:', error);

    const grid = document.getElementById('grid');
    if (grid) {
      grid.innerHTML = `
        <article class="card" style="--card-color: #ef4444; grid-column: 1 / -1;">
          <div class="card__header">
            <span class="card__color-dot"></span>
            <h2 class="card__title">Error al cargar</h2>
          </div>
          <ul class="card__links">
            <li>
              <span class="card__link">
                <span class="card__link-text">
                  No se pudo cargar el archivo <strong>${BOOKMARKS_FILE}</strong>.
                  Asegúrate de servir la página con un servidor HTTP local.
                </span>
              </span>
            </li>
          </ul>
        </article>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
