// Theme toggle functionality
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  if (body.getAttribute('data-theme') === 'dark') {
    body.removeAttribute('data-theme');
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark';
    saveToStorage(STORAGE_KEYS.THEME, 'light');
  } else {
    body.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light';
    saveToStorage(STORAGE_KEYS.THEME, 'dark');
  }
}

// Load saved theme on page load
function loadTheme() {
  const savedTheme = loadFromStorage(STORAGE_KEYS.THEME);
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  if (savedTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark';
  }
}

// Keyboard navigation support
function handleTabKeyNavigation(e, buttons) {
  const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
  let nextIndex;

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      nextIndex = (currentIndex + 1) % buttons.length;
      break;
    case 'ArrowLeft':
      e.preventDefault();
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      break;
    case 'Home':
      e.preventDefault();
      nextIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      nextIndex = buttons.length - 1;
      break;
    default:
      return;
  }

  buttons[nextIndex].focus();
  buttons[nextIndex].click();
}

// Game switching functionality
const gameButtons = document.querySelectorAll('.game-button');
const gameContents = document.querySelectorAll('.game-content');

// Marks one game (and, in the sidebar, its toc-game wrapper) active. Doesn't
// touch tab state - callers decide whether to reset or preserve it.
function activateGame(gameId) {
  gameButtons.forEach(btn => {
    const isMatch = btn.dataset.game === gameId;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-selected', String(isMatch));
    const tocGame = btn.closest('.toc-game');
    if (tocGame) {
      tocGame.classList.toggle('active', isMatch);
    }
  });
  gameContents.forEach(content => {
    content.classList.toggle('active', content.id === gameId);
  });
}

gameButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetGame = button.dataset.game;

    activateGame(targetGame);

    // Reset tabs to first tab for the selected game
    resetTabsForGame(targetGame);

    // Update URL and save preferences
    updateURL(targetGame);
    saveToStorage(STORAGE_KEYS.LAST_GAME, targetGame);
    saveToStorage(STORAGE_KEYS.LAST_TAB, null);
    trackRecentSection(targetGame, null);
  });

  // Add keyboard navigation
  button.addEventListener('keydown', (e) => {
    handleTabKeyNavigation(e, gameButtons);
  });
});

// Tab functionality. Tab buttons live in the sidebar (tagged with data-game),
// not nested inside their game's <article>, so they're looked up by that
// attribute rather than by DOM ancestry.
function resetTabsForGame(gameId) {
  const gameContent = document.getElementById(gameId);
  const tabButtons = document.querySelectorAll(`.tab-button[data-game="${gameId}"]`);
  const tabContents = gameContent.querySelectorAll('.tab-content');

  tabButtons.forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('tabindex', '-1');
  });
  tabContents.forEach(content => content.classList.remove('active'));

  if (tabButtons.length > 0) {
    tabButtons[0].classList.add('active');
    tabButtons[0].setAttribute('aria-selected', 'true');
    tabButtons[0].setAttribute('tabindex', '0');
    const firstTabId = tabButtons[0].dataset.tab;
    const firstTabContent = document.getElementById(firstTabId);
    if (firstTabContent) {
      firstTabContent.classList.add('active');
    }
  }
}

// Add click handlers for all tab buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab-button')) {
    const targetTab = e.target.dataset.tab;
    const gameId = e.target.dataset.game;
    const gameContent = document.getElementById(gameId);

    // Update active tab button and aria attributes
    document.querySelectorAll(`.tab-button[data-game="${gameId}"]`).forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    e.target.classList.add('active');
    e.target.setAttribute('aria-selected', 'true');
    e.target.setAttribute('tabindex', '0');

    // Update active tab content
    gameContent.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
      targetContent.classList.add('active');

      // Update URL and save preferences
      updateURL(targetTab);
      saveToStorage(STORAGE_KEYS.LAST_GAME, gameId);
      saveToStorage(STORAGE_KEYS.LAST_TAB, targetTab);
      trackRecentSection(gameId, targetTab);
    }
  }
});

