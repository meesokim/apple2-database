// index.js - Application logic for Apple II Database search page

// State Management
let database = [];
let filteredData = [];
let currentPage = 1;
let itemsPerPage = 50;
let currentView = 'list'; // 'grid' or 'list'

// DOM Elements
const searchInput = document.getElementById('search-input');
const systemSelect = document.getElementById('filter-system');
const categorySelect = document.getElementById('filter-category');
const publisherSelect = document.getElementById('filter-publisher');
const yearSelect = document.getElementById('filter-year');
const excludeClonesCheck = document.getElementById('filter-exclude-clones');
const supportedOnlyCheck = document.getElementById('filter-supported-only');
const sortBySelect = document.getElementById('sort-by');
const resultsContainer = document.getElementById('results-container');
const resultsCountVal = document.getElementById('results-count-val');
const paginationContainer = document.getElementById('pagination-container');
const viewGridBtn = document.getElementById('view-grid-btn');
const viewListBtn = document.getElementById('view-list-btn');

// Stats DOM Elements
const statTotal = document.getElementById('stat-total');
const statApple1 = document.getElementById('stat-apple1');
const statApple2 = document.getElementById('stat-apple2');
const statApple2gs = document.getElementById('stat-apple2gs');
const statApple3 = document.getElementById('stat-apple3');
const statCassettes = document.getElementById('stat-cassettes');
const statFloppies = document.getElementById('stat-floppies');
const statRoms = document.getElementById('stat-roms');

