/* FreshTag — ứng dụng demo phía trình duyệt. */
(function () {
  'use strict';

  const D = window.FRESHTAG_DATA;
  const { LOTS, STATUS, ALIASES, SAMPLE_ORDER } = D;
  const TABS = ['scan', 'tag', 'recipes', 'farm'];
  const HISTORY_KEY = 'freshtag.history.v1';
  const THEME_KEY = 'freshtag.theme';
  const INSTALL_KEY = 'freshtag.installDismissed';
  const MAX_HISTORY = 20;
  const SITE_URL = 'https://beg846.github.io/freshtag/';

  const state = {
    tab: 'scan',
    currentCode: 'FT-BEEF-8892',
    history: [],
    recipeFilter: 'Tất cả',
    sim: { storage: 2, days: 0, status: 'safe', tvbn: 6 },
    deferredPrompt: null,
    unknownParam: '',
    initialDeepLink: false,
    initialLotLink: false,
    theme: 'light'
  };

  const scanner = {
    active: false,
    stream: null,
    timer: null,
    session: 0,
    detector: null,
    native: false,
    canvas: null,
    torchOn: false,
    lastCode: '',
    lastAt: 0
  };

  let activeSpeakButton = null;
  let activeModalFocus = null;
  let toastTimer = null;
  const scriptPromises = {};

  /* ---------- helpers ---------- */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function icon(name, className) {
    return '<svg class="' + (className || 'ico') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function toneOf(status) {
    return status === 'warning' ? 'warn' : (status === 'danger' ? 'danger' : 'safe');
  }

  function metaOf(status) {
    return STATUS[status] || STATUS.safe;
  }

  function currentLot() {
    return LOTS[state.currentCode] || LOTS['FT-BEEF-8892'];
  }

  function num(value) {
    return String(value).replace('.', ',');
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  function scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function resolveCode(raw) {
    let value = normalizeText(raw);
    if (!value) return null;

    if (value.charAt(0) === '{') {
      try {
        const parsed = JSON.parse(value);
        value = normalizeText(parsed.lot || parsed.code || parsed.id || value);
      } catch (error) {
        /* giữ nguyên nội dung gốc */
      }
    }

    if (/^https?:\/\//i.test(value) || /[?&](lot|code)=/i.test(value)) {
      try {
        const url = new URL(value, window.location.href);
        const candidate = url.searchParams.get('lot') || url.searchParams.get('code');
        if (candidate) value = candidate;
      } catch (error) {
        /* giữ nguyên nội dung gốc */
      }
    }

    try {
      value = decodeURIComponent(value);
    } catch (error) {
      /* giữ nguyên nội dung gốc */
    }

    const compact = value.trim().toUpperCase().replace(/\s+/g, '');
    if (LOTS[compact]) return compact;
    if (ALIASES[compact]) return ALIASES[compact];

    const match = value.toUpperCase().match(/FT-[A-Z]+-\d+/);
    if (match) {
      const code = match[0];
      if (LOTS[code]) return code;
      if (ALIASES[code]) return ALIASES[code];
    }

    const upper = value.toUpperCase();
    const aliases = Object.keys(ALIASES);
    for (let i = 0; i < aliases.length; i += 1) {
      if (upper.indexOf(aliases[i]) !== -1) return ALIASES[aliases[i]];
    }
    return null;
  }

  function buildLotUrl(code, tab) {
    let base = SITE_URL;
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      base = window.location.origin + window.location.pathname;
    }
    try {
      const url = new URL(base);
      url.searchParams.set('lot', code);
      if (tab && tab !== 'scan') url.searchParams.set('tab', tab);
      return url.toString();
    } catch (error) {
      return SITE_URL + '?lot=' + encodeURIComponent(code);
    }
  }

  function qrTarget(code) {
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return buildLotUrl(code);
    }
    return SITE_URL + '?lot=' + encodeURIComponent(code);
  }

  function syncUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lot', state.currentCode);
      if (state.tab === 'scan') url.searchParams.delete('tab');
      else url.searchParams.set('tab', state.tab);
      window.history.replaceState(null, '', url.toString());
    } catch (error) {
      /* file:// hoặc trình duyệt hạn chế history */
    }
  }

  function toast(message, duration) {
    const el = $('#toast');
    if (!el) return;
    window.clearTimeout(toastTimer);
    el.textContent = message;
    el.classList.add('is-visible');
    toastTimer = window.setTimeout(function () {
      el.classList.remove('is-visible');
    }, duration || 2800);
  }

  function loadScriptOnce(src) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Không tải được ' + src)); };
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  function ensureQrcodeLib() {
    if (window.qrcode) return Promise.resolve();
    return loadScriptOnce('assets/vendor/qrcode.js');
  }

  function ensureJsQrLib() {
    if (window.jsQR) return Promise.resolve();
    return loadScriptOnce('assets/vendor/jsQR.min.js');
  }

  function metricStates(status) {
    if (status === 'warning') return ['Cần nấu chín', 'Hơi cao', 'Tăng nhẹ'];
    if (status === 'danger') return ['Vượt ngưỡng', 'Mất chuỗi lạnh', 'Bất thường'];
    return ['Trong ngưỡng', 'Ổn định', 'Bình thường'];
  }

  /* ---------- kết quả quét ---------- */

  function tagRowsMarkup(activeStatus) {
    const rows = [
      { status: 'safe', name: 'Xanh lá / vàng nhạt', action: 'Tươi — dùng ngay' },
      { status: 'warning', name: 'Cam / đỏ nhạt', action: 'Nấu chín kỹ ngay' },
      { status: 'danger', name: 'Tím thẫm / nâu', action: 'Vượt ngưỡng — không ăn' }
    ];
    return rows.map(function (row) {
      const isActive = row.status === activeStatus;
      return '<div class="tag-guide-row tone-' + toneOf(row.status) + (isActive ? ' is-active' : '') + '">' +
        '<span class="tag-guide-dot"></span>' +
        '<span class="tag-guide-copy"><strong>' + row.name + '</strong><small>' + row.action + '</small></span>' +
        (isActive ? '<span class="tag-guide-now">Đang đọc</span>' : '') +
        '</div>';
    }).join('');
  }

  function mapMarkup(lot, large) {
    const farm = lot.farm;
    if (!farm.mapQuery) {
      return '<div class="map-unavailable ' + (large ? 'map-unavailable-lg' : '') + '">' +
        icon('alert') +
        '<strong>Không có dữ liệu bản đồ</strong>' +
        '<span>Mã lô chưa được liên kết với trang trại đã đăng ký.</span>' +
        '</div>';
    }
    const href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(farm.mapQuery);
    return '<a class="mini-map' + (large ? ' mini-map-lg' : '') + '" href="' + href + '" target="_blank" rel="noopener" aria-label="Mở Google Maps: ' + esc(farm.address) + '">' +
      '<span class="map-grid" aria-hidden="true"></span>' +
      '<span class="map-road map-road-a" aria-hidden="true"></span>' +
      '<span class="map-road map-road-b" aria-hidden="true"></span>' +
      '<span class="map-road map-road-c" aria-hidden="true"></span>' +
      '<span class="map-pin">' + icon('map-pin') + '</span>' +
      '<span class="map-open">' + icon('external') + ' Google Maps</span>' +
      '<span class="map-label">' + icon('map-pin') + ' ' + esc(farm.address) + '</span>' +
      '</a>';
  }

  function animalSvg(lot) {
    const commonShadow = '<ellipse class="animal-shadow" cx="130" cy="127" rx="84" ry="7"></ellipse>';
    let drawing = '';

    if (lot.animal === 'cow') {
      drawing =
        '<g>' +
        '<path class="animal-part" d="M45 82C45 58 67 42 108 40c44-2 78 8 94 23 7 7 9 15 5 21l-10 11-7 15h-14l-6-18H94l-6 18H74l-6-18-18-2c-9-2-12-7-12-13Z"></path>' +
        '<rect class="animal-part" x="69" y="90" width="14" height="33" rx="6"></rect>' +
        '<rect class="animal-part" x="94" y="90" width="14" height="33" rx="6"></rect>' +
        '<rect class="animal-part" x="166" y="90" width="14" height="33" rx="6"></rect>' +
        '<rect class="animal-part" x="189" y="90" width="14" height="33" rx="6"></rect>' +
        '<path class="animal-detail" d="M45 67c-10-3-16 3-15 11 1 6 5 9 10 9"></path>' +
        '<path class="animal-part" d="M196 55c8-9 23-9 32 0 5 5 8 10 10 15 2 4-1 8-6 9l-13 2-7 13c-2 4-8 4-10-1l-8-22c-2-6-1-11 2-16Z"></path>' +
        '<path class="animal-part" d="M202 51l7-13 5 2-5 14Z"></path>' +
        '<path class="animal-detail" d="M224 51c4-6 11-6 14-2"></path>' +
        '<circle class="animal-eye" cx="220" cy="63" r="2.2"></circle>' +
        '<ellipse class="animal-muzzle" cx="239" cy="72" rx="8" ry="6"></ellipse>' +
        '<path class="animal-detail" d="M231 71l6-1M231 75l5 0"></path>' +
        '</g>' +
        '<g class="cut-area">' +
        '<ellipse cx="143" cy="52" rx="36" ry="12" transform="rotate(-6 143 52)"></ellipse>' +
        '<circle class="cut-dot" cx="143" cy="52" r="3.4"></circle>' +
        '</g>';
    } else if (lot.animal === 'pig') {
      drawing =
        '<g>' +
        '<path class="animal-part" d="M40 84c0-26 28-40 72-40 46 0 80 8 94 24 7 8 6 18-2 24l-6 14h-14l-6-15H92l-6 15H72l-6-15-16-2c-7-1-10-2-10-5Z"></path>' +
        '<rect class="animal-part" x="70" y="92" width="14" height="31" rx="6"></rect>' +
        '<rect class="animal-part" x="95" y="92" width="14" height="31" rx="6"></rect>' +
        '<rect class="animal-part" x="164" y="92" width="14" height="31" rx="6"></rect>' +
        '<rect class="animal-part" x="187" y="92" width="14" height="31" rx="6"></rect>' +
        '<path class="animal-detail" d="M41 69c-10-3-17 4-14 11 2 5 8 6 10 2 2-3-2-5-5-3"></path>' +
        '<path class="animal-part" d="M197 57c8-8 23-8 31 1 4 4 7 9 9 14 2 4-1 8-6 9l-14 2-8 13c-2 4-8 4-10-1l-7-22c-1-6 1-11 5-16Z"></path>' +
        '<path class="animal-part" d="M202 52l-2-13 12 7Z"></path>' +
        '<circle class="animal-eye" cx="221" cy="64" r="2.2"></circle>' +
        '<ellipse class="animal-muzzle" cx="239" cy="74" rx="11" ry="8"></ellipse>' +
        '<circle class="animal-nostril" cx="236" cy="73" r="1.3"></circle>' +
        '<circle class="animal-nostril" cx="242" cy="74" r="1.3"></circle>' +
        '</g>' +
        '<g class="cut-area">' +
        '<path d="M96 78c27-6 65-5 91 5l-5 11H99Z"></path>' +
        '<circle class="cut-dot" cx="143" cy="82" r="3.4"></circle>' +
        '</g>';
    } else {
      drawing =
        '<g>' +
        '<path class="animal-detail animal-tail" d="M76 74C60 56 46 55 40 62c8 1 14 7 17 13-11-2-19 2-23 8 9 1 16 4 22 9"></path>' +
        '<ellipse class="animal-part" cx="128" cy="82" rx="59" ry="42"></ellipse>' +
        '<path class="animal-detail" d="M101 78c10-12 31-16 46-5 8 6 8 20-4 25-11 5-29-2-38-10"></path>' +
        '<circle class="animal-part" cx="185" cy="49" r="22"></circle>' +
        '<path class="animal-comb" d="M177 28c1-7 6-8 8-3 3-8 9-7 9-1 5-5 9-1 6 5-4 7-16 7-23-1Z"></path>' +
        '<path class="animal-beak" d="M204 49l16 5-16 6Z"></path>' +
        '<path class="animal-wattle" d="M197 64c1 7 6 9 9 5 2-3 0-7-3-9Z"></path>' +
        '<circle class="animal-eye" cx="191" cy="45" r="2.4"></circle>' +
        '<path class="animal-detail animal-legs" d="M119 119v11M139 119v11M117 131h8M137 131h8"></path>' +
        '</g>' +
        '<g class="cut-area">' +
        '<ellipse cx="157" cy="88" rx="29" ry="22" transform="rotate(-16 157 88)"></ellipse>' +
        '<circle class="cut-dot" cx="157" cy="88" r="3.4"></circle>' +
        '</g>';
    }

    return '<div class="animal-wrap tone-' + toneOf(lot.status) + '">' +
      '<svg class="animal-svg" viewBox="0 0 260 150" role="img" aria-label="Sơ đồ vị trí phần ' + esc(lot.cut.name) + ' trên con vật">' +
      commonShadow + drawing +
      '</svg>' +
      '<span class="animal-caption">' + icon('map-pin') + ' ' + esc(lot.cut.name) + '</span>' +
      '</div>';
  }

  function renderHeroTicket(lot) {
    const ticket = $('.scan-ticket');
    if (!ticket) return;
    const meta = metaOf(lot.status);
    ticket.classList.remove('tone-safe', 'tone-warn', 'tone-danger');
    ticket.classList.add('tone-' + toneOf(lot.status));
    const codeEl = $('.ticket-foot > span:first-child');
    if (codeEl) codeEl.textContent = lot.code;
    const okEl = $('.ticket-ok');
    if (okEl) {
      okEl.innerHTML = icon(lot.status === 'safe' ? 'check' : (lot.status === 'warning' ? 'alert' : 'x-circle')) + ' ' + (lot.status === 'safe' ? 'Đã xác thực' : meta.label);
    }
    const tagText = $('.ticket-tag strong');
    if (tagText) tagText.textContent = meta.tagText;
    const tagSmall = $('.ticket-tag small');
    if (tagSmall) tagSmall.textContent = lot.status === 'safe' ? 'FRESH' : (lot.status === 'warning' ? 'CHECK' : 'STOP');
  }

  function renderResult() {
    const lot = currentLot();
    const meta = metaOf(lot.status);
    const tone = toneOf(lot.status);
    const metrics = metricStates(lot.status);
    const firstRecipe = lot.recipes && lot.recipes[0];
    const hasCert = Boolean(lot.certNo);
    const root = $('#resultRoot');
    if (!root) return;

    const recipeBlock = firstRecipe ? (
      '<section class="card recipe-preview-card">' +
        '<div class="sec-head"><div><span class="kicker">Gợi ý hôm nay</span><h3>Món ngon cho phần thịt này</h3></div>' +
        '<button type="button" class="text-btn" data-goto-tab="recipes">Xem ' + lot.recipes.length + ' món ' + icon('chevron-right') + '</button></div>' +
        '<button type="button" class="recipe-teaser" data-goto-tab="recipes">' +
          '<span class="recipe-emoji" aria-hidden="true">' + firstRecipe.emoji + '</span>' +
          '<span class="recipe-teaser-copy"><span class="recipe-meta">' + esc(firstRecipe.time) + ' · ' + esc(firstRecipe.difficulty) + ' · ' + esc(firstRecipe.servings) + '</span>' +
          '<strong>' + esc(firstRecipe.title) + '</strong><small>' + firstRecipe.tags.map(esc).join(' · ') + '</small></span>' +
          '<span class="recipe-teaser-arrow">' + icon('arrow-right') + '</span>' +
        '</button>' +
      '</section>'
    ) : (
      '<section class="card safety-card" id="safetyCard">' +
        '<div class="safety-card-head"><span class="safety-icon">' + icon('alert') + '</span><div><span class="kicker">Cảnh báo an toàn</span><h3>Không chế biến lô thịt này</h3></div></div>' +
        '<p class="safety-lead">' + esc(lot.statusDesc) + '</p>' +
        '<ol class="safety-steps">' + (lot.safetySteps || []).map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>' +
        '<button type="button" class="btn btn-soft btn-block" data-action="samples">' + icon('qr') + ' Chọn một tem an toàn khác</button>' +
      '</section>'
    );

    root.innerHTML =
      '<div class="result-topline"><span>' + icon('scan') + ' Kết quả đang xem</span><span class="pill pill-demo">Dữ liệu demo</span></div>' +
      '<article class="result-hero tone-' + tone + '">' +
        '<div class="result-hero-orb" aria-hidden="true"></div>' +
        '<div class="result-hero-top">' +
          '<span class="status-pill">' + icon(meta.icon) + ' ' + esc(meta.label) + '</span>' +
          '<button type="button" class="round-btn round-btn-glass js-speak-lot" aria-label="Đọc kết quả lô ' + esc(lot.code) + '">' + icon('volume') + '</button>' +
        '</div>' +
        '<div class="product-line">' +
          '<span class="product-emoji" aria-hidden="true">' + lot.emoji + '</span>' +
          '<div><h2>' + esc(lot.product) + '</h2><p>' + esc(lot.cutName) + ' · Lô ' + esc(lot.code) + '</p></div>' +
        '</div>' +
        '<p class="result-verdict">' + esc(meta.verdict) + '</p>' +
        '<p class="result-desc">' + esc(lot.statusDesc) + '</p>' +
        '<div class="fresh-meter" style="--pos:' + lot.freshnessPercent + '%" role="img" aria-label="Mức tươi ' + lot.freshnessPercent + ' phần trăm, trạng thái ' + esc(meta.label) + '">' +
          '<div class="fresh-track" aria-hidden="true"><span class="zone-safe"></span><span class="zone-warn"></span><span class="zone-danger"></span></div>' +
          '<span class="fresh-marker" aria-hidden="true"></span>' +
          '<div class="fresh-labels" aria-hidden="true"><span>Tươi</span><span>Nấu ngay</span><span>Không an toàn</span></div>' +
        '</div>' +
        '<div class="result-hero-foot">' +
          '<span class="tag-color-pill"><i></i> Tem ' + esc(meta.tagName.toLowerCase()) + '</span>' +
          '<button type="button" class="hero-link" data-goto-tab="tag">Cách đọc tem ' + icon('chevron-right') + '</button>' +
        '</div>' +
      '</article>' +
      '<div class="quick-actions">' +
        '<button type="button" class="quick-btn" data-action="share">' + icon('share') + '<span>Chia sẻ</span></button>' +
        '<button type="button" class="quick-btn" data-action="' + (hasCert ? 'cert' : 'scroll-safety') + '">' + icon(hasCert ? 'award' : 'alert') + '<span>' + (hasCert ? 'Chứng nhận' : 'Xử lý') + '</span></button>' +
        '<button type="button" class="quick-btn" data-action="samples">' + icon('qr') + '<span>Tem khác</span></button>' +
      '</div>' +
      '<section class="card metrics-card">' +
        '<div class="sec-head"><div><span class="kicker">Đo tại thời điểm quét</span><h3>Chỉ số tươi</h3></div><span class="pill pill-demo">DEMO</span></div>' +
        '<div class="metric-grid">' +
          '<div class="metric tone-' + tone + '"><span class="metric-icon">' + icon('flask') + '</span><span class="metric-label">TVB-N</span><strong>' + num(lot.tvbn) + '<small>mg/100g</small></strong><span class="metric-state">' + metrics[0] + '</span></div>' +
          '<div class="metric tone-' + tone + '"><span class="metric-icon">' + icon('thermometer') + '</span><span class="metric-label">Nhiệt độ</span><strong>' + num(lot.temp) + '<small>°C</small></strong><span class="metric-state">' + metrics[1] + '</span></div>' +
          '<div class="metric tone-' + tone + '"><span class="metric-icon">' + icon('flask') + '</span><span class="metric-label">pH bề mặt</span><strong>' + num(lot.ph) + '<small>pH</small></strong><span class="metric-state">' + metrics[2] + '</span></div>' +
        '</div>' +
        '<p class="metric-note">' + icon('info') + ' TVB-N càng thấp càng tươi. Ngưỡng tham khảo cho thịt tươi: ≤ 15 mg/100g; trên 25 mg/100g là không an toàn.</p>' +
      '</section>' +
      '<div class="insight tone-' + tone + '">' +
        '<span class="insight-icon">' + icon(meta.icon) + '</span>' +
        '<div><span class="kicker">' + (lot.status === 'safe' ? 'Gợi ý bảo quản' : (lot.status === 'warning' ? 'Lưu ý trước khi nấu' : 'Cảnh báo an toàn')) + '</span>' +
        '<h3>' + esc(lot.statusTitle) + '</h3><p>' + esc(lot.handling) + '</p></div>' +
      '</div>' +
      '<section class="card cut-card">' +
        '<div class="sec-head"><div><span class="kicker">Vị trí trên con vật</span><h3>' + esc(lot.cut.name) + '</h3></div></div>' +
        animalSvg(lot) +
        '<p class="cut-desc">' + esc(lot.cut.description) + '</p>' +
        '<div class="pill-row">' + lot.cut.tags.map(function (tag) { return '<span class="soft-pill">' + esc(tag) + '</span>'; }).join('') + '</div>' +
      '</section>' +
      '<section class="card tagguide-card">' +
        '<div class="sec-head"><div><span class="kicker">Thang màu tem</span><h3>So sánh với tem trên bao bì</h3></div>' +
        '<button type="button" class="text-btn" data-goto-tab="tag">Cách hoạt động ' + icon('chevron-right') + '</button></div>' +
        '<div class="tag-guide-list">' + tagRowsMarkup(lot.status) + '</div>' +
      '</section>' +
      '<section class="card farm-preview">' +
        '<div class="sec-head"><div><span class="kicker">Truy xuất nguồn gốc</span><h3>' + esc(lot.farm.name) + '</h3></div>' +
        '<button type="button" class="text-btn" data-goto-tab="farm">Chi tiết ' + icon('chevron-right') + '</button></div>' +
        '<div class="farm-mini"><span class="farm-mini-emoji">' + lot.farm.emoji + '</span><div><strong>' + esc(lot.farm.owner) + '</strong><span>' + icon('map-pin') + ' ' + esc(lot.farm.address) + '</span></div></div>' +
        '<div class="fact-grid">' +
          '<div class="fact"><span>Đóng gói</span><strong>' + esc(lot.packed) + '</strong></div>' +
          '<div class="fact"><span>Dùng tốt nhất</span><strong>' + esc(lot.bestBefore) + '</strong></div>' +
          '<div class="fact"><span>Bảo quản</span><strong>' + esc(lot.storage) + '</strong></div>' +
          '<div class="fact"><span>Kiểm định</span><strong class="fact-ok">' + (hasCert ? icon('check-circle') + ' Đạt' : icon('alert') + ' Không có') + '</strong></div>' +
        '</div>' +
        mapMarkup(lot, false) +
      '</section>' +
      recipeBlock +
      '<div class="result-end">' +
        '<button type="button" class="btn btn-primary btn-block" data-action="scan">' + icon('scan') + ' Quét tem khác</button>' +
        '<p>' + icon('lock') + ' Kết quả chỉ mang tính minh hoạ trong bản demo.</p>' +
      '</div>';

    renderHeroTicket(lot);
  }

  /* ---------- tab món ngon ---------- */

  function recipeContextMarkup(lot) {
    const meta = metaOf(lot.status);
    return '<div class="context-card">' +
      '<span class="context-emoji" aria-hidden="true">' + lot.emoji + '</span>' +
      '<div class="context-copy"><span class="kicker">Đang xem</span><strong>' + esc(lot.product) + '</strong>' +
      '<span>' + esc(lot.code) + ' · Tem ' + esc(meta.tagName.toLowerCase()) + '</span></div>' +
      '<button type="button" class="btn btn-soft btn-sm" data-action="samples">Đổi tem</button>' +
      '</div>';
  }

  function recipeCardMarkup(recipe, open) {
    return '<details class="recipe-card"' + (open ? ' open' : '') + '>' +
      '<summary>' +
        '<span class="recipe-emoji" aria-hidden="true">' + recipe.emoji + '</span>' +
        '<span class="recipe-summary">' +
          '<span class="recipe-meta">' + esc(recipe.time) + ' · ' + esc(recipe.difficulty) + ' · ' + esc(recipe.servings) + '</span>' +
          '<strong>' + esc(recipe.title) + '</strong>' +
          '<span class="recipe-tags">' + recipe.tags.map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('') + '</span>' +
        '</span>' +
        '<span class="recipe-chevron">' + icon('chevron-down') + '</span>' +
      '</summary>' +
      '<div class="recipe-body">' +
        '<h4>Nguyên liệu</h4>' +
        '<ul class="ingredient-list">' + recipe.ingredients.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' +
        '<h4>Cách làm</h4>' +
        '<ol class="step-list">' + recipe.steps.map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>' +
        '<div class="recipe-tip">' + icon('sparkles') + '<p>' + esc(recipe.tip) + '</p></div>' +
        '<button type="button" class="btn btn-soft btn-block js-speak-recipe" data-recipe-id="' + esc(recipe.id) + '">' + icon('volume') + ' Đọc cách làm</button>' +
      '</div>' +
    '</details>';
  }

  function renderRecipes() {
    const lot = currentLot();
    const meta = metaOf(lot.status);
    const context = $('#recipeContext');
    const filters = $('#recipeFilters');
    const list = $('#recipeList');
    if (!context || !filters || !list) return;

    context.innerHTML = recipeContextMarkup(lot);

    if (lot.status === 'danger' || !lot.recipes.length) {
      filters.innerHTML = '';
      filters.hidden = true;
      list.innerHTML =
        '<div class="safety-panel tone-danger">' +
          '<div class="safety-panel-head"><span class="safety-icon">' + icon('alert') + '</span><div><span class="kicker">Không có công thức</span><h3>Không chế biến lô thịt này</h3></div></div>' +
          '<p>' + esc(lot.statusDesc) + '</p>' +
          '<ol class="safety-steps">' + (lot.safetySteps || []).map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>' +
          '<button type="button" class="btn btn-primary btn-block" data-action="samples">' + icon('qr') + ' Chọn tem an toàn khác</button>' +
        '</div>' +
        '<div class="card">' +
          '<div class="sec-head"><div><span class="kicker">An toàn thực phẩm</span><h3>Khi nghi ngờ, hãy bỏ</h3></div></div>' +
          '<p class="body-copy">Không nếm thử thịt để kiểm tra. Vi khuẩn gây bệnh có thể có mặt dù mùi vị chưa thay đổi rõ. Nếu bạn đã ăn phải thực phẩm nghi hỏng và có triệu chứng như đau bụng, nôn, sốt, hãy liên hệ cơ sở y tế.</p>' +
          '<div class="emergency-line">' + icon('phone') + '<div><span>Cần hỗ trợ y tế khẩn cấp</span><strong>Gọi 115</strong></div></div>' +
        '</div>';
      return;
    }

    filters.hidden = false;
    const tags = ['Tất cả'];
    lot.recipes.forEach(function (recipe) {
      recipe.tags.forEach(function (tag) {
        if (tags.indexOf(tag) === -1) tags.push(tag);
      });
    });
    if (tags.indexOf(state.recipeFilter) === -1) state.recipeFilter = 'Tất cả';

    filters.innerHTML = tags.map(function (tag) {
      const active = tag === state.recipeFilter;
      return '<button type="button" class="filter-chip' + (active ? ' is-active' : '') + '" data-filter="' + esc(tag) + '" aria-pressed="' + active + '">' + esc(tag) + '</button>';
    }).join('');

    const visible = lot.recipes.filter(function (recipe) {
      return state.recipeFilter === 'Tất cả' || recipe.tags.indexOf(state.recipeFilter) !== -1;
    });

    const banner = lot.status === 'warning' ?
      '<div class="safety-banner tone-warn">' + icon('alert') +
        '<p><strong>Lô này đang ở mức cam.</strong> Hãy nấu chín hoàn toàn (tâm thịt ≥ 72°C), dùng ngay trong hôm nay và không ăn tái.</p>' +
      '</div>' : '';

    list.innerHTML = banner + visible.map(function (recipe, index) {
      return recipeCardMarkup(recipe, index === 0);
    }).join('') +
      '<div class="recipe-disclaimer">' + icon('info') + '<p>Thời gian nấu có thể thay đổi theo độ dày của thịt và thiết bị. Luôn kiểm tra thịt đã chín kỹ trước khi dùng' + (lot.status === 'warning' ? ', đặc biệt với lô đang ở mức cam.' : '.') + '</p></div>';
  }

  /* ---------- tab nông trại ---------- */

  function renderFarm() {
    const lot = currentLot();
    const farm = lot.farm;
    const tone = toneOf(lot.status);
    const meta = metaOf(lot.status);
    const root = $('#farmContent');
    if (!root) return;

    const certChips = farm.certs && farm.certs.length ?
      '<div class="cert-chips">' + farm.certs.map(function (cert) { return '<span>' + icon('check-circle') + ' ' + esc(cert) + '</span>'; }).join('') + '</div>' :
      '<div class="no-cert">' + icon('alert') + ' Không có chứng nhận nào được liên kết với mã lô này.</div>';

    const journey = lot.journey.map(function (step) {
      return '<li class="timeline-item' + (step.verified ? '' : ' is-unverified') + '">' +
        '<span class="timeline-dot">' + icon(step.icon) + '</span>' +
        '<div class="timeline-body">' +
          '<div class="timeline-head"><h4>' + esc(step.title) + '</h4><time>' + esc(step.time) + '</time></div>' +
          '<p>' + esc(step.desc) + '</p>' +
          (step.verified ? '<span class="timeline-verified">' + icon('check') + ' Đã xác thực</span>' : '<span class="timeline-verified is-warning">' + icon('alert') + ' Chưa xác thực</span>') +
        '</div>' +
      '</li>';
    }).join('');

    const certBlock = lot.certNo ?
      '<section class="cert-cta tone-' + tone + '">' +
        '<span class="cert-cta-icon">' + icon('award') + '</span>' +
        '<div class="cert-cta-copy"><strong>Chứng nhận & kiểm nghiệm</strong><span>' + esc(lot.certNo) + ' · ' + esc(lot.inspector) + '</span></div>' +
        '<button type="button" class="btn btn-sm btn-soft" data-action="cert">Xem</button>' +
      '</section>' :
      '<section class="cert-cta is-empty">' +
        '<span class="cert-cta-icon">' + icon('alert') + '</span>' +
        '<div class="cert-cta-copy"><strong>Không tìm thấy chứng nhận</strong><span>Mã lô không khớp với dữ liệu kiểm định.</span></div>' +
      '</section>';

    const safetyBlock = lot.status === 'danger' ?
      '<section class="card">' +
        '<div class="sec-head"><div><span class="kicker">Xử lý an toàn</span><h3>Nếu bạn đang giữ lô thịt này</h3></div></div>' +
        '<ol class="safety-steps">' + (lot.safetySteps || []).map(function (step) { return '<li>' + esc(step) + '</li>'; }).join('') + '</ol>' +
        '<div class="emergency-line">' + icon('phone') + '<div><span>Cần hỗ trợ y tế khẩn cấp</span><strong>Gọi 115</strong></div></div>' +
      '</section>' : '';

    root.innerHTML =
      '<section class="card farm-profile">' +
        '<div class="farm-profile-head">' +
          '<span class="farm-avatar" aria-hidden="true">' + farm.emoji + '</span>' +
          '<div class="farm-title"><span class="kicker">' + (lot.status === 'danger' ? 'Nguồn gốc không xác thực' : 'Trang trại sản xuất') + '</span>' +
          '<h3>' + esc(farm.name) + '</h3><p>' + icon('map-pin') + ' ' + esc(farm.address) + '</p></div>' +
        '</div>' +
        '<p class="farm-story">' + esc(farm.story) + '</p>' +
        certChips +
        '<dl class="farm-facts">' +
          '<div><dt>Chủ hộ / đơn vị</dt><dd>' + esc(farm.owner) + '</dd></div>' +
          '<div><dt>Diện tích</dt><dd>' + esc(farm.area) + '</dd></div>' +
          '<div><dt>Hoạt động từ</dt><dd>' + esc(farm.since) + '</dd></div>' +
          '<div><dt>Giống / độ tuổi</dt><dd>' + esc(farm.breed) + ' · ' + esc(farm.age) + '</dd></div>' +
        '</dl>' +
      '</section>' +
      '<div class="chain-stats">' + lot.chainFacts.map(function (fact) {
        return '<div class="chain-stat"><span class="chain-stat-icon">' + icon(fact.icon) + '</span><div><small>' + esc(fact.label) + '</small><strong>' + esc(fact.value) + '</strong></div></div>';
      }).join('') + '</div>' +
      '<section class="card">' +
        '<div class="sec-head"><div><span class="kicker">Vị trí</span><h3>Trang trại trên bản đồ</h3></div></div>' +
        mapMarkup(lot, true) +
        '<div class="fact-grid fact-grid-2">' +
          '<div class="fact"><span>Lô hàng</span><strong>' + esc(lot.code) + '</strong></div>' +
          '<div class="fact"><span>Điểm bán</span><strong>' + esc(lot.market) + '</strong></div>' +
        '</div>' +
      '</section>' +
      '<section class="card journey-card">' +
        '<div class="sec-head"><div><span class="kicker">Hành trình lô hàng</span><h3>' + lot.journey.length + ' mốc truy xuất</h3></div><span class="pill">' + esc(meta.tagName) + '</span></div>' +
        '<ol class="timeline">' + journey + '</ol>' +
        '<p class="tiny-note">' + icon('info') + ' Các mốc thời gian và chứng từ trong bản demo là dữ liệu minh hoạ.</p>' +
      '</section>' +
      certBlock +
      '<section class="card">' +
        '<div class="sec-head"><div><span class="kicker">Khuyến nghị</span><h3>Bảo quản & sử dụng</h3></div></div>' +
        '<p class="body-copy">' + esc(lot.handling) + '</p>' +
        '<ul class="check-list">' +
          '<li>' + icon('thermometer') + '<span>Nhiệt độ bảo quản khuyến nghị: <strong>' + esc(lot.storage) + '</strong>.</span></li>' +
          '<li>' + icon('clock') + '<span>Dùng tốt nhất: <strong>' + esc(lot.bestBefore) + '</strong> (' + esc(lot.useWithin) + ').</span></li>' +
          '<li>' + icon('shield') + '<span>Đơn vị kiểm định: <strong>' + esc(lot.inspector) + '</strong>.</span></li>' +
        '</ul>' +
      '</section>' +
      safetyBlock +
      '<p class="view-disclaimer">' + icon('info') + ' Trang trại, chứng nhận và lịch trình trên đây đều là dữ liệu hư cấu cho mục đích trình diễn sản phẩm.</p>';
  }

  /* ---------- chứng nhận, tem mẫu, lịch sử ---------- */

  function renderCertificate() {
    const lot = currentLot();
    const meta = metaOf(lot.status);
    const tone = toneOf(lot.status);
    const container = $('#certContent');
    if (!container) return;

    if (!lot.certNo) {
      container.innerHTML = '<div class="cert-empty">' + icon('alert') + '<h2 id="certTitle">Không có chứng nhận</h2><p>Mã lô này không có dữ liệu kiểm định được xác thực. Không sử dụng lô hàng.</p><button type="button" class="btn btn-primary btn-block" data-close="certModal">Đóng</button></div>';
      return;
    }

    const title = lot.status === 'warning' ? 'PHIẾU KẾT QUẢ KIỂM NGHIỆM' : 'GIẤY CHỨNG NHẬN AN TOÀN THỰC PHẨM';
    const result = lot.status === 'warning' ? 'ĐẠT — KHUYẾN NGHỊ NẤU CHÍN KỸ' : 'ĐẠT YÊU CẦU';
    const note = lot.status === 'warning'
      ? 'Lô hàng đạt chỉ tiêu kiểm nghiệm tại thời điểm lấy mẫu. Tem cảm biến đã chuyển sang màu cam, cần nấu chín kỹ và sử dụng ngay trong ngày.'
      : 'Lô hàng đạt các chỉ tiêu an toàn thực phẩm tại thời điểm kiểm nghiệm. Tiếp tục bảo quản đúng nhiệt độ và theo dõi màu tem trước khi sử dụng.';

    container.innerHTML =
      '<div class="cert-paper tone-' + tone + '">' +
        '<span class="cert-watermark" aria-hidden="true">DEMO</span>' +
        '<div class="cert-ribbon">BẢN MINH HOẠ · KHÔNG CÓ GIÁ TRỊ PHÁP LÝ</div>' +
        '<div class="cert-brand">' + icon('leaf') + '<span><strong>FreshTag</strong><small>Tem thông minh · Truy xuất nguồn gốc</small></span></div>' +
        '<h2 class="cert-title" id="certTitle">' + title + '</h2>' +
        '<p class="cert-lead">Chứng nhận cho lô hàng <strong>' + esc(lot.code) + '</strong></p>' +
        '<div class="cert-result tone-' + tone + '"><span>' + icon(lot.status === 'safe' ? 'check-circle' : 'alert') + '</span><div><small>Kết quả kiểm nghiệm</small><strong>' + result + '</strong></div></div>' +
        '<dl class="cert-fields">' +
          '<div><dt>Sản phẩm</dt><dd>' + esc(lot.product) + '</dd></div>' +
          '<div><dt>Cơ sở sản xuất</dt><dd>' + esc(lot.farm.name) + '</dd></div>' +
          '<div><dt>Số chứng nhận</dt><dd>' + esc(lot.certNo) + '</dd></div>' +
          '<div><dt>Đơn vị cấp</dt><dd>' + esc(lot.inspector) + '</dd></div>' +
          '<div><dt>Ngày kiểm nghiệm</dt><dd>' + esc(lot.inspectedAt) + '</dd></div>' +
          '<div><dt>Hiệu lực đến</dt><dd>' + esc(lot.certValidUntil) + '</dd></div>' +
        '</dl>' +
        '<p class="cert-note">' + esc(note) + '</p>' +
        '<div class="cert-signature"><div><span>Người phụ trách kiểm nghiệm</span><strong>Nguyễn Minh An</strong><small>Bản demo — không có chữ ký số</small></div><div class="cert-stamp"><span>FRESHTAG</span><strong>DEMO</strong></div></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-block" data-close="certModal">Đóng chứng nhận</button>' +
      '<p class="tiny-note">' + icon('info') + ' Đây là chứng nhận minh hoạ cho sản phẩm demo. Không dùng để đánh giá thực phẩm thật.</p>';
  }

  function renderSamples() {
    const list = $('#samplesList');
    if (!list) return;
    list.innerHTML = SAMPLE_ORDER.map(function (code) {
      const lot = LOTS[code];
      if (!lot) return '';
      const meta = metaOf(lot.status);
      const current = code === state.currentCode;
      return '<button type="button" class="sample-row tone-' + toneOf(lot.status) + (current ? ' is-current' : '') + '" data-sample="' + esc(code) + '">' +
        '<span class="sample-emoji" aria-hidden="true">' + lot.emoji + '</span>' +
        '<span class="sample-copy">' +
          '<span class="sample-name">' + esc(lot.product) + (current ? '<em>Đang xem</em>' : '') + '</span>' +
          '<span class="sample-meta"><i class="status-dot"></i> ' + esc(code) + ' · ' + esc(meta.label) + '</span>' +
        '</span>' +
        '<span class="sample-qr" data-qr-code="' + esc(code) + '" aria-hidden="true">' + icon('qr') + '</span>' +
      '</button>';
    }).join('');
  }

  function generateSampleQrs() {
    if (!window.qrcode) return;
    $$('.sample-qr[data-qr-code]').forEach(function (container) {
      if (container.dataset.qrReady === '1') return;
      try {
        const code = container.getAttribute('data-qr-code');
        const qr = window.qrcode(0, 'M');
        qr.addData(qrTarget(code));
        qr.make();
        container.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true, alt: { text: 'Mã QR cho lô ' + code } });
        container.dataset.qrReady = '1';
      } catch (error) {
        /* giữ icon dự phòng */
      }
    });
  }

  function openSamples() {
    if (!$('#scannerOverlay').hidden) closeOverlay('scannerOverlay');
    renderSamples();
    openOverlay('samplesModal');
    ensureQrcodeLib().then(generateSampleQrs).catch(function () {
      /* QR không bắt buộc — người dùng vẫn chọn tem bằng nút */
    });
  }

  function timeAgo(timestamp) {
    const diff = Math.max(0, Date.now() - timestamp);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'Vừa xong';
    if (diff < hour) return Math.floor(diff / minute) + ' phút trước';
    if (diff < day) return Math.floor(diff / hour) + ' giờ trước';
    if (diff < 7 * day) return Math.floor(diff / day) + ' ngày trước';
    return new Date(timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function renderHistory() {
    const list = $('#historyList');
    const clearBtn = $('#btnClearHistory');
    if (!list) return;

    if (!state.history.length) {
      list.innerHTML = '<div class="empty-state">' + icon('history') + '<strong>Chưa có lịch sử quét</strong><p>Các tem bạn quét hoặc mở sẽ được lưu tại đây, chỉ trên thiết bị này.</p></div>';
      if (clearBtn) clearBtn.disabled = true;
      return;
    }

    if (clearBtn) clearBtn.disabled = false;
    list.innerHTML = state.history.map(function (entry) {
      const lot = LOTS[entry.code];
      if (!lot) return '';
      const meta = metaOf(lot.status);
      return '<button type="button" class="history-row" data-history-code="' + esc(entry.code) + '">' +
        '<span class="history-emoji" aria-hidden="true">' + lot.emoji + '</span>' +
        '<span class="history-copy"><strong>' + esc(lot.product) + '</strong><span>' + esc(entry.code) + ' · ' + timeAgo(entry.at) + '</span></span>' +
        '<span class="history-status tone-' + toneOf(lot.status) + '"><i></i>' + esc(meta.label) + '</span>' +
        icon('chevron-right') +
      '</button>';
    }).join('');
  }

  function openHistory() {
    if (!$('#scannerOverlay').hidden) closeOverlay('scannerOverlay');
    resetClearHistoryButton();
    renderHistory();
    openOverlay('historyModal');
  }

  function loadHistory() {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      state.history = parsed.filter(function (entry) {
        return entry && typeof entry.code === 'string' && LOTS[entry.code] && typeof entry.at === 'number';
      }).slice(0, MAX_HISTORY);
    } catch (error) {
      state.history = [];
    }
  }

  function saveHistory() {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch (error) {
      /* chế độ riêng tư có thể chặn localStorage */
    }
  }

  function addHistory(code) {
    if (!LOTS[code]) return;
    state.history = state.history.filter(function (entry) { return entry.code !== code; });
    state.history.unshift({ code: code, at: Date.now() });
    state.history = state.history.slice(0, MAX_HISTORY);
    saveHistory();
    if (!$('#historyModal').hidden) renderHistory();
  }

  /* ---------- mô phỏng tem ---------- */

  function storageLabel(storage) {
    if (storage === 30) return 'ngoài trời 30°C';
    if (storage === 4) return 'tủ lạnh 4°C';
    return 'ngăn mát 2°C';
  }

  function simDayLabel(days) {
    if (days === 0) return 'Hôm nay';
    if (days === 0.5) return '12 giờ';
    return 'Ngày ' + num(days);
  }

  function updateSim() {
    const storage = state.sim.storage;
    const days = state.sim.days;
    const factor = storage === 2 ? 1 : (storage === 4 ? 1.9 : 6.2);
    const tvbn = 6 + days * factor * 1.5;
    let status = 'safe';
    if (tvbn > 25) status = 'danger';
    else if (tvbn > 15) status = 'warning';

    state.sim.status = status;
    state.sim.tvbn = tvbn;

    const meta = metaOf(status);
    const tone = toneOf(status);
    const stage = $('#simStage');
    const disc = $('#simDisc');
    if (!stage || !disc) return;

    stage.className = 'sim-stage tone-' + tone;
    disc.className = 'tag-disc tone-' + tone;
    const tagText = $('#simTagText');
    const tagSub = $('#simTagSub');
    const simStatus = $('#simStatus');
    const simDesc = $('#simDesc');
    const simTvbn = $('#simTvbn');
    const daysOut = $('#simDaysOut');
    const range = $('#simDays');
    if (tagText) tagText.textContent = meta.tagText;
    if (tagSub) tagSub.textContent = meta.tagSub;
    if (simTvbn) simTvbn.textContent = num(tvbn.toFixed(1));
    if (daysOut) daysOut.textContent = simDayLabel(days);
    if (range) range.setAttribute('aria-valuetext', simDayLabel(days));

    const iconUse = disc.querySelector('.tag-disc-icon use');
    if (iconUse) iconUse.setAttribute('href', '#i-' + meta.icon);

    if (status === 'safe') {
      if (simStatus) simStatus.textContent = 'Vùng an toàn';
      if (simDesc) simDesc.textContent = 'Sau ' + simDayLabel(days).toLowerCase() + ' ở ' + storageLabel(storage) + ', tem vẫn xanh. Thịt nằm trong ngưỡng an toàn, có thể chế biến ngay.';
    } else if (status === 'warning') {
      if (simStatus) simStatus.textContent = 'Ngưỡng cần nấu chín';
      if (simDesc) simDesc.textContent = 'Sau ' + simDayLabel(days).toLowerCase() + ' ở ' + storageLabel(storage) + ', tem chuyển cam. Hãy nấu chín kỹ ngay hôm nay, không ăn tái.';
    } else {
      if (simStatus) simStatus.textContent = 'Vượt ngưỡng an toàn';
      if (simDesc) simDesc.textContent = 'Sau ' + simDayLabel(days).toLowerCase() + ' ở ' + storageLabel(storage) + ', tem chuyển tím thẫm. Không nên sử dụng lô thịt này.';
    }
  }

  /* ---------- điều hướng & chọn lô ---------- */

  function setTab(tab, options) {
    if (TABS.indexOf(tab) === -1) tab = 'scan';
    state.tab = tab;
    $$('.view').forEach(function (view) {
      view.hidden = view.id !== 'view-' + tab;
    });
    $$('.tab').forEach(function (button) {
      const active = button.getAttribute('data-tab') === tab;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (!options || options.updateUrl !== false) syncUrl();
    if (!options || options.scroll !== false) scrollToTop();
  }

  function selectLot(rawCode, options) {
    const settings = options || {};
    const code = resolveCode(rawCode);
    if (!code) {
      if (!settings.silent) toast('Không tìm thấy mã tem này trong bản demo.', 3200);
      return false;
    }
    state.currentCode = code;
    renderResult();
    renderRecipes();
    renderFarm();
    if (settings.tab) setTab(settings.tab, { updateUrl: false, scroll: false });
    if (settings.record !== false) addHistory(code);
    if (settings.updateUrl !== false) syncUrl();
    if (settings.scroll) {
      window.setTimeout(function () { scrollToElement($('#resultRoot')); }, 90);
    }
    if (!settings.silent) toast('Đã mở ' + LOTS[code].product + ' · ' + code);
    return true;
  }

  /* ---------- đọc tiếng Việt ---------- */

  let speechToken = 0;

  function resetSpeechUi() {
    $$('.is-speaking').forEach(function (button) { button.classList.remove('is-speaking'); });
    const header = $('#btnReadPage');
    if (header) {
      const use = header.querySelector('use');
      const label = header.querySelector('span');
      if (use) use.setAttribute('href', '#i-volume');
      if (label) label.textContent = 'Đọc';
      header.setAttribute('aria-label', 'Đọc thông tin đang xem');
    }
    activeSpeakButton = null;
  }

  function speak(text, button) {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      toast('Thiết bị hoặc trình duyệt này không hỗ trợ đọc thành tiếng.', 3400);
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) {
      synth.cancel();
      if (activeSpeakButton === button) {
        resetSpeechUi();
        return;
      }
    }
    resetSpeechUi();
    const token = ++speechToken;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.93;
    utterance.pitch = 1;
    utterance.onend = function () {
      if (token === speechToken) resetSpeechUi();
    };
    utterance.onerror = function () {
      if (token === speechToken) resetSpeechUi();
    };
    activeSpeakButton = button || null;
    if (button) {
      button.classList.add('is-speaking');
      if (button.id === 'btnReadPage') {
        const use = button.querySelector('use');
        const label = button.querySelector('span');
        if (use) use.setAttribute('href', '#i-stop');
        if (label) label.textContent = 'Dừng';
        button.setAttribute('aria-label', 'Dừng đọc');
      }
    }
    synth.speak(utterance);
  }

  function lotSpeech(lot) {
    const meta = metaOf(lot.status);
    return 'Kết quả quét tem FreshTag. ' + lot.product + ', lô ' + lot.code.replace(/-/g, ' ') + '. ' +
      meta.headline + '. ' + lot.statusDesc + ' Tem đang màu ' + meta.tagName + '. ' +
      'Hạn sử dụng tốt nhất ' + lot.bestBefore + '. ' + lot.handling;
  }

  function pageSpeech() {
    const lot = currentLot();
    const meta = metaOf(lot.status);
    if (state.tab === 'tag') {
      const simMeta = metaOf(state.sim.status);
      return 'Tem thông minh FreshTag đổi màu theo độ tươi. Trong mô phỏng, sau ' +
        simDayLabel(state.sim.days).toLowerCase() + ' bảo quản ở ' + storageLabel(state.sim.storage) +
        ', tem chuyển sang màu ' + simMeta.tagName + '. ' + simMeta.advice +
        ' Lưu ý: mô phỏng chỉ mang tính minh hoạ.';
    }
    if (state.tab === 'recipes') {
      if (lot.status === 'danger' || !lot.recipes.length) {
        return 'Cảnh báo. ' + lot.product + ' lô ' + lot.code.replace(/-/g, ' ') + ' không an toàn để sử dụng. ' +
          lot.statusDesc + ' ' + (lot.safetySteps || []).join(' ');
      }
      return 'Gợi ý món ngon cho ' + lot.product + '. Có ' + lot.recipes.length + ' công thức: ' +
        lot.recipes.map(function (recipe) { return recipe.title; }).join('; ') +
        '. Chạm vào từng món để xem nguyên liệu và cách làm.';
    }
    if (state.tab === 'farm') {
      return 'Truy xuất nguồn gốc lô ' + lot.code.replace(/-/g, ' ') + '. ' + lot.farm.name + ', ' +
        lot.farm.address + '. ' + lot.farm.story + ' Hành trình lô hàng gồm ' + lot.journey.length +
        ' mốc, từ trang trại đến ' + lot.market + '. Trạng thái hiện tại: ' + meta.headline + '.';
    }
    return lotSpeech(lot);
  }

  function recipeSpeech(recipe, lot) {
    const steps = recipe.steps.map(function (step, index) { return 'Bước ' + (index + 1) + ': ' + step; }).join(' ');
    return 'Công thức ' + recipe.title + '. Thời gian ' + recipe.time + ', độ khó ' + recipe.difficulty +
      ', cho ' + recipe.servings + '. Nguyên liệu: ' + recipe.ingredients.join('; ') + '. Cách làm: ' + steps +
      '. Mẹo nhỏ: ' + recipe.tip + (lot.status === 'warning' ? ' Lưu ý, lô thịt này đang ở mức cam, hãy nấu chín kỹ và dùng ngay trong hôm nay.' : '');
  }

  /* ---------- lớp phủ, hộp thoại ---------- */

  function getActiveOverlay() {
    return $('.overlay:not([hidden])');
  }

  function openOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay || !overlay.hidden) return;
    const previousFocus = activeModalFocus;
    const existing = getActiveOverlay();
    if (existing) closeOverlay(existing.id, { restoreFocus: false });
    activeModalFocus = previousFocus || document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('is-locked');
    window.setTimeout(function () {
      const target = overlay.querySelector('[data-autofocus]') || overlay.querySelector('.dialog-close, .sheet-head .round-btn, .scanner-topbar .round-btn, button');
      if (target) target.focus({ preventScroll: true });
    }, 70);
  }

  function closeOverlay(id, options) {
    const overlay = document.getElementById(id);
    if (!overlay || overlay.hidden) return;
    if (id === 'scannerOverlay') stopScannerCamera();
    overlay.hidden = true;
    if (!getActiveOverlay()) document.body.classList.remove('is-locked');
    if (!options || options.restoreFocus !== false) {
      const target = activeModalFocus;
      activeModalFocus = null;
      if (target && document.contains(target)) {
        window.setTimeout(function () { target.focus({ preventScroll: true }); }, 20);
      }
    }
  }

  function trapFocus(event) {
    const overlay = getActiveOverlay();
    if (!overlay) return;
    const focusables = $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])', overlay)
      .filter(function (element) { return element.offsetParent !== null; });
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleGlobalKeydown(event) {
    if (event.key === 'Escape') {
      const overlay = getActiveOverlay();
      if (overlay) {
        event.preventDefault();
        closeOverlay(overlay.id);
      }
      return;
    }
    if (event.key === 'Tab') trapFocus(event);
  }

  function openCertificate() {
    const lot = currentLot();
    if (!lot.certNo) {
      toast('Lô này không có chứng nhận để hiển thị.', 3000);
      return;
    }
    renderCertificate();
    openOverlay('certModal');
  }

  /* ---------- trình quét camera ---------- */

  function resetScannerUi() {
    const overlay = $('#scannerOverlay');
    const placeholder = $('#scannerPlaceholder');
    const status = $('#scannerStatus');
    const video = $('#scannerVideo');
    const form = $('#manualForm');
    const input = $('#manualCode');
    const torch = $('#btnTorch');
    if (overlay) overlay.classList.remove('is-live', 'is-success');
    if (placeholder) {
      placeholder.hidden = false;
      const title = placeholder.querySelector('p');
      const hint = placeholder.querySelector('small');
      if (title) title.textContent = 'Đang khởi động camera…';
      if (hint) hint.textContent = 'Nếu trình duyệt hỏi quyền camera, hãy chọn “Cho phép”.';
    }
    if (status) {
      status.textContent = 'Đang chuẩn bị…';
      status.classList.remove('is-error', 'is-success');
    }
    if (video) video.srcObject = null;
    if (form) form.hidden = true;
    if (input) {
      input.value = '';
      input.classList.remove('is-invalid');
    }
    if (torch) {
      torch.hidden = true;
      torch.classList.remove('is-active');
      torch.setAttribute('aria-pressed', 'false');
    }
    scanner.lastCode = '';
    scanner.lastAt = 0;
    scanner.torchOn = false;
  }

  function openScanner() {
    if (!getActiveOverlay() || getActiveOverlay().id !== 'scannerOverlay') {
      resetScannerUi();
      openOverlay('scannerOverlay');
    }
    scanner.active = true;
    const session = ++scanner.session;
    startCamera(session);
  }

  function stopScannerCamera() {
    scanner.active = false;
    scanner.session += 1;
    window.clearTimeout(scanner.timer);
    scanner.timer = null;
    if (scanner.stream) {
      scanner.stream.getTracks().forEach(function (track) { track.stop(); });
      scanner.stream = null;
    }
    const video = $('#scannerVideo');
    if (video) video.srcObject = null;
    scanner.native = false;
    scanner.detector = null;
    scanner.torchOn = false;
    const torch = $('#btnTorch');
    if (torch) {
      torch.hidden = true;
      torch.classList.remove('is-active');
      torch.setAttribute('aria-pressed', 'false');
    }
  }

  function scannerError(message) {
    scanner.active = false;
    window.clearTimeout(scanner.timer);
    scanner.timer = null;
    if (scanner.stream) {
      scanner.stream.getTracks().forEach(function (track) { track.stop(); });
      scanner.stream = null;
    }
    const overlay = $('#scannerOverlay');
    const placeholder = $('#scannerPlaceholder');
    const status = $('#scannerStatus');
    if (overlay) overlay.classList.remove('is-live');
    if (placeholder) {
      placeholder.hidden = false;
      const title = placeholder.querySelector('p');
      const hint = placeholder.querySelector('small');
      if (title) title.textContent = message;
      if (hint) hint.textContent = 'Bạn vẫn có thể nhập mã tem hoặc chọn tem mẫu bên dưới.';
    }
    if (status) {
      status.textContent = 'Camera không khả dụng';
      status.classList.add('is-error');
    }
    showManualForm();
  }

  function showManualForm() {
    const form = $('#manualForm');
    const input = $('#manualCode');
    if (!form) return;
    form.hidden = false;
    if (input) {
      input.classList.remove('is-invalid');
      window.setTimeout(function () { input.focus({ preventScroll: true }); }, 80);
    }
  }

  function setupTorch(stream) {
    const track = stream.getVideoTracks()[0];
    const torch = $('#btnTorch');
    if (!track || !torch) return;
    let supported = false;
    try {
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      supported = Boolean(capabilities && capabilities.torch);
    } catch (error) {
      supported = false;
    }
    torch.hidden = !supported;
  }

  async function toggleTorch() {
    const torch = $('#btnTorch');
    const track = scanner.stream && scanner.stream.getVideoTracks()[0];
    if (!track || !torch) return;
    const next = !scanner.torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      scanner.torchOn = next;
      torch.classList.toggle('is-active', next);
      torch.setAttribute('aria-pressed', String(next));
      torch.setAttribute('aria-label', next ? 'Tắt đèn pin' : 'Bật đèn pin');
    } catch (error) {
      toast('Không bật được đèn pin trên thiết bị này.', 2600);
    }
  }

  async function startCamera(session) {
    const video = $('#scannerVideo');
    const overlay = $('#scannerOverlay');
    const placeholder = $('#scannerPlaceholder');
    const status = $('#scannerStatus');
    if (!video || !overlay) return;

    if (!window.isSecureContext) {
      scannerError('Camera cần kết nối HTTPS. Hãy mở trang qua GitHub Pages hoặc localhost.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      scannerError('Trình duyệt này không hỗ trợ camera trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (!scanner.active || session !== scanner.session) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }

      scanner.stream = stream;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (error) {
        /* autoplay muted thường được phép; lỗi sẽ hiện ở khung hình */
      }

      if (!scanner.active || session !== scanner.session) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        return;
      }

      if (placeholder) placeholder.hidden = true;
      overlay.classList.add('is-live');
      if (status) {
        status.textContent = 'Đưa mã QR vào khung';
        status.classList.remove('is-error');
      }
      setupTorch(stream);

      scanner.native = false;
      scanner.detector = null;
      if ('BarcodeDetector' in window) {
        try {
          scanner.detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          scanner.native = true;
        } catch (error) {
          scanner.native = false;
        }
      }

      if (!scanner.native) {
        if (status) status.textContent = 'Đang nạp bộ đọc mã…';
        try {
          await ensureJsQrLib();
        } catch (error) {
          scannerError('Không tải được bộ đọc mã QR. Hãy nhập mã hoặc chọn tem mẫu.');
          return;
        }
        if (!scanner.active || session !== scanner.session) return;
        if (status) status.textContent = 'Đưa mã QR vào khung';
      }

      scanner.timer = window.setTimeout(detectFrame, 260);
    } catch (error) {
      let message = 'Không mở được camera. Hãy thử lại hoặc nhập mã tem.';
      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
        message = 'Quyền camera bị từ chối. Hãy cho phép camera trong cài đặt trình duyệt.';
      } else if (error && (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError')) {
        message = 'Không tìm thấy camera trên thiết bị này.';
      } else if (error && (error.name === 'NotReadableError' || error.name === 'TrackStartError')) {
        message = 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
      } else if (error && error.name === 'OverconstrainedError') {
        message = 'Camera không hỗ trợ cấu hình yêu cầu. Hãy thử lại.';
      }
      scannerError(message);
    }
  }

  async function detectFrame() {
    if (!scanner.active) return;
    const video = $('#scannerVideo');
    let found = null;

    try {
      if (video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        if (scanner.native && scanner.detector) {
          const codes = await scanner.detector.detect(video);
          if (codes && codes.length) found = codes[0].rawValue;
        } else if (window.jsQR) {
          if (!scanner.canvas) scanner.canvas = document.createElement('canvas');
          const maxSide = 720;
          const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
          const width = Math.max(1, Math.round(video.videoWidth * scale));
          const height = Math.max(1, Math.round(video.videoHeight * scale));
          scanner.canvas.width = width;
          scanner.canvas.height = height;
          const context = scanner.canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(video, 0, 0, width, height);
          const image = context.getImageData(0, 0, width, height);
          const result = window.jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });
          if (result && result.data) found = result.data;
        }
      }
    } catch (error) {
      if (scanner.native) {
        scanner.native = false;
        try { await ensureJsQrLib(); } catch (libError) { /* để vòng lặp sau thử lại */ }
      }
    }

    if (found && scanner.active) handleScannedValue(found);
    if (scanner.active) scanner.timer = window.setTimeout(detectFrame, 230);
  }

  function handleScannedValue(value) {
    const now = Date.now();
    if (value === scanner.lastCode && now - scanner.lastAt < 1800) return;
    scanner.lastCode = value;
    scanner.lastAt = now;
    const code = resolveCode(value);
    if (code) {
      scanSuccess(code);
      return;
    }
    const status = $('#scannerStatus');
    if (status) {
      status.textContent = 'Mã chưa có trong dữ liệu demo. Thử một tem mẫu bên dưới.';
      status.classList.add('is-error');
    }
    window.setTimeout(function () {
      if (!scanner.active) return;
      if (status) {
        status.textContent = 'Đưa mã QR vào khung';
        status.classList.remove('is-error');
      }
    }, 2600);
  }

  function beep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      if (context.state === 'suspended') context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.19);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      window.setTimeout(function () { context.close().catch(function () {}); }, 500);
    } catch (error) {
      /* âm thanh không bắt buộc */
    }
  }

  function scanSuccess(code) {
    if (!scanner.active) return;
    scanner.active = false;
    window.clearTimeout(scanner.timer);
    scanner.timer = null;
    const overlay = $('#scannerOverlay');
    const status = $('#scannerStatus');
    if (overlay) overlay.classList.add('is-success');
    if (status) {
      status.textContent = 'Đã nhận mã ' + code;
      status.classList.add('is-success');
      status.classList.remove('is-error');
    }
    beep();
    if (navigator.vibrate) {
      try { navigator.vibrate(120); } catch (error) { /* bỏ qua */ }
    }
    if (scanner.stream) {
      scanner.stream.getTracks().forEach(function (track) { track.stop(); });
      scanner.stream = null;
    }
    window.setTimeout(function () {
      closeOverlay('scannerOverlay');
      selectLot(code, { tab: 'scan', scroll: true, record: true, silent: true });
      toast('Đã quét ' + LOTS[code].product + ' · ' + code, 3000);
    }, 480);
  }

  /* ---------- giao diện sáng/tối ---------- */

  let clearHistoryTimer = null;

  function applyTheme(theme, persist) {
    const next = theme === 'dark' ? 'dark' : 'light';
    state.theme = next;
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', next === 'dark' ? '#071a14' : '#064e3b');
    const button = $('#btnTheme');
    if (button) {
      const label = next === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(next === 'dark'));
    }
    if (persist) {
      try { window.localStorage.setItem(THEME_KEY, next); } catch (error) { /* bỏ qua */ }
    }
  }

  function preferredTheme() {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (error) {
      /* chế độ riêng tư có thể chặn localStorage */
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark', true);
  }

  function watchSystemTheme() {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = function (event) {
      let saved = null;
      try { saved = window.localStorage.getItem(THEME_KEY); } catch (error) { /* bỏ qua */ }
      if (saved === 'dark' || saved === 'light') return;
      applyTheme(event.matches ? 'dark' : 'light', false);
    };
    if (media.addEventListener) media.addEventListener('change', handler);
    else if (media.addListener) media.addListener(handler);
  }

  /* ---------- chia sẻ ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      area.style.pointerEvents = 'none';
      document.body.appendChild(area);
      area.select();
      try {
        const copied = document.execCommand('copy');
        document.body.removeChild(area);
        if (copied) resolve();
        else reject(new Error('Không sao chép được'));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  async function shareCurrent() {
    const lot = currentLot();
    const meta = metaOf(lot.status);
    const url = buildLotUrl(lot.code, state.tab);
    const title = 'FreshTag — ' + lot.product;
    const text = lot.product + ' (' + lot.code + '): ' + meta.headline + '.';
    if (navigator.share) {
      try {
        await navigator.share({ title: title, text: text, url: url });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    try {
      await copyText(url);
      toast('Đã sao chép liên kết tem.');
    } catch (error) {
      window.prompt('Sao chép liên kết tem:', url);
    }
  }

  /* ---------- cài đặt PWA ---------- */

  function isStandalone() {
    return Boolean(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  }

  function installDismissed() {
    try { return window.localStorage.getItem(INSTALL_KEY) === '1'; } catch (error) { return false; }
  }

  function showInstallBanner() {
    const banner = $('#installBanner');
    if (!banner || !state.deferredPrompt || installDismissed() || isStandalone()) return;
    banner.hidden = false;
    window.requestAnimationFrame(function () { banner.classList.add('is-visible'); });
  }

  function hideInstallBanner() {
    const banner = $('#installBanner');
    if (!banner) return;
    banner.classList.remove('is-visible');
    window.setTimeout(function () { banner.hidden = true; }, 240);
  }

  function dismissInstall() {
    try { window.localStorage.setItem(INSTALL_KEY, '1'); } catch (error) { /* bỏ qua */ }
    hideInstallBanner();
  }

  async function promptInstall() {
    const promptEvent = state.deferredPrompt;
    if (!promptEvent) {
      hideInstallBanner();
      toast('Trình duyệt chưa sẵn sàng cài đặt. Hãy dùng menu trình duyệt.', 3200);
      return;
    }
    state.deferredPrompt = null;
    hideInstallBanner();
    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') toast('FreshTag đang được cài trên thiết bị.');
      else toast('Bạn có thể cài FreshTag sau từ menu trình duyệt.');
    } catch (error) {
      toast('Không mở được hộp thoại cài đặt. Hãy dùng menu trình duyệt.', 3200);
    }
  }

  function setupInstall() {
    if (isStandalone()) return;
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      state.deferredPrompt = event;
      if (!installDismissed()) window.setTimeout(showInstallBanner, 3200);
    });
    window.addEventListener('appinstalled', function () {
      state.deferredPrompt = null;
      hideInstallBanner();
      toast('FreshTag đã được cài trên thiết bị.');
    });
  }

  /* ---------- service worker ---------- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    const start = function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* chế độ riêng tư hoặc trình duyệt cũ có thể từ chối */
      });
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  }

  /* ---------- xoá lịch sử ---------- */

  function resetClearHistoryButton() {
    window.clearTimeout(clearHistoryTimer);
    clearHistoryTimer = null;
    const button = $('#btnClearHistory');
    if (!button) return;
    button.dataset.armed = '0';
    button.classList.remove('is-danger');
    button.innerHTML = icon('trash') + ' Xoá';
    button.setAttribute('aria-label', 'Xoá lịch sử quét');
  }

  function handleClearHistory() {
    const button = $('#btnClearHistory');
    if (!button) return;
    if (button.dataset.armed === '1') {
      window.clearTimeout(clearHistoryTimer);
      clearHistoryTimer = null;
      state.history = [];
      saveHistory();
      renderHistory();
      resetClearHistoryButton();
      toast('Đã xoá lịch sử quét trên thiết bị này.');
      return;
    }
    button.dataset.armed = '1';
    button.classList.add('is-danger');
    button.innerHTML = icon('trash') + ' Xác nhận xoá';
    button.setAttribute('aria-label', 'Xác nhận xoá toàn bộ lịch sử quét');
    clearHistoryTimer = window.setTimeout(resetClearHistoryButton, 4000);
  }

  /* ---------- trạng thái ban đầu từ URL ---------- */

  function readInitialState() {
    let selected = state.currentCode;
    let tab = state.tab;
    let unknown = '';
    let hasLot = false;
    let hasTab = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const lotParam = params.get('lot') || params.get('code');
      const tabParam = params.get('tab');
      if (lotParam) {
        const resolved = resolveCode(lotParam);
        if (resolved) {
          selected = resolved;
          hasLot = true;
        } else {
          unknown = lotParam;
        }
      }
      if (tabParam && TABS.indexOf(tabParam) !== -1) {
        tab = tabParam;
        hasTab = true;
      }
      state.currentCode = selected;
      state.tab = tab;
      state.initialLotLink = hasLot;
      state.initialDeepLink = hasLot || hasTab;
      state.unknownParam = unknown;
      if (hasLot) addHistory(selected);
    } catch (error) {
      state.initialLotLink = false;
      state.initialDeepLink = false;
      state.unknownParam = '';
    }
  }

  /* ---------- tương tác ---------- */

  function setSimStorage(value) {
    if (value !== 2 && value !== 4 && value !== 30) return;
    state.sim.storage = value;
    $$('.segmented [data-storage]').forEach(function (button) {
      const active = Number(button.getAttribute('data-storage')) === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    updateSim();
  }

  function runAction(action) {
    if (action === 'share') {
      shareCurrent();
    } else if (action === 'cert') {
      openCertificate();
    } else if (action === 'samples') {
      openSamples();
    } else if (action === 'scan') {
      openScanner();
    } else if (action === 'scroll-safety') {
      const card = $('#safetyCard');
      if (card) {
        scrollToElement(card);
        card.classList.add('is-highlight');
        window.setTimeout(function () { card.classList.remove('is-highlight'); }, 1900);
      }
    }
  }

  function handleManualSubmit(event) {
    event.preventDefault();
    const input = $('#manualCode');
    if (!input) return;
    const code = resolveCode(input.value);
    if (!code) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      const status = $('#scannerStatus');
      if (status) {
        status.textContent = 'Mã chưa đúng. Thử FT-BEEF-8892 hoặc chọn tem mẫu bên dưới.';
        status.classList.add('is-error');
        status.classList.remove('is-success');
      }
      input.focus({ preventScroll: true });
      return;
    }
    closeOverlay('scannerOverlay');
    selectLot(code, { tab: 'scan', record: true, scroll: true });
  }

  function handleManualInput(event) {
    const input = event.currentTarget;
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const closeTrigger = target.closest('[data-close]');
    if (closeTrigger) {
      event.preventDefault();
      closeOverlay(closeTrigger.getAttribute('data-close'));
      return;
    }

    const speakRecipe = target.closest('.js-speak-recipe');
    if (speakRecipe) {
      const lot = currentLot();
      const recipeId = speakRecipe.getAttribute('data-recipe-id');
      const recipe = lot.recipes.filter(function (item) { return item.id === recipeId; })[0];
      if (recipe) speak(recipeSpeech(recipe, lot), speakRecipe);
      return;
    }

    const speakLot = target.closest('.js-speak-lot');
    if (speakLot) {
      speak(lotSpeech(currentLot()), speakLot);
      return;
    }

    const sample = target.closest('[data-sample]');
    if (sample) {
      const code = sample.getAttribute('data-sample');
      closeOverlay('samplesModal');
      selectLot(code, { tab: 'scan', scroll: true, record: true });
      return;
    }

    const historyRow = target.closest('[data-history-code]');
    if (historyRow) {
      const code = historyRow.getAttribute('data-history-code');
      closeOverlay('historyModal');
      selectLot(code, { tab: 'scan', scroll: true, record: true });
      return;
    }

    const demoCode = target.closest('[data-demo-code]');
    if (demoCode) {
      const code = demoCode.getAttribute('data-demo-code');
      closeOverlay('scannerOverlay');
      selectLot(code, { tab: 'scan', scroll: true, record: true });
      return;
    }

    const filter = target.closest('[data-filter]');
    if (filter) {
      state.recipeFilter = filter.getAttribute('data-filter');
      renderRecipes();
      return;
    }

    const storage = target.closest('[data-storage]');
    if (storage) {
      setSimStorage(Number(storage.getAttribute('data-storage')));
      return;
    }

    const goto = target.closest('[data-goto-tab]');
    if (goto) {
      const tab = goto.getAttribute('data-goto-tab');
      if (tab) setTab(tab);
      return;
    }

    const action = target.closest('[data-action]');
    if (action) {
      runAction(action.getAttribute('data-action'));
      return;
    }

    const tab = target.closest('.tab[data-tab]');
    if (tab) {
      setTab(tab.getAttribute('data-tab'));
      return;
    }

    if (target.classList.contains('overlay') &&
        (target.classList.contains('sheet-overlay') || target.classList.contains('center-overlay'))) {
      closeOverlay(target.id);
    }
  }

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleGlobalKeydown);

    const scanHero = $('#btnScanHero');
    if (scanHero) scanHero.addEventListener('click', openScanner);
    const samplesHero = $('#btnSamplesHero');
    if (samplesHero) samplesHero.addEventListener('click', openSamples);
    const history = $('#btnHistory');
    if (history) history.addEventListener('click', openHistory);
    const theme = $('#btnTheme');
    if (theme) theme.addEventListener('click', toggleTheme);
    const readPage = $('#btnReadPage');
    if (readPage) readPage.addEventListener('click', function () { speak(pageSpeech(), readPage); });
    const clearHistory = $('#btnClearHistory');
    if (clearHistory) clearHistory.addEventListener('click', handleClearHistory);

    const demoInfo = $('#btnDemoInfo');
    if (demoInfo) demoInfo.addEventListener('click', function () { openOverlay('infoModal'); });
    const footerInfo = $('#btnFooterInfo');
    if (footerInfo) footerInfo.addEventListener('click', function () { openOverlay('infoModal'); });
    const footerSamples = $('#btnFooterSamples');
    if (footerSamples) footerSamples.addEventListener('click', openSamples);

    const closeScanner = $('#btnCloseScanner');
    if (closeScanner) closeScanner.addEventListener('click', function () { closeOverlay('scannerOverlay'); });
    const torch = $('#btnTorch');
    if (torch) torch.addEventListener('click', toggleTorch);
    const manualCode = $('#btnManualCode');
    if (manualCode) manualCode.addEventListener('click', showManualForm);
    const samplesScan = $('#btnSamplesScan');
    if (samplesScan) samplesScan.addEventListener('click', openSamples);
    const manualForm = $('#manualForm');
    if (manualForm) manualForm.addEventListener('submit', handleManualSubmit);
    const manualInput = $('#manualCode');
    if (manualInput) manualInput.addEventListener('input', handleManualInput);

    const simDays = $('#simDays');
    if (simDays) {
      simDays.addEventListener('input', function () {
        state.sim.days = Number(simDays.value);
        updateSim();
      });
    }

    const install = $('#btnInstall');
    if (install) install.addEventListener('click', promptInstall);
    const dismissInstallButton = $('#btnDismissInstall');
    if (dismissInstallButton) dismissInstallButton.addEventListener('click', dismissInstall);

    window.addEventListener('pagehide', function () {
      stopScannerCamera();
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (error) { /* bỏ qua */ }
      }
    });

    window.addEventListener('storage', function (event) {
      if (event.key === THEME_KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
        applyTheme(event.newValue, false);
      }
      if (event.key === HISTORY_KEY) {
        loadHistory();
        if (!$('#historyModal').hidden) renderHistory();
      }
    });

    setupInstall();
    watchSystemTheme();
    registerServiceWorker();
  }

  /* ---------- khởi động ---------- */

  function init() {
    loadHistory();
    applyTheme(preferredTheme(), false);
    readInitialState();
    renderResult();
    renderRecipes();
    renderFarm();
    updateSim();
    setTab(state.tab, { updateUrl: false, scroll: false });
    syncUrl();
    bindEvents();
    document.documentElement.classList.add('is-ready');

    if (state.unknownParam) {
      const badCode = String(state.unknownParam).slice(0, 42);
      window.setTimeout(function () {
        toast('Mã “' + badCode + '” không có trong dữ liệu demo. Đang mở tem mẫu.', 4200);
      }, 650);
    }

    if (state.initialLotLink && state.tab === 'scan') {
      window.setTimeout(function () {
        scrollToElement($('#resultRoot'));
      }, 420);
    }
  }

  init();
})();