// Add keyboard navigation for tab buttons
document.addEventListener('keydown', (e) => {
  if (e.target.classList.contains('tab-button')) {
    const gameId = e.target.dataset.game;
    const tabButtons = document.querySelectorAll(`.tab-button[data-game="${gameId}"]`);
    handleTabKeyNavigation(e, tabButtons);
  }
});

// Make section titles keyboard accessible
document.addEventListener('keydown', (e) => {
  if (e.target.classList.contains('section-title') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    e.target.click();
  }
});

// Collapsible sections
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('section-title')) {
    const sectionContent = e.target.nextElementSibling;
    const isCollapsed = sectionContent.classList.contains('collapsed');

    if (isCollapsed) {
      sectionContent.classList.remove('collapsed');
      e.target.classList.remove('collapsed');
    } else {
      sectionContent.classList.add('collapsed');
      e.target.classList.add('collapsed');
    }

    // Save collapsed state
    saveCollapsedSections();
  }
});

// Search functionality
const searchBox = document.getElementById('searchBox');
const quickRef = document.getElementById('quickRef');

searchBox.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();

  if (searchTerm.length > 2) {
    performSearch(searchTerm);
    quickRef.classList.add('show');
  } else {
    quickRef.classList.remove('show');
  }
});

// Closing the search results: an explicit close button, Escape, or a click
// outside the panel/search box all dismiss it without touching the query.
document.getElementById('quickRefClose').addEventListener('click', () => {
  quickRef.classList.remove('show');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && quickRef.classList.contains('show')) {
    quickRef.classList.remove('show');
  }
});

document.addEventListener('click', (e) => {
  if (quickRef.classList.contains('show') &&
      !quickRef.contains(e.target) &&
      e.target !== searchBox) {
    quickRef.classList.remove('show');
  }
});

let searchFilters = { game: 'all', type: 'all' };
let lastSearchResults = [];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function performSearch(searchTerm) {
  const results = [];

  // Different types of content to search. 'rules' and 'faq' both look at
  // .subsection content, so they're split by tab id (*-faq vs everything
  // else) rather than by selector, to avoid double-counting every match.
  const searchableElements = {
    'rules': '.tab-content:not([id$="-faq"]) .subsection p, .tab-content:not([id$="-faq"]) .subsection li, .tab-content:not([id$="-faq"]) .subsection-title',
    'cards': '.card-name, .card p',
    'scenarios': '.scenario-box p, .scenario-title',
    'faq': '.tab-content[id$="-faq"] .subsection p, .tab-content[id$="-faq"] .subsection li'
  };

  Object.keys(searchableElements).forEach(type => {
    const elements = document.querySelectorAll(searchableElements[type]);

    elements.forEach(element => {
      if (element.textContent.toLowerCase().includes(searchTerm)) {
        const gameContent = element.closest('.game-content');
        const tabContent = element.closest('.tab-content');
        const gameName = gameContent ? formatGameName(gameContent.id) : '';
        const tabName = tabContent ? formatTabName(tabContent.id) : '';

        // Apply filters
        if (searchFilters.game !== 'all' && gameContent && gameContent.id !== searchFilters.game) {
          return;
        }

        if (searchFilters.type !== 'all' && type !== searchFilters.type) {
          return;
        }

        const highlightedText = highlightSearchTerm(element.textContent, searchTerm);

        results.push({
          text: truncateText(highlightedText, 120),
          game: gameName,
          tab: tabName,
          type: type,
          gameId: gameContent ? gameContent.id : null,
          tabId: tabContent ? tabContent.id : null
        });
      }
    });
  });

  displaySearchResults(results, searchTerm);
}

// Game/tab display names are read straight from the buttons that define
// them, so there is a single source of truth instead of a hand-maintained map.
function formatGameName(gameId) {
  const button = document.querySelector(`.game-button[data-game="${gameId}"]`);
  return button ? button.dataset.gameName : gameId;
}

function formatTabName(tabId) {
  const button = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  return button ? button.textContent.trim() : tabId;
}