// Modal DOM Elements
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalAltTitle = document.getElementById('modal-alt-title');
const modalBadgeSystem = document.getElementById('modal-badge-system');
const modalBadgeCategory = document.getElementById('modal-badge-category');
const modalId = document.getElementById('modal-id');
const modalYear = document.getElementById('modal-year');
const modalPublisher = document.getElementById('modal-publisher');
const modalSerial = document.getElementById('modal-serial');
const modalCompatibility = document.getElementById('modal-compatibility');
const modalCloneOf = document.getElementById('modal-cloneof');
const modalSupported = document.getElementById('modal-supported');
const modalDbFile = document.getElementById('modal-dbfile');
const modalDbDesc = document.getElementById('modal-dbdesc');
const modalNotes = document.getElementById('modal-notes');
const modalNotesContainer = document.getElementById('modal-notes-container');
const modalPartsContainer = document.getElementById('modal-parts-container');
const copyToast = document.getElementById('copy-toast');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  if (typeof APPLE2_RAW_DATA === 'undefined') {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
        <h2>데이터 파일을 찾을 수 없습니다</h2>
        <p>apple2_data.js 파일이 올바르게 생성되었는지 확인해주세요.</p>
      </div>
    `;
    return;
  }

  // Decompress/Map raw data
  database = APPLE2_RAW_DATA.map(item => ({
    id: item.i || '',
    title: item.t || '',
    ko_title: item.kt || null,
    year: item.y || 'Unknown',
    publisher: item.p || 'Unknown',
    system: item.s || 'Apple II',
    category: item.c || 'Other',
    cloneof: item.cl || null,
    supported: item.sp || 'yes',
    alt_title: item.a || null,
    serial: item.sr || null,
    usage: item.u || null,
    notes: item.n || null,
    shared_features: item.shf || {},
    parts: item.pt ? item.pt.map(p => ({
      name: p.n || '',
      interface: p.i || '',
      features: p.f || {},
      roms: p.r ? p.r.map(r => ({
        name: r.n || '',
        size: r.sz || '',
        crc: r.c || '',
        sha1: r.sh || '',
        status: r.st || 'good'
      })) : []
    })) : [],
    db_file: item.df || '',
    db_desc: item.dd || '',
    screenshot: item.sf || null,
    youtube: item.yt || null
  }));

  initFilters();
  computeStats();
  applyFiltersAndSearch();
  setupEventListeners();
  initThemeToggle();
});

// Calculate statistics and render dashboard
function computeStats() {
  const total = database.length;
  
  let apple1 = 0, apple2 = 0, apple2gs = 0, apple3 = 0;
  let cass = 0, flop = 0, rom = 0, other = 0;

  database.forEach(item => {
    // Systems
    if (item.system === 'Apple I') apple1++;
    else if (item.system === 'Apple II') apple2++;
    else if (item.system === 'Apple IIgs') apple2gs++;
    else if (item.system === 'Apple III') apple3++;

    // Categories
    if (item.category === 'Cassette') cass++;
    else if (item.category.includes('Floppy')) flop++;
    else if (item.category === 'ROM') rom++;
    else other++;
  });

  // Set values in DOM
  statTotal.textContent = total.toLocaleString();
  statApple1.textContent = apple1.toLocaleString();
  statApple2.textContent = apple2.toLocaleString();
  statApple2gs.textContent = apple2gs.toLocaleString();
  statApple3.textContent = apple3.toLocaleString();
  statCassettes.textContent = cass.toLocaleString();
  statFloppies.textContent = flop.toLocaleString();
  statRoms.textContent = rom.toLocaleString();

  // Set progress bars
  setProgressBar('pb-apple1', apple1, total);
  setProgressBar('pb-apple2', apple2, total);
  setProgressBar('pb-apple2gs', apple2gs, total);
  setProgressBar('pb-apple3', apple3, total);
  setProgressBar('pb-cass', cass, total);
  setProgressBar('pb-flop', flop, total);
  setProgressBar('pb-rom', rom, total);
}

function setProgressBar(id, value, total) {
  const bar = document.getElementById(id);
  if (bar) {
    const pct = ((value / total) * 100).toFixed(1);
    bar.style.width = `${pct}%`;
  }
}

// Initialize dynamic dropdown filter choices
function initFilters() {
  const publishers = new Set();
  const years = new Set();

  database.forEach(item => {
    if (item.publisher && item.publisher !== 'Unknown' && item.publisher !== '?') {
      publishers.add(item.publisher.trim());
    }
    if (item.year && item.year !== 'Unknown' && item.year !== '????') {
      years.add(item.year.trim());
    }
  });

  // Populate Publisher Select
  const sortedPubs = Array.from(publishers).sort((a, b) => a.localeCompare(b));
  sortedPubs.forEach(pub => {
    const opt = document.createElement('option');
    opt.value = pub;
    opt.textContent = pub;
    publisherSelect.appendChild(opt);
  });

  // Populate Year Select
  const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending order
  sortedYears.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    yearSelect.appendChild(opt);
  });
}

// Setup interactive event handlers
function setupEventListeners() {
  // Real-time search-as-you-type with debouncer
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      applyFiltersAndSearch();
    }, 150);
  });

  // Filters change
  const filterInputs = [
    systemSelect,
    categorySelect,
    publisherSelect,
    yearSelect,
    excludeClonesCheck,
    supportedOnlyCheck,
    sortBySelect
  ];

  filterInputs.forEach(input => {
    input.addEventListener('change', () => {
      currentPage = 1;
      applyFiltersAndSearch();
    });
  });

  // View Switchers
  viewGridBtn.addEventListener('click', () => {
    if (currentView !== 'grid') {
      currentView = 'grid';
      viewGridBtn.classList.add('active');
      viewListBtn.classList.remove('active');
      renderResults();
    }
  });

  viewListBtn.addEventListener('click', () => {
    if (currentView !== 'list') {
      currentView = 'list';
      viewListBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      renderResults();
    }
  });

  // Modal handlers
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  
  // Keyboard ESC close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeModal();
    }
  });
}

// Update options dynamically and disable those with 0 results
function updateFilterOptions() {
  const query = searchInput.value.toLowerCase().trim();
  const systemFilter = systemSelect.value;
  const categoryFilter = categorySelect.value;
  const publisherFilter = publisherSelect.value;
  const yearFilter = yearSelect.value;
  const excludeClones = excludeClonesCheck.checked;
  const supportedOnly = supportedOnlyCheck.checked;

  // Base matcher (query text, clones, support constraints)
  function matchesBase(item) {
    if (query) {
      const matchText = 
        item.title.toLowerCase().includes(query) ||
        (item.ko_title && item.ko_title.toLowerCase().includes(query)) ||
        item.id.toLowerCase().includes(query) ||
        (item.alt_title && item.alt_title.toLowerCase().includes(query)) ||
        (item.serial && item.serial.toLowerCase().includes(query)) ||
        item.publisher.toLowerCase().includes(query) ||
        item.parts.some(p => 
          p.roms.some(r => 
            r.name.toLowerCase().includes(query) ||
            r.crc.toLowerCase().includes(query) ||
            r.sha1.toLowerCase().includes(query)
          )
        );
      if (!matchText) return false;
    }
    if (excludeClones && item.cloneof) return false;
    if (supportedOnly && item.supported === 'no') return false;
    return true;
  }

  // 1. SYSTEM SELECT OPTIONS
  const subsetForSystem = database.filter(item => {
    if (!matchesBase(item)) return false;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Floppy') {
        if (!item.category.includes('Floppy')) return false;
      } else {
        if (item.category !== categoryFilter) return false;
      }
    }
    if (publisherFilter !== 'all' && item.publisher !== publisherFilter) return false;
    if (yearFilter !== 'all' && item.year !== yearFilter) return false;
    return true;
  });

  const systemCounts = {};
  subsetForSystem.forEach(item => {
    systemCounts[item.system] = (systemCounts[item.system] || 0) + 1;
  });

  Array.from(systemSelect.options).forEach(opt => {
    if (opt.value === 'all') {
      opt.textContent = `전체보기 (All Systems) (${subsetForSystem.length})`;
      opt.disabled = false;
    } else {
      const count = systemCounts[opt.value] || 0;
      const baseLabel = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s\(\d+\)$/, '');
      if (!opt.hasAttribute('data-base-label')) {
        opt.setAttribute('data-base-label', baseLabel);
      }
      opt.textContent = `${baseLabel} (${count})`;
      opt.disabled = (count === 0 && opt.value !== systemFilter);
    }
  });

  // 2. CATEGORY SELECT OPTIONS
  const subsetForCategory = database.filter(item => {
    if (!matchesBase(item)) return false;
    if (systemFilter !== 'all' && item.system !== systemFilter) return false;
    if (publisherFilter !== 'all' && item.publisher !== publisherFilter) return false;
    if (yearFilter !== 'all' && item.year !== yearFilter) return false;
    return true;
  });

  const categoryCounts = {};
  subsetForCategory.forEach(item => {
    const cat = item.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    if (cat.includes('Floppy')) {
      categoryCounts['Floppy'] = (categoryCounts['Floppy'] || 0) + 1;
    }
  });

  Array.from(categorySelect.options).forEach(opt => {
    if (opt.value === 'all') {
      opt.textContent = `전체보기 (All Media) (${subsetForCategory.length})`;
      opt.disabled = false;
    } else {
      const count = categoryCounts[opt.value] || 0;
      const baseLabel = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s\(\d+\)$/, '');
      if (!opt.hasAttribute('data-base-label')) {
        opt.setAttribute('data-base-label', baseLabel);
      }
      opt.textContent = `${baseLabel} (${count})`;
      opt.disabled = (count === 0 && opt.value !== categoryFilter);
    }
  });

  // 3. PUBLISHER SELECT OPTIONS
  const subsetForPublisher = database.filter(item => {
    if (!matchesBase(item)) return false;
    if (systemFilter !== 'all' && item.system !== systemFilter) return false;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Floppy') {
        if (!item.category.includes('Floppy')) return false;
      } else {
        if (item.category !== categoryFilter) return false;
      }
    }
    if (yearFilter !== 'all' && item.year !== yearFilter) return false;
    return true;
  });

  const publisherCounts = {};
  subsetForPublisher.forEach(item => {
    publisherCounts[item.publisher] = (publisherCounts[item.publisher] || 0) + 1;
  });

  Array.from(publisherSelect.options).forEach(opt => {
    if (opt.value === 'all') {
      opt.textContent = `전체보기 (All Publishers) (${subsetForPublisher.length})`;
      opt.disabled = false;
    } else {
      const count = publisherCounts[opt.value] || 0;
      const baseLabel = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s\(\d+\)$/, '');
      if (!opt.hasAttribute('data-base-label')) {
        opt.setAttribute('data-base-label', baseLabel);
      }
      opt.textContent = `${baseLabel} (${count})`;
      opt.disabled = (count === 0 && opt.value !== publisherFilter);
    }
  });

  // 4. YEAR SELECT OPTIONS
  const subsetForYear = database.filter(item => {
    if (!matchesBase(item)) return false;
    if (systemFilter !== 'all' && item.system !== systemFilter) return false;
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Floppy') {
        if (!item.category.includes('Floppy')) return false;
      } else {
        if (item.category !== categoryFilter) return false;
      }
    }
    if (publisherFilter !== 'all' && item.publisher !== publisherFilter) return false;
    return true;
  });

  const yearCounts = {};
  subsetForYear.forEach(item => {
    yearCounts[item.year] = (yearCounts[item.year] || 0) + 1;
  });

  Array.from(yearSelect.options).forEach(opt => {
    if (opt.value === 'all') {
      opt.textContent = `전체보기 (All Years) (${subsetForYear.length})`;
      opt.disabled = false;
    } else {
      const count = yearCounts[opt.value] || 0;
      const baseLabel = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s\(\d+\)$/, '');
      if (!opt.hasAttribute('data-base-label')) {
        opt.setAttribute('data-base-label', baseLabel);
      }
      opt.textContent = `${baseLabel} (${count})`;
      opt.disabled = (count === 0 && opt.value !== yearFilter);
    }
  });
}

// Filter, Search, and Sort
function applyFiltersAndSearch() {
  updateFilterOptions();

  const query = searchInput.value.toLowerCase().trim();
  const systemFilter = systemSelect.value;
  const categoryFilter = categorySelect.value;
  const publisherFilter = publisherSelect.value;
  const yearFilter = yearSelect.value;
  const excludeClones = excludeClonesCheck.checked;
  const supportedOnly = supportedOnlyCheck.checked;
  const sortBy = sortBySelect.value;

  filteredData = database.filter(item => {
    // 1. Text Query
    if (query) {
      const matchText = 
        item.title.toLowerCase().includes(query) ||
        (item.ko_title && item.ko_title.toLowerCase().includes(query)) ||
        item.id.toLowerCase().includes(query) ||
        (item.alt_title && item.alt_title.toLowerCase().includes(query)) ||
        (item.serial && item.serial.toLowerCase().includes(query)) ||
        item.publisher.toLowerCase().includes(query) ||
        item.parts.some(p => 
          p.roms.some(r => 
            r.name.toLowerCase().includes(query) ||
            r.crc.toLowerCase().includes(query) ||
            r.sha1.toLowerCase().includes(query)
          )
        );
      if (!matchText) return false;
    }

    // 2. Select Filters
    if (systemFilter !== 'all' && item.system !== systemFilter) return false;
    
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'Floppy') {
        if (!item.category.includes('Floppy')) return false;
      } else {
        if (item.category !== categoryFilter) return false;
      }
    }
    
    if (publisherFilter !== 'all' && item.publisher !== publisherFilter) return false;
    if (yearFilter !== 'all' && item.year !== yearFilter) return false;
    
    // 3. Binary checkboxes
    if (excludeClones && item.cloneof) return false;
    if (supportedOnly && item.supported === 'no') return false;

    return true;
  });

  // Sorting
  if (sortBy === 'title-asc') {
    filteredData.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'title-desc') {
    filteredData.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortBy === 'year-desc') {
    filteredData.sort((a, b) => {
      if (a.year === 'Unknown') return 1;
      if (b.year === 'Unknown') return -1;
      return b.year.localeCompare(a.year) || a.title.localeCompare(b.title);
    });
  } else if (sortBy === 'year-asc') {
    filteredData.sort((a, b) => {
      if (a.year === 'Unknown') return 1;
      if (b.year === 'Unknown') return -1;
      return a.year.localeCompare(b.year) || a.title.localeCompare(b.title);
    });
  } else if (sortBy === 'publisher-asc') {
    filteredData.sort((a, b) => a.publisher.localeCompare(b.publisher) || a.title.localeCompare(b.title));
  }

  resultsCountVal.textContent = filteredData.length.toLocaleString();
  renderResults();
}

// Render paginated items
function renderResults() {
  resultsContainer.innerHTML = '';
  
  if (filteredData.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h2>검색 결과가 없습니다</h2>
        <p>검색어나 필터 조건을 변경해 보세요.</p>
      </div>
    `;
    paginationContainer.innerHTML = '';
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
  const pageItems = filteredData.slice(startIndex, endIndex);

  if (currentView === 'grid') {
    renderGrid(pageItems);
  } else {
    renderList(pageItems);
  }

  renderPagination(filteredData.length);
}

