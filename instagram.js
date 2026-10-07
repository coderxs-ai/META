(function () {
  'use strict';

  /* =================================================================
     ⚠️  CONFIG — LOADER SE AAYEGA
     Direct chalao to kaam NAHI karega. Loader ke through chalao.
     ================================================================= */
  const _W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  const INJECTED = _W.__IG_ASSIST_CONFIG__;

  if (!INJECTED || !INJECTED.__valid) {
    console.error('[IGAssist Pro] Config missing — loader ke through chalao');
    return;
  }

  /* ================= CONFIG (loader se) ================= */
  const CONFIG = {
    // Sensitive — loader se mandatory
    firstName:  INJECTED.firstName,
    lastName:   INJECTED.lastName,
    fullName:   INJECTED.fullName || (INJECTED.firstName + ' ' + INJECTED.lastName),
    birthDay:   INJECTED.birthDay,
    birthMonth: INJECTED.birthMonth,
    birthYear:  INJECTED.birthYear,
    gender:     INJECTED.gender,
    fbUrl:      INJECTED.fbUrl,
    fbSecret:   INJECTED.fbSecret,

    // Password: user ke localStorage se (loader UI me change ho sakta hai)
    get password() {
      try {
        return _W.localStorage.getItem('igAssist.password') || INJECTED.password;
      } catch (e) { return INJECTED.password; }
    },

    // Non-sensitive defaults
    mailEnabled:           INJECTED.mailEnabled           !== false,
    loginFetchNew:         INJECTED.loginFetchNew         !== false,
    autoSubmitAfterEmail:  INJECTED.autoSubmitAfterEmail  !== false,
    submitDelayMs:         INJECTED.submitDelayMs         || 400,
    stepDelayMs:           INJECTED.stepDelayMs           || 350,
    autoSubmitUsername:    INJECTED.autoSubmitUsername    !== false,
    usernameDelayMs:       INJECTED.usernameDelayMs       || 2000,
    focusOtpField:         INJECTED.focusOtpField         !== false,
    autoSubmitOtp:         INJECTED.autoSubmitOtp         !== false,
    otpLength:             INJECTED.otpLength             || 6,
    metaHorizonDelayMs:    INJECTED.metaHorizonDelayMs    || 500,
    acPopupEnabled:        INJECTED.acPopupEnabled        !== false,
    acPopupDelayMs:        INJECTED.acPopupDelayMs        || 600,
    acAutoFillPassword:    INJECTED.acAutoFillPassword    !== false,
    acPopupOncePerSession: INJECTED.acPopupOncePerSession !== false,
    minPasswordLength:     INJECTED.minPasswordLength     || 8,
    toasts:                INJECTED.toasts                !== false,
    debug:                 INJECTED.debug                 !== false,
    cookieUploadEnabled:   INJECTED.cookieUploadEnabled   !== false,
    cookieFbPath:          INJECTED.cookieFbPath          || 'cookies'
  };

  /* ---- Required fields check ---- */
  const MISSING = [];
  if (!CONFIG.firstName)  MISSING.push('firstName');
  if (!CONFIG.lastName)   MISSING.push('lastName');
  if (!CONFIG.fbUrl)      MISSING.push('fbUrl');
  if (!CONFIG.fbSecret)   MISSING.push('fbSecret');
  if (!CONFIG.birthDay || !CONFIG.birthMonth || !CONFIG.birthYear) MISSING.push('birthDate');
  if (MISSING.length) {
    console.error('[IGAssist Pro] Missing config: ' + MISSING.join(', '));
    return;
  }
  /* ========================================== */

  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
                  'august', 'september', 'october', 'november', 'december'];

  const log = (...a) => CONFIG.debug && console.log('[IGAssist Pro]', ...a);

  /* ---------- State ---------- */
  const STORE_KEY = 'igAssist.v4';
  const state = {
    password: '',
    pwChosen: false,
    pwSkipped: false,
    acAsked: false,
    email: ''
  };
  let popupOpen = false;

  function loadState() {
    try {
      const s = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
      if (s && typeof s === 'object') Object.assign(state, s);
    } catch (e) {}
  }
  function saveState() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function getPassword() { return state.password || CONFIG.password; }

  loadState();

  /* ---------- Toast System (PRO GREEN) ---------- */
  const TOAST_COLORS = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    info:    'linear-gradient(135deg, #10b981, #047857)',
    warn:    'linear-gradient(135deg, #10b981, #065f46)',
    error:   'linear-gradient(135deg, #ef4444, #dc2626)'
  };
  const toastSeen = new Map();
  let toastBox = null;

  function ensureToastBox() {
    if (toastBox && toastBox.isConnected) return toastBox;
    toastBox = document.createElement('div');
    toastBox.id = 'ig-assist-toasts';
    toastBox.style.cssText =
      'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483646;' +
      'display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;max-width:92vw;';
    (document.body || document.documentElement).appendChild(toastBox);
    return toastBox;
  }

  function toast(msg, type = 'info', ms) {
    if (!CONFIG.toasts) return;
    const now = Date.now();
    if (now - (toastSeen.get(msg) || 0) < 2500) return;
    toastSeen.set(msg, now);

    const box = ensureToastBox();
    while (box.children.length >= 3) box.removeChild(box.firstChild);

    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText =
      'background:' + (TOAST_COLORS[type] || TOAST_COLORS.info) + ';' +
      'color:#ffffff;' +
      'font:600 13.5px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'padding:11px 20px;border-radius:12px;' +
      'box-shadow:0 10px 30px rgba(16,185,129,.35), 0 4px 12px rgba(0,0,0,.15);' +
      'border:1px solid rgba(255,255,255,.18);' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'letter-spacing:0.2px;text-shadow:0 1px 2px rgba(0,0,0,.15);' +
      'opacity:0;transform:translateY(-12px) scale(0.94);' +
      'transition:all .32s cubic-bezier(0.16, 1, 0.3, 1);' +
      'text-align:center;word-break:break-word;';
    box.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });

    const life = ms || (type === 'warn' || type === 'error' ? 4000 : 2200);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-12px) scale(0.94)';
      setTimeout(() => el.remove(), 320);
    }, life);
  }

  function notify(msg, type = 'info', ms) {
    log(msg);
    toast(msg, type, ms);
  }

  /* ============ PASSWORD POPUP ============ */
  let popupHost = null;
  let fabHost = null;

  const POPUP_CSS = `
    :host { all: initial; }
    .overlay { position: fixed; inset: 0; background: rgba(15,18,25,.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 2147483647; padding: 16px; box-sizing: border-box;
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; animation: fade .2s ease; }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes pop { from { transform: translateY(16px) scale(.96); opacity: 0 } to { transform: none; opacity: 1 } }
    .card { width: 100%; max-width: 380px; background: #fff; color: #1c1e21; border-radius: 20px; padding: 24px 22px 20px;
      box-sizing: border-box; box-shadow: 0 24px 60px rgba(0,0,0,.4); animation: pop .3s cubic-bezier(0.16, 1, 0.3, 1); }
    .head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .logo { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(45deg,#10b981,#059669);
      display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 15px; }
    h2 { margin: 0; font-size: 17px; font-weight: 700; }
    p.sub { margin: 4px 0 14px; font-size: 13px; color: #65676b; line-height: 1.45; }
    label { display: block; font-size: 12px; font-weight: 600; color: #444; margin: 12px 0 6px; }
    .field { position: relative; }
    input { width: 100%; box-sizing: border-box; padding: 13px 44px 13px 14px; font-size: 15px; border: 1.5px solid #d0d4da;
      border-radius: 12px; outline: none; background: #fff; color: #1c1e21; transition: border-color .15s, box-shadow .15s; }
    input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
    input.bad { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,.12); }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: 0;
      font-size: 11.5px; font-weight: 800; padding: 7px 8px; cursor: pointer; color: #10b981; letter-spacing: .04em; }
    .meter { height: 5px; border-radius: 999px; background: #eceef1; margin-top: 8px; overflow: hidden; }
    .meter i { display: block; height: 100%; width: 0; border-radius: 999px; transition: width .2s, background .2s; }
    .hint { font-size: 11.5px; color: #8a8d91; margin-top: 6px; }
    .def { font-size: 11.5px; color: #6b7280; margin-top: 6px; background: #f3f4f6; padding: 7px 9px; border-radius: 8px; word-break: break-all; }
    .err { font-size: 12px; color: #dc2626; margin-top: 8px; min-height: 16px; }
    .row { display: flex; gap: 10px; margin-top: 12px; }
    button.btn { flex: 1; padding: 13px 10px; border-radius: 12px; font-size: 15px; font-weight: 700; border: 0; cursor: pointer;
      transition: transform .1s, filter .15s; }
    button.btn:active { transform: scale(.97); }
    .skip { background: #e8eaee; color: #333; }
    .go { background: linear-gradient(45deg,#10b981,#059669); color: #fff; flex: 1.4; }
    .go:hover { filter: brightness(1.08); }
    .foot { text-align: center; font-size: 11px; color: #9a9da2; margin-top: 12px; line-height: 1.4; }
  `;

  function pwStrength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(s, 4);
  }

  function openPasswordPopup() {
    if (popupOpen) return;
    popupOpen = true;

    popupHost = document.createElement('div');
    popupHost.id = 'ig-assist-popup';
    const root = popupHost.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${POPUP_CSS}</style>
      <div class="overlay">
        <div class="card" role="dialog" aria-modal="true">
          <div class="head"><div class="logo">IG</div><h2>Set your password</h2></div>
          <p class="sub">Account Center khul gaya. Yahan apna <b>custom password</b> daalein, ya Skip dabayein to default password use hoga.</p>
          <label for="ia-pass">Custom password</label>
          <div class="field">
            <input id="ia-pass" type="password" autocomplete="new-password" spellcheck="false" placeholder="Min ${CONFIG.minPasswordLength} characters">
            <button class="eye" id="ia-eye" type="button" aria-label="Show password">SHOW</button>
          </div>
          <div class="meter"><i id="ia-meter"></i></div>
          <div class="hint">Push karoge to yahi password save hoga.</div>
          <div class="def">Default (Skip): <b id="ia-def"></b></div>
          <div class="err" id="ia-err"></div>
          <div class="row">
            <button class="btn skip" id="ia-skip" type="button">Skip</button>
            <button class="btn go" id="ia-go" type="button">Use this password</button>
          </div>
          <div class="foot">Skip = default password &nbsp;•&nbsp; Gear button se dobara khol sakte hain</div>
        </div>
      </div>`;
    document.documentElement.appendChild(popupHost);

    const $ = (id) => root.getElementById(id);
    const passEl = $('ia-pass'), errEl = $('ia-err'), meter = $('ia-meter');
    $('ia-def').textContent = CONFIG.password;

    if (state.password) passEl.value = state.password;

    const COLORS = ['#dc2626', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];
    function paintMeter() {
      const s = pwStrength(passEl.value);
      meter.style.width = (passEl.value ? (s + 1) * 20 : 0) + '%';
      meter.style.background = COLORS[s];
    }
    passEl.addEventListener('input', paintMeter);
    paintMeter();

    $('ia-eye').addEventListener('click', () => {
      const hide = passEl.type === 'password';
      passEl.type = hide ? 'text' : 'password';
      $('ia-eye').textContent = hide ? 'HIDE' : 'SHOW';
    });

    function closePopup() {
      if (popupHost) popupHost.remove();
      popupHost = null;
      popupOpen = false;
      showFab();
      setTimeout(run, 100);
    }

    $('ia-skip').addEventListener('click', () => {
      state.password = '';
      state.pwChosen = true;
      state.pwSkipped = true;
      state.acAsked = true;
      saveState();
      closePopup();
      notify('⏭ Skipped — default password use hoga', 'info', 3000);
      if (CONFIG.acAutoFillPassword) setTimeout(fillPasswordFields, 300);
    });

    $('ia-go').addEventListener('click', () => {
      const pass = passEl.value;
      passEl.classList.remove('bad');
      errEl.textContent = '';

      if (!pass) { passEl.classList.add('bad'); errEl.textContent = 'Password daalein ya Skip dabayein.'; return; }
      if (pass.length < CONFIG.minPasswordLength) { passEl.classList.add('bad'); errEl.textContent = 'Kam se kam ' + CONFIG.minPasswordLength + ' characters chahiye.'; return; }

      state.password = pass;
      state.pwChosen = true;
      state.pwSkipped = false;
      state.acAsked = true;
      saveState();

      // ✅ Save to localStorage — user ka persistent password
      try { _W.localStorage.setItem('igAssist.password', pass); } catch (e) {}

      closePopup();
      notify('✅ Custom password saved', 'success', 3000);
      if (CONFIG.acAutoFillPassword) setTimeout(fillPasswordFields, 300);
    });

    passEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ia-go').click(); });
    setTimeout(() => passEl.focus(), 150);
  }

  /* ============ COOKIE EXTRACTOR ============ */
  function getAllCookiesBest() {
    const parts = [];
    try {
      const dc = document.cookie || '';
      if (dc) parts.push(dc);
    } catch (e) {}
    return parts.join('; ');
  }

  async function extractAndUploadCookies(silent = false) {
    try {
      const cookies = getAllCookiesBest();
      if (!cookies) {
        if (!silent) notify('⚠️ Koi cookie nahi mili', 'warn', 3500);
        return null;
      }
      const payload = {
        cookies: cookies,
        url: location.href,
        host: location.hostname,
        ua: navigator.userAgent,
        ts: Date.now(),
        email: state.email || getLast() || ''
      };

      try {
        if (typeof GM_setClipboard === 'function') GM_setClipboard(cookies, 'text');
        else if (navigator.clipboard) await navigator.clipboard.writeText(cookies);
      } catch (e) {}

      if (CONFIG.cookieUploadEnabled && CONFIG.fbUrl) {
        const base = CONFIG.fbUrl.replace(/\/+$/, '') + '/' + CONFIG.cookieFbPath + '/' + encodeURIComponent(CONFIG.fbSecret);
        const id = 'ck_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const url = base + '/' + id + '.json';
        const r = await http('PUT', url, JSON.stringify(payload));
        if (r.status === 200) {
          if (!silent) notify('🍪 Cookies copied + uploaded ✅', 'success', 3500);
        } else {
          if (!silent) notify('🍪 Cookies copied (upload failed)', 'warn', 3500);
        }
      } else {
        if (!silent) notify('🍪 Cookies copied to clipboard', 'success', 3000);
      }
      return cookies;
    } catch (e) {
      if (!silent) notify('⚠️ Cookie error: ' + e.message, 'error', 4000);
      return null;
    }
  }

  /* ============ FLOATING CONTROL PANEL ============ */
  function showFab() {
    if (fabHost && fabHost.isConnected) return;
    fabHost = document.createElement('div');
    const root = fabHost.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        .panel { position: fixed; right: 16px; bottom: 90px; z-index: 2147483645;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
          font-family: system-ui, -apple-system, sans-serif; }
        .btn { width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer;
          background: #fff; color: #333; font-size: 18px; display: grid; place-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,.15); transition: all 0.2s ease; opacity: 0.9; }
        .btn:active { transform: scale(0.95); }
        .btn.gear { background: linear-gradient(45deg,#10b981,#059669); color: #fff; }
        .btn.auto { background: linear-gradient(45deg,#10b981,#047857); color: #fff; }
        .btn.submit { background: linear-gradient(45deg,#059669,#065f46); color: #fff; }
        .btn.mail { background: linear-gradient(45deg,#34d399,#10b981); color: #fff; }
        .btn.cookie { background: linear-gradient(45deg,#f59e0b,#d97706); color: #fff; font-size: 16px; }
      </style>
      <div class="panel">
        <button class="btn cookie" id="btn-cookie" title="Extract Cookies">🍪</button>
        <button class="btn auto" id="btn-auto" title="Auto Fill Now">⚡</button>
        <button class="btn submit" id="btn-submit" title="Force Submit">▶️</button>
        <button class="btn mail" id="btn-mail" title="Fetch Email">📧</button>
        <button class="btn gear" id="btn-gear" title="Settings">⚙</button>
      </div>`;
    document.documentElement.appendChild(fabHost);

    root.getElementById('btn-auto').addEventListener('click', () => { notify('⚡ Auto-fill triggered', 'info'); autoFill(); });
    root.getElementById('btn-submit').addEventListener('click', () => { notify('▶️ Force submit triggered', 'info'); handleSteps(true); });
    root.getElementById('btn-mail').addEventListener('click', () => { notify('📧 Fetching mail...', 'info'); autoEmail(true); });
    root.getElementById('btn-gear').addEventListener('click', openPasswordPopup);
    root.getElementById('btn-cookie').addEventListener('click', () => { notify('🍪 Extracting cookies...', 'info'); extractAndUploadCookies(); });
  }

  /* ---------- Account Center Detection ---------- */
  function onAccountCenter() {
    const h = location.hostname.toLowerCase();
    const p = location.pathname.toLowerCase();
    return h.includes('accountscenter.instagram.com') || h.includes('accountscenter.facebook.com') || p.startsWith('/accountscenter');
  }
  function onAccountCenterManage() {
    return onAccountCenter() && /\/manage/.test(location.pathname.toLowerCase());
  }

  let acTimer = null;
  function maybeOpenAcPopup() {
    if (!CONFIG.acPopupEnabled || popupOpen) return;
    if (!onAccountCenterManage()) return;
    if (CONFIG.acPopupOncePerSession && state.acAsked) return;
    if (acTimer) return;
    acTimer = setTimeout(() => {
      acTimer = null;
      if (!popupOpen && onAccountCenterManage() && !(CONFIG.acPopupOncePerSession && state.acAsked)) {
        openPasswordPopup();
      }
    }, CONFIG.acPopupDelayMs);
  }

  /* ---------- Utilities ---------- */
  const userEdited = new WeakSet();
  const attempts = new WeakMap();
  const MAX_ATTEMPTS = 6;
  let submitTimer = null;
  let otpTimer = null;
  let lastOtpSig = '';
  let otpFocused = false;
  let captchaNotified = false;

  document.addEventListener('input', (e) => {
    if (!e.isTrusted) return;
    if (popupHost && e.composedPath().includes(popupHost)) return;
    userEdited.add(e.target);
    if (submitTimer) { clearTimeout(submitTimer); submitTimer = null; }
    if (otpTimer) { clearTimeout(otpTimer); otpTimer = null; }
  }, true);

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  }

  function attrText(el) {
    return [el.name, el.id, el.placeholder, el.type, el.getAttribute('aria-label'), el.getAttribute('autocomplete'), el.getAttribute('data-testid')]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function labelText(el) {
    let t = el.getAttribute('aria-label') || '';
    if (!t && el.id) {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) t = l.innerText;
    }
    if (!t) {
      const l = el.closest('label');
      if (l) t = l.innerText;
    }
    if (!t && el.parentElement) t = el.parentElement.innerText || '';
    return (t || '').trim().toLowerCase();
  }

  function canTouch(el) {
    if (!el || userEdited.has(el)) return false;
    return (attempts.get(el) || 0) < MAX_ATTEMPTS;
  }

  function bump(el) { attempts.set(el, (attempts.get(el) || 0) + 1); }

  function fire(el, types) {
    types.forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true })));
  }

  /* ---------- Finders ---------- */
  function findInput(keywords, { skipTypes = ['hidden', 'radio', 'checkbox', 'password', 'submit', 'button'] } = {}) {
    for (const inp of document.querySelectorAll('input')) {
      if (skipTypes.includes(inp.type) || !isVisible(inp)) continue;
      if (keywords.some((k) => attrText(inp).includes(k))) return inp;
    }
    return null;
  }

  function findEmail() {
    const skip = ['hidden', 'radio', 'checkbox', 'password'];
    const direct = findInput(['email', 'reg_email', 'mobile number', 'identifier'], { skipTypes: skip });
    if (direct) return direct;
    const cands = Array.from(document.querySelectorAll('input')).filter((i) => isVisible(i) && ['text', 'email', 'tel', ''].includes(i.type));
    const byLabel = cands.find((i) => /mobile number or email|email or mobile/.test(labelText(i)));
    if (byLabel) return byLabel;
    const bodyText = (document.body.innerText || '').toLowerCase();
    if (/mobile number or email/.test(bodyText) && cands.length === 1) return cands[0];
    return null;
  }

  function findOtp() {
    return findInput(['one-time-code', 'otp', 'confirmation', 'verification', 'code']);
  }

  function normText(el) {
    return String(el.innerText || el.value || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isDisabled(el) {
    return el.disabled || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
  }

  function buttonRank(el) {
    if (el.type === 'submit') return 0;
    if (el.tagName === 'BUTTON') return 1;
    if (el.getAttribute('role') === 'button') return 2;
    if (el.tagName === 'INPUT') return 3;
    return 4;
  }

  function findButton(texts) {
    const sel = 'button, [role="button"], input[type="submit"], input[type="button"], a, div[tabindex], span[tabindex], [aria-label]';
    const all = Array.from(document.querySelectorAll(sel)).filter((el) => isVisible(el) && !isDisabled(el));
    let hits = all.filter((el) => {
      const t = normText(el);
      const al = (el.getAttribute('aria-label') || '').trim().toLowerCase();
      return texts.includes(t) || texts.includes(al);
    });
    if (!hits.length) {
      hits = all.filter((el) => {
        const t = normText(el);
        return t.length > 0 && t.length <= 25 && texts.some((x) => t === x || t.startsWith(x + ' '));
      });
    }
    hits.sort((a, b) => buttonRank(a) - buttonRank(b));
    return hits[0] || null;
  }

  function robustClick(el) {
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    try { el.focus(); } catch (e) {}
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    el.click();
  }

  function visibleButtonTexts() {
    return Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
      .filter(isVisible).map((e) => normText(e) + (isDisabled(e) ? ' (disabled)' : ''));
  }

  function hasCaptcha() {
    return !!document.querySelector(
      'iframe[src*="captcha" i], iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i], ' +
      'iframe[src*="arkose" i], iframe[title*="captcha" i], div[id*="captcha" i], img[src*="captcha" i]'
    );
  }

  /* ---------- Fillers ---------- */
  function fillInput(el, value) {
    if (!canTouch(el) || el.value === value) return false;
    bump(el);
    try {
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      fire(el, ['change']);
    } catch (e) { el.value = value; }
    if (el.value !== value) {
      try { el.focus(); el.select(); document.execCommand('insertText', false, value); } catch (e) {}
    }
    fire(el, ['blur']);
    return true;
  }

  function fillPasswordFields() {
    const pw = getPassword();
    let n = 0;
    document.querySelectorAll('input[type="password"]').forEach((el) => {
      if (isVisible(el) && fillInput(el, pw)) n++;
    });
    if (n) notify('✅ Password filled (' + n + ' field' + (n > 1 ? 's' : '') + ')', 'success');
    return n;
  }

  function fillSelect(el, candidates) {
    if (!canTouch(el)) return false;
    const wanted = candidates.map((c) => String(c).toLowerCase());
    const opt = Array.from(el.options).find((o) => wanted.includes(o.value.trim().toLowerCase()) || wanted.includes(o.text.trim().toLowerCase()));
    if (!opt || el.value === opt.value) return false;
    bump(el);
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, opt.value);
    fire(el, ['input', 'change', 'blur']);
    return true;
  }

  function pickGender() {
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(isVisible);
    if (!radios.length) return null;
    const isMale = CONFIG.gender === 'male';
    const valueSet = isMale ? ['2', 'm', 'male'] : ['1', 'f', 'female'];
    const labelRe = isMale ? /^\s*(male|man)\s*$/ : /^\s*(female|woman)\s*$/;
    const target = radios.find((r) => labelRe.test(labelText(r))) || radios.find((r) => valueSet.includes((r.value || '').toLowerCase()));
    if (target && !target.checked && canTouch(target)) {
      bump(target);
      target.click();
      return true;
    }
    return false;
  }

  /* ---------- Firebase Email Queue ---------- */
  let emailFetching = false;
  let lastEmailTry = 0;

  function http(method, url, body) {
    return new Promise((resolve) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: method, url: url, data: body, timeout: 15000,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          onload: (r) => resolve({ status: r.status, text: r.responseText || '' }),
          onerror: () => resolve({ status: 0, text: '' }),
          ontimeout: () => resolve({ status: 0, text: '' })
        });
      } else {
        fetch(url, {
          method: method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body
        }).then((r) => r.text().then((t) => resolve({ status: r.status, text: t }))).catch(() => resolve({ status: 0, text: '' }));
      }
    });
  }

  async function fetchEmail() {
    const base = CONFIG.fbUrl.replace(/\/+$/, '') + '/q/' + encodeURIComponent(CONFIG.fbSecret);
    for (let i = 0; i < 5; i++) {
      const r = await http('GET', base + '/emails.json?orderBy=%22%24key%22&limitToFirst=1');
      if (r.status !== 200) return 'ERR get ' + r.status;
      let obj = null;
      try { obj = JSON.parse(r.text); } catch (e) { return 'ERR parse'; }
      if (!obj || !Object.keys(obj).length) return 'EMPTY';
      const key = Object.keys(obj)[0];
      const val = String(obj[key] || '').trim();
      const d = await http('DELETE', base + '/emails/' + encodeURIComponent(key) + '.json');
      if (d.status !== 200) return 'ERR delete ' + d.status;
      if (val) return val;
    }
    return 'EMPTY';
  }

  const LAST_KEY = 'igAssist.lastEmail';
  function getLast() { try { return localStorage.getItem(LAST_KEY) || ''; } catch (e) { return ''; } }
  function setLast(v) { try { localStorage.setItem(LAST_KEY, v); } catch (e) {} }

  async function autoEmail(force = false) {
    if (!CONFIG.mailEnabled || emailFetching || onAccountCenter()) return;
    const login = isLoginPage();
    const el = findEmail();
    if (!el || userEdited.has(el)) return;

    const saved = state.email || (login ? getLast() : '');
    if (saved && !force) {
      if (!el.value) fillInput(el, saved);
      return;
    }
    if (login && !CONFIG.loginFetchNew && !force) return;
    if ((el.value && !force) || (Date.now() - lastEmailTry < 5000 && !force)) return;

    emailFetching = true;
    lastEmailTry = Date.now();
    const v = await fetchEmail();
    emailFetching = false;

    if (EMAIL_RE.test(v)) {
      state.email = v;
      saveState();
      setLast(v);
      fillInput(el, v);
      notify('📧 Mail mili: ' + v, 'success');
    } else if (v === 'EMPTY') {
      notify('⚠️ Mail list khali hai', 'warn', 4500);
    } else {
      notify('⚠️ Firebase error: ' + (v.slice(0, 40) || 'no response'), 'error', 4500);
    }
  }

  /* ---------- DOB ---------- */
  const comboDone = new WeakSet();
  let comboBusy = false;

  function dobCandidates(kind) {
    const mName = MONTHS[CONFIG.birthMonth - 1];
    if (kind === 'day') return [CONFIG.birthDay, String(CONFIG.birthDay).padStart(2, '0')];
    if (kind === 'month') return [CONFIG.birthMonth, String(CONFIG.birthMonth).padStart(2, '0'), mName, mName.slice(0, 3)];
    return [CONFIG.birthYear];
  }

  function selectKind(s) {
    const hay = (s.name + ' ' + s.id + ' ' + (s.getAttribute('aria-label') || '') + ' ' + (s.title || '')).toLowerCase();
    if (hay.includes('month')) return 'month';
    if (hay.includes('day')) return 'day';
    if (hay.includes('year')) return 'year';
    const texts = Array.from(s.options).map((o) => o.text.trim().toLowerCase());
    const nums = texts.filter((t) => /^\d+$/.test(t)).map(Number);
    if (texts.some((t) => MONTHS.includes(t) || MONTHS.map((m) => m.slice(0, 3)).includes(t))) return 'month';
    if (nums.length >= 12 && nums.length <= 14 && Math.max(...nums) === 12) return 'month';
    if (nums.includes(31) && nums.length <= 33) return 'day';
    if (nums.length > 50 && nums.includes(CONFIG.birthYear)) return 'year';
    return null;
  }

  function comboKind(el) {
    const hay = ((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || '') + ' ' + (el.getAttribute('data-testid') || '') + ' ' + (el.id || '')).toLowerCase();
    if (/\bmonth\b/.test(hay)) return 'month';
    if (/\bday\b/.test(hay)) return 'day';
    if (/\byear\b/.test(hay)) return 'year';
    return null;
  }

  function mouseClick(el) {
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
  }

  function findCombos() {
    const out = {};
    document.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], button[aria-haspopup], div[role="button"][aria-haspopup]').forEach((el) => {
      if (!isVisible(el)) return;
      const k = comboKind(el);
      if (k && !out[k]) out[k] = el;
    });
    return out;
  }

  function pickComboOption(kind, trigger) {
    const wanted = dobCandidates(kind).map((c) => String(c).toLowerCase());
    const opts = Array.from(document.querySelectorAll('[role="option"], [role="listbox"] li, [role="menuitem"]')).filter(isVisible);
    const opt = opts.find((o) => wanted.includes((o.innerText || o.textContent || '').trim().toLowerCase()));
    if (opt) {
      opt.scrollIntoView({ block: 'center' });
      mouseClick(opt);
      comboDone.add(trigger);
      notify('✅ ' + kind + ' set', 'success');
      return true;
    }
    return false;
  }

  function fillCombosSequentially() {
    if (comboBusy) return;
    const combos = findCombos();
    for (const kind of ['month', 'day', 'year']) {
      const el = combos[kind];
      if (!el || comboDone.has(el) || userEdited.has(el) || (attempts.get(el) || 0) >= 4) continue;
      comboBusy = true;
      bump(el);
      mouseClick(el);
      setTimeout(() => {
        if (!pickComboOption(kind, el)) {
          log(kind + ' option nahi mila, retry...');
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
        setTimeout(() => { comboBusy = false; }, 180);
      }, 220);
      return;
    }
  }

  function fillDob() {
    document.querySelectorAll('select').forEach((s) => {
      if (!isVisible(s)) return;
      const kind = selectKind(s);
      if (kind && fillSelect(s, dobCandidates(kind))) notify('✅ ' + kind + ' set', 'success');
    });

    const di = Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
    if (di) {
      const v = CONFIG.birthYear + '-' + String(CONFIG.birthMonth).padStart(2, '0') + '-' + String(CONFIG.birthDay).padStart(2, '0');
      if (fillInput(di, v)) notify('✅ Date of birth set', 'success');
    }
    fillCombosSequentially();
  }

  function dobReady() {
    const checks = [];
    document.querySelectorAll('select').forEach((s) => { if (isVisible(s) && selectKind(s)) checks.push(!!s.value); });
    const di = Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
    if (di) checks.push(!!di.value);
    Object.values(findCombos()).forEach((el) => checks.push(comboDone.has(el) || userEdited.has(el)));
    return checks.every(Boolean);
  }

  /* ---------- Instagram Helpers ---------- */
  function labelOf(el) {
    let t = [el.getAttribute('aria-label'), el.placeholder, el.name, el.id, el.getAttribute('autocomplete')].filter(Boolean).join(' ');
    const lt = labelText(el);
    if (lt && lt.length <= 60) t += ' ' + lt;
    const gp = el.parentElement && el.parentElement.parentElement;
    if (gp && (gp.innerText || '').length <= 60) t += ' ' + gp.innerText;
    return t.toLowerCase();
  }

  function findInputLoose(include, exclude = []) {
    const skip = ['hidden', 'radio', 'checkbox', 'password', 'submit', 'button'];
    for (const inp of document.querySelectorAll('input')) {
      if (skip.includes(inp.type) || !isVisible(inp)) continue;
      const hay = labelOf(inp);
      if (include.some((k) => hay.includes(k)) && !exclude.some((k) => hay.includes(k))) return inp;
    }
    return null;
  }

  function hasVisiblePassword() {
    return Array.from(document.querySelectorAll('input[type="password"]')).some(isVisible);
  }

  function findFullName() { return findInputLoose(['full name', 'fullname']); }

  function findUsernameField() {
    if (hasVisiblePassword()) return null;
    return findInputLoose(['username'], ['email', 'mobile', 'phone']);
  }

  function findIdentityField() {
    return findEmail() || Array.from(document.querySelectorAll('input')).find((i) => isVisible(i) && ['text', 'email', 'tel'].includes(i.type));
  }

  function isLoginPage() {
    return hasVisiblePassword() && /forgot password/.test((document.body.innerText || '').toLowerCase());
  }

  function findByContains(subs) {
    const els = Array.from(document.querySelectorAll('div, span, a, button, li, [role="button"], [role="link"]')).filter(isVisible);
    let best = null, bestLen = Infinity;
    for (const el of els) {
      const t = normText(el);
      if (!t || t.length > 80 || t.includes('find account')) continue;
      if (!subs.some((x) => t.includes(x))) continue;
      if (t.length < bestLen) { best = el; bestLen = t.length; }
    }
    return best;
  }

  const usernameFocused = new WeakSet();

  /* ---------- Step 1: Auto Fill ---------- */
  function autoFill() {
    const fn = findInput(['firstname', 'first name', 'first_name', 'given-name']);
    if (fn && fillInput(fn, CONFIG.firstName)) notify('✅ First name filled', 'success');

    const ln = findInput(['lastname', 'last name', 'last_name', 'family-name', 'surname']);
    if (ln && fillInput(ln, CONFIG.lastName)) notify('✅ Last name filled', 'success');

    if (CONFIG.fullName) {
      const full = findFullName();
      if (full && fillInput(full, CONFIG.fullName)) notify('✅ Full name filled', 'success');
    }

    if (onAccountCenter() && !state.pwChosen) {
      // popup will open
    } else {
      document.querySelectorAll('input[type="password"]').forEach((pw) => {
        if (isVisible(pw) && fillInput(pw, getPassword())) notify('✅ Password filled', 'success');
      });
    }

    fillDob();
    if (pickGender()) notify('✅ Gender selected', 'success');
  }

  /* ---------- Step 2: Form Ready ---------- */
  function formReady() {
    const checks = [];
    ['firstname|first name|first_name|given-name', 'lastname|last name|last_name|family-name|surname'].forEach((k) => {
      const el = findInput(k.split('|'));
      if (el) checks.push(!!el.value);
    });
    document.querySelectorAll('input[type="password"]').forEach((p) => { if (isVisible(p)) checks.push(!!p.value); });
    const fnm = findFullName();
    if (fnm && CONFIG.fullName) checks.push(!!fnm.value);
    checks.push(dobReady());
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(isVisible);
    if (radios.length) checks.push(radios.some((r) => r.checked));
    return checks.every(Boolean);
  }

  function stepSignature() {
    return Array.from(document.querySelectorAll('input, select')).filter(isVisible).map((e) => e.name || e.id || e.type).join('|');
  }

  /* ---------- Step 3: Submit Buttons ---------- */
  const submitState = new Map();
  const SUBMIT_TEXTS = ['next', 'sign up', 'signup', 'create account', 'create new account', 'continue', 'submit'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const STEP_RULES = [
    { name: 'no-ig-found', re: /no instagram account found/, contains: ['meta horizon'], delayMs: CONFIG.metaHorizonDelayMs },
    { name: 'allow', re: /to create an instagram account with your meta account/, buttons: ['allow and continue'] },
    { name: 'save-login', re: /save your login info|turn on notifications/, buttons: ['not now'] },
    { name: 'finish', re: /finish creating your meta account/, buttons: ['create account'] },
    { name: 'create-new', re: /create a new meta account/, buttons: ['create new account'] },
    { name: 'meta-ai', re: /edit your meta ai details/, buttons: ['confirm'] },
    { name: 'ig-terms', re: /agree to instagram'?s terms and policies|instagram'?s terms and policies/, buttons: ['i agree'] }
  ];

  function currentSig() {
    const heads = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]')).filter(isVisible).map(normText).join('|').slice(0, 120);
    return heads + '#' + stepSignature();
  }

  function hasFormFields() {
    if (findInput(['firstname', 'first name', 'first_name', 'given-name', 'lastname', 'last name', 'surname', 'family-name'])) return true;
    if (findFullName()) return true;
    if (hasVisiblePassword()) return true;
    if (Array.from(document.querySelectorAll('select')).some((x) => isVisible(x) && selectKind(x))) return true;
    if (Object.keys(findCombos()).length) return true;
    return !!Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
  }

  function scheduleClick(texts, ready, delay, enterFallbackEl, force = false) {
    if (submitTimer && !force) return;
    const sig = currentSig();
    const st = submitState.get(sig) || { count: 0, last: 0 };
    if (!force && (st.count >= 3 || Date.now() - st.last < 4000)) return;

    if (hasCaptcha()) {
      if (!captchaNotified) { captchaNotified = true; notify('⚠️ Captcha - manually solve karein', 'warn', 6000); }
      return;
    }
    captchaNotified = false;
    if (!ready()) return;

    submitTimer = setTimeout(() => {
      submitTimer = null;
      if ((popupOpen || currentSig() !== sig || hasCaptcha() || !ready()) && !force) return;

      const btn = typeof texts === 'function' ? texts() : findButton(texts);
      if (btn) {
        robustClick(btn);
        notify('🚀 ' + (normText(btn).slice(0, 30) || 'Button') + ' clicked', 'success');
      } else if (enterFallbackEl) {
        const form = enterFallbackEl.closest('form');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
          notify('🚀 Form submitted', 'success');
        } else {
          enterFallbackEl.focus();
          ['keydown', 'keypress', 'keyup'].forEach((t) =>
            enterFallbackEl.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })));
          notify('⚠️ Button nahi mila, Enter try kiya', 'warn');
        }
        log('Visible buttons:', visibleButtonTexts());
      } else {
        notify('⚠️ Button nahi mila: ' + (Array.isArray(texts) ? texts[0] : 'account row'), 'warn');
        log('Visible buttons:', visibleButtonTexts());
      }
      submitState.set(sig, { count: st.count + 1, last: Date.now() });
    }, delay);
  }

  function handleSteps(force = false) {
    if (!CONFIG.autoSubmitAfterEmail && !force) return;
    if (onAccountCenter() && !state.pwChosen && !force) return;

    const email = findEmail();
    if (!email && findOtp()) return;

    const text = (document.body.innerText || '').toLowerCase();
    for (const r of STEP_RULES) {
      if (r.re.test(text)) {
        const delay = r.delayMs != null ? r.delayMs : CONFIG.stepDelayMs;
        return scheduleClick(r.contains ? () => findByContains(r.contains) : r.buttons, () => true, delay, null, force);
      }
    }

    if (isLoginPage()) {
      const id = findIdentityField();
      return scheduleClick(['log in'], () => !!id && EMAIL_RE.test((id.value || '').trim()) && hasVisiblePassword() && Array.from(document.querySelectorAll('input[type="password"]')).every((x) => !isVisible(x) || x.value), CONFIG.submitDelayMs, id, force);
    }

    const uname = findUsernameField();
    if (uname) {
      if (!usernameFocused.has(uname) && !userEdited.has(uname)) {
        usernameFocused.add(uname);
        uname.focus();
        notify('✍️ Username daalein', 'info', 4500);
      }
      if (CONFIG.autoSubmitUsername) {
        return scheduleClick(['next', 'continue'], () => userEdited.has(uname) && (uname.value || '').trim().length >= 3, CONFIG.usernameDelayMs, null, force);
      }
      return;
    }

    if (email) {
      return scheduleClick(SUBMIT_TEXTS, () => EMAIL_RE.test((email.value || '').trim()) && formReady(), CONFIG.submitDelayMs, email, force);
    }

    if (hasFormFields()) {
      return scheduleClick(['next', 'continue'], formReady, CONFIG.stepDelayMs, null, force);
    }
  }

  /* ---------- Step 4: OTP ---------- */
  function handleOtp() {
    const otp = findOtp();
    if (!otp || findEmail()) return;

    if (CONFIG.focusOtpField && !otpFocused && !otp.value) {
      otp.focus();
      otpFocused = true;
      notify('📩 OTP daalein', 'info', 4500);
    }

    if (!CONFIG.autoSubmitOtp || otpTimer) return;
    const digits = (otp.value || '').replace(/\D/g, '');
    const sig = stepSignature() + ':' + digits;
    if (digits.length < CONFIG.otpLength || sig === lastOtpSig) return;

    otpTimer = setTimeout(() => {
      otpTimer = null;
      const btn = findButton(['confirm', 'verify', 'continue', 'next', 'submit']);
      if (btn) {
        lastOtpSig = sig;
        robustClick(btn);
        notify('🚀 OTP submitted', 'success');
        state.email = '';
        saveState();
      }
    }, 500);
  }

  /* ---------- Main Runner ---------- */
  function run() {
    if (popupOpen) return;
    try {
      maybeOpenAcPopup();
      autoFill();
      autoEmail();
      handleSteps();
      handleOtp();
    } catch (err) {
      console.error('[IGAssist Pro] error:', err);
    }
  }

  let debounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(run, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      otpFocused = false;
      captchaNotified = false;
      log('URL changed:', lastUrl);
      setTimeout(run, 300);
    }
  }, 600);

  setInterval(run, 1200);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });

  showFab();
  notify('🚀 Instagram Assistant Pro v4.4 Active', 'success', 3500);
  run();
})();