function highlightSearchTerm(text, term) {
  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function displaySearchResults(results, searchTerm) {
  const searchStats = document.getElementById('searchStats');
  const quickRefContent = document.getElementById('quickRefContent');

  lastSearchResults = results;

  // Update stats (textContent, not innerHTML: searchTerm is untrusted user input)
  searchStats.textContent = `Found ${results.length} result(s) for "${searchTerm}"`;

  // Generate filters
  generateSearchFilters(results);

  if (results.length === 0) {
    quickRefContent.innerHTML = '<p>No results found. Try different keywords or check your filters.</p>';
    return;
  }

  let html = '';
  results.slice(0, 8).forEach((result, index) => {
    html += `
      <div class="search-result-item" data-result-index="${index}">
        <div class="search-result-game">${result.game}${result.tab ? ' → ' + result.tab : ''}</div>
        <div class="search-result-text">${result.text}</div>
      </div>
    `;
  });

  if (results.length > 8) {
    html += `<p style="text-align: center; margin-top: 10px; color: var(--text-secondary); font-size: 0.8em;">Showing 8 of ${results.length} results</p>`;
  }

  quickRefContent.innerHTML = html;
}

function generateSearchFilters(results) {
  const searchFiltersEl = document.getElementById('searchFilters');
  const games = [...new Set(results.map(r => r.gameId).filter(Boolean))];
  const types = [...new Set(results.map(r => r.type))];

  let filtersHTML = `
    <div class="search-filter ${searchFilters.game === 'all' ? 'active' : ''}" data-filter-type="game" data-filter-value="all">All Games</div>
  `;

  games.forEach(gameId => {
    const gameName = formatGameName(gameId);
    filtersHTML += `
      <div class="search-filter ${searchFilters.game === gameId ? 'active' : ''}" data-filter-type="game" data-filter-value="${gameId}">${gameName}</div>
    `;
  });

  filtersHTML += `
    <div class="search-filter ${searchFilters.type === 'all' ? 'active' : ''}" data-filter-type="type" data-filter-value="all">All Types</div>
  `;

  types.forEach(type => {
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    filtersHTML += `
      <div class="search-filter ${searchFilters.type === type ? 'active' : ''}" data-filter-type="type" data-filter-value="${type}">${typeName}</div>
    `;
  });

  searchFiltersEl.innerHTML = filtersHTML;
}

function setSearchFilter(filterType, value) {
  searchFilters[filterType] = value;
  saveToStorage(STORAGE_KEYS.SEARCH_FILTERS, searchFilters);
  const searchTerm = searchBox.value.toLowerCase();
  if (searchTerm.length > 2) {
    performSearch(searchTerm);
  }
}

function navigateToResult(gameId, tabId) {
  if (!gameId) return;

  // Close search results
  quickRef.classList.remove('show');
  searchBox.value = '';

  // Navigate to the game
  const gameButton = document.querySelector(`[data-game="${gameId}"]`);
  if (gameButton) {
    gameButton.click();

    // Navigate to specific tab if provided
    if (tabId) {
      setTimeout(() => {
        const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (tabButton) {
          tabButton.click();
        }
      }, 100);
    }
  }
}

// Delegated clicks for the dynamically generated search filters and results
// (avoids inline onclick="" handlers in generated markup)
document.addEventListener('click', (e) => {
  const filterEl = e.target.closest('.search-filter');
  if (filterEl) {
    setSearchFilter(filterEl.dataset.filterType, filterEl.dataset.filterValue);
    return;
  }

  const resultEl = e.target.closest('.search-result-item');
  if (resultEl) {
    const result = lastSearchResults[Number(resultEl.dataset.resultIndex)];
    if (result) {
      navigateToResult(result.gameId, result.tabId);
    }
  }
});

// Initialize first game tabs
resetTabsForGame('unstable-unicorns');

// URL hash routing for deep linking. Matched against the actual data-game/
// data-tab attributes present in the DOM rather than assumed word counts,
// since game ids are not all two hyphenated words (e.g. "hearts").
function handleRouting() {
  const hash = window.location.hash.substr(1); // Remove the # symbol
  if (!hash) return;

  const tabButton = document.querySelector(`.tab-button[data-tab="${hash}"]`);
  if (tabButton) {
    const gameButton = document.querySelector(`.game-button[data-game="${tabButton.dataset.game}"]`);
    if (gameButton) {
      gameButton.click();
      setTimeout(() => tabButton.click(), 100); // Small delay to ensure game content is loaded
    }
    return;
  }

  const gameButton = document.querySelector(`.game-button[data-game="${hash}"]`);
  if (gameButton) {
    gameButton.click();
  }
}

// Update URL when changing games or tabs
function updateURL(gameId, tabId = null) {
  const hash = tabId ? `#${tabId}` : `#${gameId}`;
  window.history.replaceState(null, null, hash);
}

// Local Storage Management
const STORAGE_KEYS = {
  THEME: 'boardgames_theme',
  LAST_GAME: 'boardgames_last_game',
  LAST_TAB: 'boardgames_last_tab',
  RECENT_SECTIONS: 'boardgames_recent_sections',
  COLLAPSED_SECTIONS: 'boardgames_collapsed_sections',
  SEARCH_FILTERS: 'boardgames_search_filters'
};

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn('Failed to load from localStorage:', e);
    return defaultValue;
  }
}