// Render grid view (cards)
function renderGrid(items) {
  const grid = document.createElement('div');
  grid.className = 'results-grid';

  items.forEach(item => {
    const sysClass = getSystemClass(item.system);
    const hasClone = item.cloneof ? `<span class="clone-badge">Clone</span>` : '';
    const hasScreenshot = item.screenshot ? `<i class="fa-regular fa-image" style="color: var(--accent-cyan); margin-left: 0.35rem;" title="스크린샷 있음"></i>` : '';
    const hasVideo = item.youtube ? `<i class="fa-brands fa-youtube" style="color: #ff0000; margin-left: 0.35rem; font-size: 1.05em; vertical-align: middle;" title="플레이 영상 있음"></i>` : '';
    
    // Choose main title (Korean if translated, else English)
    let mainTitle = item.title;
    let subTitles = [];
    if (item.ko_title) {
      mainTitle = item.ko_title;
      subTitles.push(item.title);
    }
    if (item.alt_title) {
      subTitles.push(item.alt_title);
    }
    
    const subTitleHtml = subTitles.length > 0 
      ? `<span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: -0.15rem; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${subTitles.join(' / ')}">${subTitles.join(' / ')}</span>`
      : '';
    
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="system-badge ${sysClass}">${item.system}</span>
          <span class="category-badge">${item.category}</span>
        </div>
        <h3 class="game-title" title="${mainTitle}">${mainTitle}${hasScreenshot}${hasVideo}</h3>
        ${subTitleHtml}
        <div class="game-publisher" title="${item.publisher}">${item.publisher}</div>
        <div class="game-year-serial">
          <span>${item.year}</span>
          <span>${item.serial || ''}</span>
        </div>
      </div>
      <div class="card-bottom">
        ${hasClone}
        <button class="btn btn-cyan btn-sm btn-detail" data-id="${item.id}">상세 보기</button>
      </div>
    `;
    
    // Details button click event
    card.querySelector('.btn-detail').addEventListener('click', () => {
      showDetails(item.id);
    });

    grid.appendChild(card);
  });

  resultsContainer.appendChild(grid);
}

// Render list view (table)
function renderList(items) {
  const container = document.createElement('div');
  container.className = 'results-table-container';

  let tableHtml = `
    <table class="results-table">
      <thead>
        <tr>
          <th>시스템</th>
          <th>분류</th>
          <th>소프트웨어 제목</th>
          <th>제작사/출판사</th>
          <th>연도</th>
          <th>시리얼 번호</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach(item => {
    const sysClass = getSystemClass(item.system);
    const cloneLabel = item.cloneof ? ` <span class="clone-badge" style="font-size:0.6rem;">Clone</span>` : '';
    const hasScreenshot = item.screenshot ? `<i class="fa-regular fa-image" style="color: var(--accent-cyan); margin-left: 0.35rem;" title="스크린샷 있음"></i>` : '';
    const hasVideo = item.youtube ? `<i class="fa-brands fa-youtube" style="color: #ff0000; margin-left: 0.35rem; font-size: 1.05em; vertical-align: middle;" title="플레이 영상 있음"></i>` : '';
    
    // Choose main title (Korean if translated, else English)
    let mainTitle = item.title;
    let subTitles = [];
    if (item.ko_title) {
      mainTitle = item.ko_title;
      subTitles.push(item.title);
    }
    if (item.alt_title) {
      subTitles.push(item.alt_title);
    }
    
    tableHtml += `
      <tr class="table-row-clickable" data-id="${item.id}">
        <td><span class="system-badge ${sysClass}">${item.system}</span></td>
        <td><span class="category-badge">${item.category}</span></td>
        <td>
          <div class="table-title" title="${mainTitle}">${mainTitle}${cloneLabel}${hasScreenshot}${hasVideo}</div>
          ${subTitles.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${subTitles.join(' / ')}</div>` : ''}
        </td>
        <td>${item.publisher}</td>
        <td class="table-mono">${item.year}</td>
        <td class="table-mono">${item.serial || '-'}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  container.innerHTML = tableHtml;

  // Add click handlers for clickable rows in table
  container.querySelectorAll('.table-row-clickable').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      showDetails(id);
    });
  });

  resultsContainer.appendChild(container);
}

