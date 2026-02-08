/**
 * Homepage App - Markdown-driven bookmark start page
 * Parses a markdown file and renders categorized bookmark cards.
 */

const BOOKMARKS_FILE = 'bookmarks.md';

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

    const header = document.createElement('div');
    header.className = 'card__header';

    const dot = document.createElement('span');
    dot.className = 'card__color-dot';

    const titleH2 = document.createElement('h2');
    titleH2.className = 'card__title';
    titleH2.textContent = section.name;

    header.append(dot, titleH2);

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

    card.append(header, linksList);
    grid.append(card);
  }
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
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
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
  },
  rose: {
    label: 'Rosa',
    accent: '#e11d48',
    gradient: 'linear-gradient(135deg, #e11d48, #f472b6, #fb923c)',
    focusColor: '#e11d48',
    focusShadow: 'rgba(225, 29, 72, 0.15)',
  },
  forest: {
    label: 'Bosque',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #059669, #34d399, #fbbf24)',
    focusColor: '#059669',
    focusShadow: 'rgba(5, 150, 105, 0.15)',
  },
  sunset: {
    label: 'Atardecer',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #ea580c, #f59e0b, #eab308)',
    focusColor: '#ea580c',
    focusShadow: 'rgba(234, 88, 12, 0.15)',
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

  // Update active button state
  document.querySelectorAll('.palette-btn').forEach((btn) => {
    btn.classList.toggle('palette-btn--active', btn.dataset.palette === name);
  });
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
  setupClock();

  try {
    const response = await fetch(BOOKMARKS_FILE);
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${BOOKMARKS_FILE}: ${response.status}`);
    }

    const markdown = await response.text();
    const data = parseBookmarksMarkdown(markdown);
    render(data);
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