function trackRecentSection(gameId, tabId) {
  const recentSections = loadFromStorage(STORAGE_KEYS.RECENT_SECTIONS, []);
  const sectionKey = `${gameId}:${tabId || 'main'}`;

  // Remove if exists and add to front
  const filtered = recentSections.filter(s => s.key !== sectionKey);
  filtered.unshift({
    key: sectionKey,
    gameId: gameId,
    tabId: tabId,
    gameName: formatGameName(gameId),
    tabName: tabId ? formatTabName(tabId) : 'Overview',
    timestamp: Date.now()
  });

  // Keep only last 10
  const limited = filtered.slice(0, 10);
  saveToStorage(STORAGE_KEYS.RECENT_SECTIONS, limited);
}

function restoreCollapsedSections() {
  const collapsedSections = loadFromStorage(STORAGE_KEYS.COLLAPSED_SECTIONS, []);
  collapsedSections.forEach(sectionId => {
    const sectionTitle = document.getElementById(sectionId);
    if (sectionTitle) {
      const sectionContent = sectionTitle.nextElementSibling;
      if (sectionContent) {
        sectionContent.classList.add('collapsed');
        sectionTitle.classList.add('collapsed');
      }
    }
  });
}

function saveCollapsedSections() {
  const collapsedSections = [];
  document.querySelectorAll('.section-title.collapsed').forEach(title => {
    if (title.id) {
      collapsedSections.push(title.id);
    }
  });
  saveToStorage(STORAGE_KEYS.COLLAPSED_SECTIONS, collapsedSections);
}

function loadLastVisited() {
  if (!window.location.hash) {
    const lastGame = loadFromStorage(STORAGE_KEYS.LAST_GAME);
    const lastTab = loadFromStorage(STORAGE_KEYS.LAST_TAB);

    if (lastGame) {
      const gameButton = document.querySelector(`[data-game="${lastGame}"]`);
      if (gameButton) {
        gameButton.click();

        if (lastTab) {
          setTimeout(() => {
            const tabButton = document.querySelector(`[data-tab="${lastTab}"]`);
            if (tabButton) {
              tabButton.click();
            }
          }, 100);
        }
      }
    }
  }
}

// Load saved preferences
searchFilters = loadFromStorage(STORAGE_KEYS.SEARCH_FILTERS, { game: 'all', type: 'all' });

// Load saved theme
loadTheme();

// Handle initial routing or load last visited
if (window.location.hash) {
  handleRouting();
} else {
  loadLastVisited();
}

// Restore collapsed sections after a short delay
setTimeout(restoreCollapsedSections, 200);

// Listen for hash changes
window.addEventListener('hashchange', handleRouting);

// Mobile responsive quick reference
function toggleQuickRef() {
  if (window.innerWidth <= 768) {
    quickRef.style.position = 'relative';
    quickRef.style.top = 'auto';
    quickRef.style.right = 'auto';
  } else {
    quickRef.style.position = 'fixed';
    quickRef.style.top = '20px';
    quickRef.style.right = '20px';
  }
}

window.addEventListener('resize', toggleQuickRef);
toggleQuickRef(); // Initial call