// System tag custom classes helper
function getSystemClass(system) {
  switch (system) {
    case 'Apple I': return 'sys-apple1';
    case 'Apple II': return 'sys-apple2';
    case 'Apple IIgs': return 'sys-apple2gs';
    case 'Apple III': return 'sys-apple3';
    default: return 'sys-other';
  }
}

// Generate pagination controls
function renderPagination(totalItems) {
  paginationContainer.innerHTML = '';
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return;

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    currentPage--;
    renderResults();
    window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
  };
  paginationContainer.appendChild(prevBtn);

  // First page & dots
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.className = 'page-btn';
    firstBtn.textContent = '1';
    firstBtn.onclick = () => {
      currentPage = 1;
      renderResults();
      window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
    };
    paginationContainer.appendChild(firstBtn);

    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.className = 'page-info';
      dots.textContent = '...';
      paginationContainer.appendChild(dots);
    }
  }

  // Page Numbers
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderResults();
      window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
    };
    paginationContainer.appendChild(btn);
  }

  // Last page & dots
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'page-info';
      dots.textContent = '...';
      paginationContainer.appendChild(dots);
    }

    const lastBtn = document.createElement('button');
    lastBtn.className = 'page-btn';
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => {
      currentPage = totalPages;
      renderResults();
      window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
    };
    paginationContainer.appendChild(lastBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    currentPage++;
    renderResults();
    window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
  };
  paginationContainer.appendChild(nextBtn);
}

// Display game details in the modal
function showDetails(id) {
  const item = database.find(x => x.id === id);
  if (!item) return;

  // Screenshot dynamic loading / Google Image search fallback
  const screenshotImg = document.getElementById('modal-screenshot');
  const screenshotContainer = document.getElementById('modal-screenshot-container');

  if (item.screenshot) {
    // Hide fallback search link if exists
    let fallbackLink = screenshotContainer.querySelector('.screenshot-fallback-link');
    if (fallbackLink) {
      fallbackLink.style.display = 'none';
    }
    
    function sanitizeFilename(filename) {
      return filename.replace(/[\\/*?:"<>|]/g, "");
    }
    const safeTitle = sanitizeFilename(item.title);
    const localUrl = `screenshots/${encodeURIComponent(safeTitle)}.png`;
    
    screenshotImg.onerror = null;
    screenshotContainer.style.display = 'flex';
    screenshotImg.style.display = 'block';
    screenshotImg.src = localUrl;

    screenshotImg.onerror = () => {
      screenshotImg.onerror = null;
      screenshotImg.style.display = 'none';
      
      let fallbackLink = screenshotContainer.querySelector('.screenshot-fallback-link');
      if (!fallbackLink) {
        fallbackLink = document.createElement('a');
        fallbackLink.className = 'screenshot-fallback-link';
        fallbackLink.target = '_blank';
        fallbackLink.style.color = 'var(--accent-cyan)';
        fallbackLink.style.textDecoration = 'none';
        fallbackLink.style.fontWeight = '600';
        fallbackLink.style.display = 'flex';
        fallbackLink.style.flexDirection = 'column';
        fallbackLink.style.alignItems = 'center';
        fallbackLink.style.gap = '0.5rem';
        fallbackLink.style.padding = '1.25rem 1rem';
        fallbackLink.style.width = '100%';
        fallbackLink.style.textAlign = 'center';
        fallbackLink.style.border = '1px dashed var(--border-glow)';
        fallbackLink.style.borderRadius = '8px';
        fallbackLink.style.transition = 'all 0.3s ease';
        fallbackLink.addEventListener('mouseenter', () => {
          fallbackLink.style.borderColor = 'var(--accent-cyan)';
          fallbackLink.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.1)';
        });
        fallbackLink.addEventListener('mouseleave', () => {
          fallbackLink.style.borderColor = 'var(--border-glow)';
          fallbackLink.style.boxShadow = 'none';
        });
        screenshotContainer.appendChild(fallbackLink);
      }
      fallbackLink.style.display = 'flex';
      const searchTerms = `${item.system} "${item.title}" screenshot`;
      const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerms)}`;
      
      fallbackLink.href = googleSearchUrl;
      fallbackLink.innerHTML = `
        <i class="fa-brands fa-google" style="font-size: 1.8rem; color: var(--accent-cyan);"></i>
        <span style="font-size: 0.95rem;">Google 이미지에서 "${item.title}" 스크린샷 검색</span>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-top: 0.2rem;">
          클릭하시면 구글 이미지에서 이 게임의 스크린샷을 검색해 줍니다.
        </span>
      `;
    };
  } else {
    // Fallback: Google Images search link
    screenshotContainer.style.display = 'flex';
    screenshotImg.style.display = 'none';
    
    let fallbackLink = screenshotContainer.querySelector('.screenshot-fallback-link');
    if (!fallbackLink) {
      fallbackLink = document.createElement('a');
      fallbackLink.className = 'screenshot-fallback-link';
      fallbackLink.target = '_blank';
      fallbackLink.style.color = 'var(--accent-cyan)';
      fallbackLink.style.textDecoration = 'none';
      fallbackLink.style.fontWeight = '600';
      fallbackLink.style.display = 'flex';
      fallbackLink.style.flexDirection = 'column';
      fallbackLink.style.alignItems = 'center';
      fallbackLink.style.gap = '0.5rem';
      fallbackLink.style.padding = '1.25rem 1rem';
      fallbackLink.style.width = '100%';
      fallbackLink.style.textAlign = 'center';
      fallbackLink.style.border = '1px dashed var(--border-glow)';
      fallbackLink.style.borderRadius = '8px';
      fallbackLink.style.transition = 'all 0.3s ease';
      fallbackLink.addEventListener('mouseenter', () => {
        fallbackLink.style.borderColor = 'var(--accent-cyan)';
        fallbackLink.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.1)';
      });
      fallbackLink.addEventListener('mouseleave', () => {
        fallbackLink.style.borderColor = 'var(--border-glow)';
        fallbackLink.style.boxShadow = 'none';
      });
      screenshotContainer.appendChild(fallbackLink);
    }
    
    fallbackLink.style.display = 'flex';
    const searchTerms = `${item.system} "${item.title}" screenshot`;
    const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerms)}`;
    
    fallbackLink.href = googleSearchUrl;
    fallbackLink.innerHTML = `
      <i class="fa-brands fa-google" style="font-size: 1.8rem; color: var(--accent-cyan);"></i>
      <span style="font-size: 0.95rem;">Google 이미지에서 "${item.title}" 스크린샷 검색</span>
      <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-top: 0.2rem;">
        클릭하시면 구글 이미지에서 이 게임의 스크린샷을 검색해 줍니다.
      </span>
    `;
  }

  // YouTube player loading
  const youtubeContainer = document.getElementById('modal-youtube-container');
  const youtubeIframe = document.getElementById('modal-youtube-iframe');
  const ytSearchLinkContainer = document.getElementById('modal-youtube-link-container');

  if (item.youtube) {
    youtubeContainer.style.display = 'block';
    youtubeIframe.src = 'https://www.youtube.com/embed/' + item.youtube;
    
    const videoUrl = `https://www.youtube.com/watch?v=${item.youtube}`;
    ytSearchLinkContainer.innerHTML = `<a href="${videoUrl}" target="_blank" style="color: #ff00ff; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-brands fa-youtube" style="font-size: 1.1rem; color: #ff0000;"></i> 유튜브에서 재생 (Watch on YouTube)</a>`;
  } else {
    youtubeContainer.style.display = 'none';
    youtubeIframe.src = '';
    
    let queryTerms = `${item.system} ${item.title}`;
    if (item.ko_title) {
      queryTerms += ` ${item.ko_title}`;
    }
    queryTerms += ' gameplay';
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(queryTerms)}`;
    ytSearchLinkContainer.innerHTML = `<a href="${ytSearchUrl}" target="_blank" style="color: var(--text-muted); text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-brands fa-youtube" style="font-size: 1.1rem; color: var(--text-muted);"></i> 유튜브에서 검색 (Search gameplay)</a>`;
  }

  if (item.ko_title) {
    modalTitle.textContent = item.ko_title;
    let subTitleText = item.title;
    if (item.alt_title) {
      subTitleText += ` (${item.alt_title})`;
    }
    modalAltTitle.textContent = subTitleText;
  } else {
    modalTitle.textContent = item.title;
    modalAltTitle.textContent = item.alt_title || '';
  }
  
  // Set badges
  modalBadgeSystem.className = `system-badge ${getSystemClass(item.system)}`;
  modalBadgeSystem.textContent = item.system;
  modalBadgeCategory.textContent = item.category;
  
  // Fill details table
  modalId.textContent = item.id;
  modalYear.textContent = item.year;
  modalPublisher.textContent = item.publisher;
  modalSerial.textContent = item.serial || '-';
  modalCloneOf.textContent = item.cloneof ? `${item.cloneof}` : '-';
  modalSupported.textContent = item.supported === 'yes' ? '지원함 (Yes)' : '지원안함 (No)';
  modalDbFile.textContent = item.db_file;
  modalDbDesc.textContent = item.db_desc;

  // Compatibility (Shared features)
  if (item.shared_features && item.shared_features.compatibility) {
    modalCompatibility.textContent = item.shared_features.compatibility;
    modalCompatibility.closest('.detail-row').style.display = 'flex';
  } else {
    modalCompatibility.textContent = '-';
    modalCompatibility.closest('.detail-row').style.display = 'none';
  }

  // Usage / Notes
  let notesHtml = '';
  if (item.usage) {
    notesHtml += `<strong>실행법 (Usage):</strong> ${item.usage}<br>`;
  }
  if (item.notes) {
    notesHtml += `<strong>참고사항 (Notes):</strong> ${item.notes}`;
  }
  
  if (notesHtml) {
    modalNotes.innerHTML = notesHtml;
    modalNotesContainer.style.display = 'block';
  } else {
    modalNotesContainer.style.display = 'none';
  }

  // Render Parts & files list
  modalPartsContainer.innerHTML = '';
  if (item.parts && item.parts.length > 0) {
    item.parts.forEach(part => {
      const partEl = document.createElement('div');
      partEl.className = 'part-card';
      
      // Feature list
      let featuresHtml = '';
      if (part.features && Object.keys(part.features).length > 0) {
        featuresHtml = '<div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted);">';
        for (const [key, value] of Object.entries(part.features)) {
          featuresHtml += `<span style="margin-right: 0.75rem;"><strong>${key}:</strong> ${value}</span>`;
        }
        featuresHtml += '</div>';
      }

      // ROMs/Disks table
      let romRows = '';
      if (part.roms && part.roms.length > 0) {
        part.roms.forEach(rom => {
          const statusClass = rom.status === 'good' ? 'rom-status-good' : 'rom-status-baddump';
          const sizeFormatted = formatBytes(rom.size) || '-';
          const crcBtn = rom.crc ? `<button class="copy-btn" onclick="copyText('${rom.crc}', 'CRC32 코드가 복사되었습니다.')" title="CRC32 복사"><i class="fa-regular fa-copy"></i></button>` : '';
          const sha1Btn = rom.sha1 ? `<button class="copy-btn" onclick="copyText('${rom.sha1}', 'SHA1 코드가 복사되었습니다.')" title="SHA1 복사"><i class="fa-regular fa-copy"></i></button>` : '';
          
          romRows += `
            <tr>
              <td class="rom-name" title="${rom.name}">${rom.name || 'N/A'}</td>
              <td>${sizeFormatted}</td>
              <td>
                <span>${rom.crc || '-'}</span> ${crcBtn}
              </td>
              <td>
                <span style="font-size:0.7rem;">${rom.sha1 ? rom.sha1.substring(0,8) + '...' : '-'}</span> ${sha1Btn}
              </td>
              <td><span class="${statusClass}">${rom.status.toUpperCase()}</span></td>
            </tr>
          `;
        });
      } else {
        romRows = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">파일 정보 없음</td></tr>`;
      }

      partEl.innerHTML = `
        <div class="part-header">
          <span>Part: <span class="part-interface">${part.name}</span></span>
          <span>Interface: <span class="part-interface">${part.interface || 'Generic'}</span></span>
        </div>
        <table class="roms-table">
          <thead>
            <tr>
              <th>파일명 (File Name)</th>
              <th>용량 (Size)</th>
              <th>CRC32</th>
              <th>SHA1 (Short)</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            ${romRows}
          </tbody>
        </table>
        ${featuresHtml}
      `;
      modalPartsContainer.appendChild(partEl);
    });
  } else {
    modalPartsContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 1rem;">부속 파일 정보가 없습니다.</div>';
  }

  // Open Modal
  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  const youtubeIframe = document.getElementById('modal-youtube-iframe');
  if (youtubeIframe) {
    youtubeIframe.src = '';
  }
}

// File Size Formatting Utility (supports hexadecimal sizes too)
function formatBytes(sizeStr) {
  if (!sizeStr) return '';
  
  let bytes = 0;
  if (sizeStr.startsWith('0x') || sizeStr.startsWith('0X')) {
    bytes = parseInt(sizeStr, 16);
  } else {
    bytes = parseInt(sizeStr, 10);
  }
  
  if (isNaN(bytes)) return sizeStr;
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Copy to Clipboard Action
window.copyText = function(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(err => {
    console.error('Clipboard copy failed: ', err);
  });
};

function showToast(msg) {
  copyToast.textContent = msg;
  copyToast.classList.add('active');
  setTimeout(() => {
    copyToast.classList.remove('active');
  }, 2000);
}

function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');

  // Check saved theme, default to 'light'
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
    if (themeIconSun) themeIconSun.style.display = 'block';
    if (themeIconMoon) themeIconMoon.style.display = 'none';
  } else {
    document.body.classList.remove('light-theme');
    if (themeIconSun) themeIconSun.style.display = 'none';
    if (themeIconMoon) themeIconMoon.style.display = 'block';
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      
      if (isLight) {
        if (themeIconSun) themeIconSun.style.display = 'block';
        if (themeIconMoon) themeIconMoon.style.display = 'none';
      } else {
        if (themeIconSun) themeIconSun.style.display = 'none';
        if (themeIconMoon) themeIconMoon.style.display = 'block';
      }
    });
  }
}
