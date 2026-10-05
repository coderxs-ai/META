(function () {
  'use strict';

  /* ================= CONFIG: sirf yahan edit karein ================= */
  const CONFIG = {
    firstName: 'Rahul',
    lastName: 'Sharma',
    password: 'Hujaifa@123#',
    birthDay: 15,
    birthMonth: 5,
    birthYear: 1995,
    gender: 'male',

    boomlifyKey: 'api_0eecb67e3ca23ce753f73d2b3cb585e0c0f82c43594186fc74bfda731d65a8a7',
    mailTime: '10min',
    mailDomain: '',
    autoTempMail: true,

    autoSubmitAfterEmail: true,
    submitDelayMs: 1200,
    stepDelayMs: 900,

    tgToken: '8819343276:AAHO4ifAsL4KGGTjDn8yCGuqwNx08iSqPGQ',
    tgChatId: '8068314746',
    tgSendPassword: false,

    focusOtpField: true,
    autoSubmitOtp: true,
    otpMinLength: 5,
    otpPollMs: 2500,
    otpSubmitDelayMs: 500,
    otpVerifyTimeoutMs: 6000,
    otpMaxSubmits: 4,
    otpAdvanceAfterSuccess: true,

    defaultDomain: 'gmail.com',
    minPasswordLength: 8,

    autoCopyEmail: true,
    copyOnEveryStep: false,
    showCopyChip: true,
    chipAutoHideMs: 0,

    toasts: true,
    debug: true
  };

  const MONTHS = ['january','february','march','april','may','june','july',
                  'august','september','october','november','december'];

  const log = (...a) => CONFIG.debug && console.log('[MetaAssist]', ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const BLOCKED_BTN_RE = /facebook|instagram|google|apple/;

  const STORE_KEY = 'metaAssist.v10';
  const state = {
    done: false, email: '', password: '', skipped: false, tmId: '',
    otpVerified: false, lastCode: ''
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
  const getPassword = () => state.password || CONFIG.password;
  const getEmail = () => state.email || '';

  loadState();

  /* ================= TOAST ================= */
  const TOAST_DOT = { success:'#22c55e', info:'#22c55e', warn:'#f59e0b', error:'#ef4444' };
  const toastSeen = new Map();
  let toastBox = null;

  function ensureToastBox() {
    if (toastBox && toastBox.isConnected) return toastBox;
    toastBox = document.createElement('div');
    toastBox.id = 'meta-assist-toasts';
    toastBox.style.cssText =
      'position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));' +
      'transform:translateX(-50%);z-index:2147483646;display:flex;flex-direction:column;' +
      'align-items:center;gap:8px;pointer-events:none;width:max-content;max-width:92vw;';
    (document.body || document.documentElement).appendChild(toastBox);
    return toastBox;
  }

  function toast(msg, type = 'info', ms) {
    if (!CONFIG.toasts) return;
    const now = Date.now();
    if (now - (toastSeen.get(msg) || 0) < 4000) return;
    toastSeen.set(msg, now);

    const box = ensureToastBox();
    while (box.children.length >= 3) box.removeChild(box.firstChild);

    const el = document.createElement('div');
    el.style.cssText =
      'display:flex;align-items:center;gap:8px;box-sizing:border-box;max-width:92vw;' +
      'padding:4px 8px;background:transparent;border:0;box-shadow:none;' +
      'opacity:0;transform:translateY(10px);transition:opacity .28s ease,transform .28s ease;';

    const dot = document.createElement('span');
    dot.style.cssText = 'flex:none;width:7px;height:7px;border-radius:50%;background:' +
      (TOAST_DOT[type] || TOAST_DOT.info) + ';';

    const txt = document.createElement('span');
    txt.textContent = msg;
    txt.style.cssText =
      'color:#16a34a;font:700 13.5px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'letter-spacing:.2px;word-break:break-word;text-align:center;' +
      'text-shadow:0 0 3px #fff,0 0 6px #fff,0 1px 2px rgba(255,255,255,.95);';

    el.appendChild(dot); el.appendChild(txt); box.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });

    const life = ms || (type === 'warn' || type === 'error' ? 4500 : 2400);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 300);
    }, life);
  }

  const notify = (msg, type = 'info', ms) => { log(msg); toast(msg, type, ms); };

  /* ================= TELEGRAM ================= */
  const tgSent = new Set();

  function sendTelegram(text, dedupeKey) {
    if (!CONFIG.tgToken || !CONFIG.tgChatId) return;
    const key = dedupeKey || text;
    if (tgSent.has(key)) return;
    tgSent.add(key);

    const url = 'https://api.telegram.org/bot' + CONFIG.tgToken + '/sendMessage';
    const payload = JSON.stringify({ chat_id: CONFIG.tgChatId, text });

    if (typeof GM_xmlhttpRequest === 'function') {
      GM_xmlhttpRequest({
        method: 'POST', url, timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        onload: (r) => {
          if (r.status >= 200 && r.status < 300) log('telegram sent');
          else { tgSent.delete(key); log('telegram error', r.status, r.responseText); }
        },
        onerror: () => { tgSent.delete(key); log('telegram network error'); },
        ontimeout: () => { tgSent.delete(key); log('telegram timeout'); }
      });
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
        .catch(() => { tgSent.delete(key); log('telegram fetch error'); });
    }
  }

  const tgPassLine = () => CONFIG.tgSendPassword ? '\n🔒 ' + getPassword() : '';

  /* ================= CLIPBOARD ================= */
  let pendingCopy = '';
  let copiedOnce = '';

  function copyText(text) {
    if (!text) return Promise.resolve(false);

    const legacy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;z-index:-1;';
        (document.body || document.documentElement).appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) { return false; }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(() => true)
        .catch(() => legacy());
    }
    return Promise.resolve(legacy());
  }

  async function copyEmail(addr, silent) {
    const text = addr || getEmail();
    if (!text) return false;
    const ok = await copyText(text);
    if (ok) {
      copiedOnce = text;
      pendingCopy = '';
      if (!silent) notify('Email copied: ' + text, 'success', 4000);
      if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
      showCopyChip(text, true);
    } else {
      pendingCopy = text;
      if (!silent) notify('Tap anywhere to copy the email', 'warn', 5000);
      showCopyChip(text, false);
    }
    return ok;
  }

  ['pointerdown', 'touchend', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, () => {
      if (!pendingCopy) return;
      const t = pendingCopy;
      pendingCopy = '';
      copyText(t).then((ok) => {
        if (ok) { copiedOnce = t; notify('Email copied: ' + t, 'success', 3500); showCopyChip(t, true); }
      });
    }, true));

  let chipHost = null;
  function showCopyChip(text, copied) {
    if (!CONFIG.showCopyChip || !text) return;

    if (!chipHost || !chipHost.isConnected) {
      chipHost = document.createElement('div');
      const r = chipHost.attachShadow({ mode: 'open' });
      r.innerHTML = `
        <style>
          :host { all: initial; }
          .chip {
            position: fixed; left: 50%; transform: translateX(-50%);
            bottom: calc(60px + env(safe-area-inset-bottom,0px));
            z-index: 2147483644; display: flex; align-items: center; gap: 8px;
            max-width: 92vw; padding: 8px 10px 8px 12px; border-radius: 999px;
            background: rgba(17,24,39,.95); color: #fff; backdrop-filter: blur(6px);
            box-shadow: 0 8px 22px rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.1);
            font: 600 12.5px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
            cursor: pointer; user-select: none;
          }
          .mail { max-width: 58vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .tag { flex: none; font-size: 10.5px; font-weight: 800; padding: 4px 8px;
                 border-radius: 999px; background: #2563eb; color: #fff; letter-spacing: .04em; }
          .tag.ok { background: #16a34a; }
          .x { flex: none; background: none; border: 0; color: #94a3b8;
               font-size: 15px; padding: 2px 4px; cursor: pointer; line-height: 1; }
        </style>
        <div class="chip" id="chip">
          <span class="mail" id="mail"></span>
          <span class="tag" id="tag">COPY</span>
          <button class="x" id="x" type="button">&times;</button>
        </div>`;
      document.documentElement.appendChild(chipHost);

      r.getElementById('chip').addEventListener('click', async (e) => {
        if (e.target.id === 'x') return;
        const ok = await copyText(r.getElementById('mail').textContent);
        const tag = r.getElementById('tag');
        tag.textContent = ok ? 'COPIED' : 'FAILED';
        tag.classList.toggle('ok', ok);
        if (ok && navigator.vibrate) { try { navigator.vibrate(40); } catch (err) {} }
        setTimeout(() => { tag.textContent = 'COPY'; tag.classList.remove('ok'); }, 1600);
      });
      r.getElementById('x').addEventListener('click', () => {
        chipHost.remove(); chipHost = null;
      });
    }

    const r = chipHost.shadowRoot;
    r.getElementById('mail').textContent = text;
    const tag = r.getElementById('tag');
    tag.textContent = copied ? 'COPIED' : 'TAP TO COPY';
    tag.classList.toggle('ok', !!copied);
    if (copied) setTimeout(() => {
      if (!chipHost) return;
      const t = chipHost.shadowRoot.getElementById('tag');
      t.textContent = 'COPY'; t.classList.remove('ok');
    }, 2000);

    if (CONFIG.chipAutoHideMs > 0) {
      setTimeout(() => { if (chipHost) { chipHost.remove(); chipHost = null; } }, CONFIG.chipAutoHideMs);
    }
  }

  /* ================= TEMP MAIL (Boomlify) ================= */
  const BL = 'https://v1.boomlify.com';
  let tmBusy = false;
  let otpPolling = false;
  let lastPoll = 0;

  function httpJson(method, path, body) {
    const headers = {
      'X-API-Key': CONFIG.boomlifyKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const payload = body ? JSON.stringify(body) : undefined;
    const parse = (txt) => { try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; } };
    const errMsg = (d, status) => (d && (d.error || d.message || d.code))
      ? String(d.error || d.message || d.code) : ('Boomlify ' + status);

    if (typeof GM_xmlhttpRequest === 'function') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method, url: BL + path, headers, data: payload, timeout: 15000,
          onload: (r) => {
            const data = parse(r.responseText);
            if (r.status >= 200 && r.status < 300) resolve(data);
            else reject(new Error(errMsg(data, r.status)));
          },
          onerror: () => reject(new Error('Boomlify network')),
          ontimeout: () => reject(new Error('Boomlify timeout'))
        });
      });
    }

    return fetch(BL + path, { method, headers, body: payload }).then(async (r) => {
      const data = parse(await r.text());
      if (!r.ok) throw new Error(errMsg(data, r.status));
      return data;
    });
  }

  const unwrap = (r) => (r && (r.data || r.email || r.result)) || r || {};

  function toMessages(r) {
    if (Array.isArray(r)) return r;
    const o = r && (r.messages || r.data || r.results);
    if (Array.isArray(o)) return o;
    if (o && Array.isArray(o.messages)) return o.messages;
    return [];
  }

  function allStrings(v, out = [], depth = 0) {
    if (depth > 4) return out;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out, depth + 1));
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => allStrings(v[k], out, depth + 1));
    return out;
  }

  const stripHtml = (h) => String(h || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');

  async function createTempMail() {
    let q = '?time=' + encodeURIComponent(CONFIG.mailTime);
    if (CONFIG.mailDomain) q += '&domain=' + encodeURIComponent(CONFIG.mailDomain);
    const res = await httpJson('POST', '/api/v1/emails/create' + q);
    log('create response:', res);
    const o = unwrap(res);
    const addr = o.email || o.address || o.email_address;
    const id = o.id || o.email_id || o._id || addr;
    if (!addr) throw new Error('unexpected response');
    state.email = addr;
    state.tmId = String(id);
    saveState();
    return addr;
  }

  async function ensureTempMail() {
    if (tmBusy) return;
    tmBusy = true;
    notify('Creating temporary email...', 'info');
    try {
      const a = await createTempMail();
      notify('Temp email ready: ' + a, 'success', 4500);
      sendTelegram('📧 Email: ' + a + tgPassLine(), 'email:' + a);
      if (CONFIG.autoCopyEmail) await copyEmail(a, true);
    } catch (e) {
      log('createTempMail error', e);
      notify('Temp email failed: ' + e.message, 'error');
      await sleep(8000);
    } finally {
      tmBusy = false;
    }
  }

  /* ================= OTP ENGINE ================= */
  const usedCodes = new Set();
  const msgTries = new Map();
  let otpSince = 0;
  let pollFails = 0;
  let otpWarnedAt = 0;
  let otpSubmits = 0;
  let otpBusy = false;
  let otpFilledCode = '';

  const decodeEntities = (t) => String(t || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

  const JUNK_CODES = new Set(['94025', '94043']);

  function extractCode(raw) {
    let t = decodeEntities(raw).replace(/\s+/g, ' ');
    t = t.replace(/https?:\/\/\S+/gi, ' ');
    t = t.replace(/\b(\d{3})[ -](\d{3})\b/g, '$1$2');
    t = t.replace(/\b(\d)(?: (\d)){4,7}\b/g, (m) => m.replace(/ /g, ''));

    const ok = (c) => c && !JUNK_CODES.has(c) && !/^(19|20)\d\d$/.test(c);
    const strong = [
      /(?:confirmation|verification|security|login|one[- ]?time)\s*code[^\d]{0,40}(\d{4,8})\b/i,
      /\b(?:fb|ig)[-\s]?(\d{4,8})\b/i,
      /\b(\d{4,8})\s+is\s+your\s+(?:[\w']+\s+){0,3}(?:code|otp)/i,
      /\b(?:code|otp|pin)\b\D{0,40}(\d{4,8})\b/i
    ];
    for (const re of strong) {
      const m = t.match(re);
      if (m && ok(m[1])) return m[1];
    }
    const head = t.slice(0, 400);
    for (const re of [/\b(\d{6})\b/, /\b(\d{5})\b/, /\b(\d{8})\b/]) {
      const m = head.match(re);
      if (m && ok(m[1])) return m[1];
    }
    return null;
  }

  const msgTime = (m) => {
    const v = m.created_at || m.createdAt || m.received_at || m.receivedAt || m.date || m.timestamp;
    return typeof v === 'number' ? v : (Date.parse(v || '') || 0);
  };

  const sortNewest = (list) =>
    list.some(msgTime) ? list.slice().sort((a, b) => msgTime(b) - msgTime(a)) : list;

  const msgKey = (m) => String(m.id || m._id || m.message_id || JSON.stringify(m).slice(0, 200));

  function codeFromMessage(m) {
    const preferred = [m.subject, m.text, m.body, m.body_text, m.content, m.preview, m.html, m.body_html]
      .filter(Boolean).map(stripHtml);
    const everything = allStrings(m).map(stripHtml).join(' ');
    for (const src of [...preferred, everything]) {
      const c = src ? extractCode(src) : null;
      if (c) return c;
    }
    return null;
  }

  function otpInputs() {
    const boxes = splitBoxes();
    if (boxes.length) return boxes;
    const one = findOtp();
    return one ? [one] : [];
  }

  const otpValue = () => otpInputs().map((i) => i.value || '').join('');

  const nativeInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  function setNative(el, v) {
    el.focus();
    nativeInputValue.call(el, v);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: v, inputType: 'insertText' }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function expectedOtpLen(fallback) {
    const t = (document.body.innerText || '').toLowerCase();
    const m = t.match(/(\d)\s*[- ]?digit/);
    const n = m ? parseInt(m[1], 10) : 0;
    return (n >= 4 && n <= 8) ? n : (fallback || 6);
  }

  function typeIntoInput(el, code) {
    el.focus();
    el.click();
    try { el.setSelectionRange(0, (el.value || '').length); } catch (e) {}

    nativeInputValue.call(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));

    for (const ch of code.split('')) {
      const opts = { key: ch, code: 'Digit' + ch, keyCode: 48 + (+ch), which: 48 + (+ch), bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keypress', opts));
      nativeInputValue.call(el, (el.value || '') + ch);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === code;
  }

  function pasteInto(el, code) {
    try {
      const dt = new DataTransfer();
      dt.setData('text', code);
      el.focus();
      try { el.setSelectionRange(0, (el.value || '').length); } catch (e) {}
      el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: code, inputType: 'insertFromPaste' }));
    } catch (e) {}
    return el.value === code;
  }

  function fillOtpValue(code) {
    const els = otpInputs();
    if (!els.length) return false;

    if (els.length === 1) {
      const el = els[0];
      if (!typeIntoInput(el, code) &&
          !pasteInto(el, code)) {
        setNative(el, code);
        if (el.value !== code) {
          try { el.focus(); el.select(); document.execCommand('insertText', false, code); } catch (e) {}
        }
      }
      if (el.value === code) {
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        el.focus();
        return true;
      }
      log('OTP fill mismatch. wanted', code, 'got', el.value);
      return false;
    }

    code.split('').forEach((d, i) => {
      if (!els[i]) return;
      const opts = { key: d, code: 'Digit' + d, keyCode: 48 + (+d), which: 48 + (+d), bubbles: true, cancelable: true };
      els[i].focus();
      els[i].dispatchEvent(new KeyboardEvent('keydown', opts));
      setNative(els[i], d);
      els[i].dispatchEvent(new KeyboardEvent('keyup', opts));
    });
    if (otpValue() !== code) pasteInto(els[0], code);

    const okNow = otpValue() === code;
    if (okNow) els[els.length - 1].focus();
    return okNow;
  }

  async function pollTempOtp() {
    if (!state.tmId || otpPolling) return;
    const age = Date.now() - otpSince;
    const base = age < 60000 ? CONFIG.otpPollMs : age < 180000 ? 5000 : 8000;
    const wait = Math.min(30000, base * Math.pow(2, pollFails));
    if (Date.now() - lastPoll < wait) return;
    lastPoll = Date.now();
    otpPolling = true;

    try {
      const res = await httpJson('GET', '/api/v1/emails/' + encodeURIComponent(state.tmId) + '/messages');
      pollFails = 0;
      const list = sortNewest(toMessages(res));
      let filled = false;

      if (!list.length) notify('Waiting for verification email...', 'info', 2500);

      for (const m of list.slice(0, 8)) {
        const key = msgKey(m);
        if ((msgTries.get(key) || 0) >= 3) continue;
        const code = codeFromMessage(m);
        if (!code) { msgTries.set(key, (msgTries.get(key) || 0) + 1); continue; }
        if (usedCodes.has(code)) continue;

        const els = otpInputs();
        if (!els.length || els.some((e) => userEdited.has(e))) break;
        if (fillOtpValue(code)) {
          usedCodes.add(code);
          otpFilledCode = code;
          otpSubmits = 0;
          state.lastCode = code;
          saveState();
          filled = true;
          notify('Verification code filled: ' + code, 'success');
          sendTelegram('🔑 OTP: ' + code + '\n📧 ' + getEmail(), 'otp:' + getEmail() + ':' + code);
          submitOtpNow(code);
        }
        break;
      }

      if (!filled && age > 45000 && Date.now() - otpWarnedAt > 45000) {
        otpWarnedAt = Date.now();
        notify('Code not received yet. Tap Resend on the page', 'warn', 5000);
      }
    } catch (e) {
      pollFails = Math.min(pollFails + 1, 4);
      log('poll error', e);
      notify('Inbox error: ' + e.message, 'error');
    }
    otpPolling = false;
  }

  const OTP_SUBMIT_TEXTS = ['confirm','verify','continue','next','submit','done','confirm code','verify code'];

  function otpPageSig() {
    return (document.body.innerText || '').slice(0, 300).toLowerCase().replace(/\s+/g, ' ') +
           '#' + stepSignature();
  }

  async function submitOtpNow(code) {
    if (!CONFIG.autoSubmitOtp || otpBusy) return;
    otpBusy = true;
    try {
      const before = otpPageSig();
      const need = expectedOtpLen(code ? code.length : 6);

      for (let attempt = 1; attempt <= CONFIG.otpMaxSubmits; attempt++) {
        if (hasCaptcha()) { notify('Captcha detected. Solve it manually', 'warn', 6000); break; }

        let digits = otpValue().replace(/\D/g, '');
        for (let fix = 0; fix < 3 && digits.length !== need && code && code.length === need; fix++) {
          log('OTP incomplete (' + digits.length + '/' + need + '), re-typing...');
          clearOtpInputs();
          await sleep(200);
          fillOtpValue(code);
          await sleep(350);
          digits = otpValue().replace(/\D/g, '');
        }
        if (digits.length !== need) {
          notify('Code not entered fully (' + digits.length + '/' + need + '). Check manually', 'warn', 5000);
          break;
        }

        await sleep(CONFIG.otpSubmitDelayMs);

        const btn = findButton(OTP_SUBMIT_TEXTS);
        if (btn) {
          robustClick(btn);
          notify('Verification code submitted (try ' + attempt + ')', 'success');
        } else {
          const el = otpInputs().slice(-1)[0];
          if (el) {
            const form = el.closest('form');
            if (form && typeof form.requestSubmit === 'function') {
              form.requestSubmit();
              notify('OTP form submitted', 'success');
            } else {
              el.focus();
              ['keydown','keypress','keyup'].forEach((t) => el.dispatchEvent(
                new KeyboardEvent(t, { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true })));
              notify('Confirm button not found. Tried Enter', 'warn');
            }
          }
        }
        otpSubmits = attempt;

        const moved = await waitForChange(before, CONFIG.otpVerifyTimeoutMs);
        if (moved) {
          state.otpVerified = true;
          saveState();
          otpSince = 0;
          notify('OTP verified. Moving to next step', 'success', 3500);
          sendTelegram('✅ Verified: ' + getEmail() + '\n🔑 ' + (code || state.lastCode) + tgPassLine(),
                       'verified:' + getEmail());
          if (CONFIG.otpAdvanceAfterSuccess) { await sleep(600); advanceAfterOtp(); }
          break;
        }

        if (otpError()) {
          notify('Code rejected by Meta. Waiting for a new one', 'error', 5000);
          clearOtpInputs();
          otpFilledCode = '';
          break;
        }

        if (otpLengthError() && code) {
          log('length error -> refill');
          clearOtpInputs();
          await sleep(250);
          fillOtpValue(code);
          await sleep(300);
        }
      }
    } finally {
      otpBusy = false;
    }
  }

  function waitForChange(beforeSig, timeout) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const nowOtp = !!findOtp();
        if (!nowOtp || otpPageSig() !== beforeSig) { clearInterval(iv); resolve(true); }
        else if (Date.now() - t0 > timeout) { clearInterval(iv); resolve(false); }
      }, 350);
    });
  }

  function otpError() {
    const t = (document.body.innerText || '').toLowerCase();
    return /incorrect code|wrong code|code you entered|didn.t match|invalid code|code has expired|expired code/.test(t);
  }

  function otpLengthError() {
    return /should contain \d+ digits|enter (?:the )?\d+[- ]digit/.test(
      (document.body.innerText || '').toLowerCase());
  }

  function clearOtpInputs() {
    otpInputs().forEach((el) => { try { setNative(el, ''); } catch (e) {} });
  }

  let advanceRuns = 0;
  async function advanceAfterOtp() {
    if (advanceRuns > 12) return;
    advanceRuns++;
    for (let i = 0; i < 6; i++) {
      await sleep(CONFIG.stepDelayMs);
      if (hasCaptcha()) { notify('Captcha detected. Solve it manually', 'warn', 6000); return; }
      if (findOtp()) return;
      const text = (document.body.innerText || '').toLowerCase();
      const rule = STEP_RULES.find((r) => r.re.test(text));
      const texts = rule ? rule.buttons : ['continue','next','done','ok','confirm'];
      const btn = findButton(texts);
      if (!btn) continue;
      const before = otpPageSig();
      robustClick(btn);
      notify('Next step: ' + (normText(btn) || 'clicked'), 'success');
      await waitForChange(before, 5000);
    }
  }

  /* ================= POPUP ================= */
  let popupHost = null;
  let fabHost = null;

  const POPUP_CSS = `
    :host { all: initial; }
    .overlay {
      position: fixed; inset: 0; background: rgba(15,18,25,.55);
      backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center;
      z-index: 2147483647; padding: 16px; box-sizing: border-box;
      font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
      animation: fade .2s ease;
    }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes pop { from { transform: translateY(14px) scale(.97); opacity: 0 } to { transform: none; opacity: 1 } }
    .card {
      width: 100%; max-width: 380px; background: #fff; color: #1c1e21;
      border-radius: 20px; padding: 22px 20px 18px; box-sizing: border-box;
      box-shadow: 0 20px 50px rgba(0,0,0,.35); animation: pop .25s ease;
    }
    .head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg,#0866ff,#7b3ff2);
      display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 18px;
    }
    h2 { margin: 0; font-size: 18px; font-weight: 700; }
    p.sub { margin: 4px 0 16px; font-size: 13px; color: #65676b; line-height: 1.4; }
    label { display: block; font-size: 12px; font-weight: 600; color: #444; margin: 12px 0 6px; }
    .field { position: relative; }
    input {
      width: 100%; box-sizing: border-box; padding: 13px 14px; font-size: 15px;
      border: 1.5px solid #d0d4da; border-radius: 12px; outline: none; background: #fff; color: #1c1e21;
      transition: border-color .15s, box-shadow .15s;
    }
    input:focus { border-color: #0866ff; box-shadow: 0 0 0 3px rgba(8,102,255,.15); }
    input.bad { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,.12); }
    .eye {
      position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
      background: none; border: 0; font-size: 12px; font-weight: 700; padding: 6px 8px; cursor: pointer; color: #0866ff;
    }
    .hint { font-size: 11.5px; color: #8a8d91; margin-top: 5px; }
    .err { font-size: 12px; color: #dc2626; margin-top: 8px; min-height: 16px; }
    .row { display: flex; gap: 10px; margin-top: 12px; }
    button.btn {
      flex: 1; padding: 13px 10px; border-radius: 12px; font-size: 15px; font-weight: 700;
      border: 0; cursor: pointer; transition: transform .1s, filter .15s;
    }
    button.btn:active { transform: scale(.97); }
    .skip { background: #e8eaee; color: #333; }
    .go { background: #0866ff; color: #fff; flex: 1.4; }
    .go:hover { filter: brightness(1.08); }
    .foot { text-align: center; font-size: 11px; color: #9a9da2; margin-top: 12px; }
  `;

  function openPopup() {
    if (popupOpen) return;
    popupOpen = true;

    popupHost = document.createElement('div');
    popupHost.id = 'meta-assist-popup';
    const root = popupHost.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${POPUP_CSS}</style>
      <div class="overlay">
        <div class="card" role="dialog" aria-modal="true">
          <div class="head"><div class="logo">M</div><h2>Meta Signup Assistant</h2></div>
          <p class="sub">Email khali chhodo to temp mail auto banegi, OTP auto aayega aur verify ke baad next step bhi khud chalega. Captcha manual.</p>

          <label for="ma-email">Email (optional)</label>
          <div class="field"><input id="ma-email" type="text" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="khali = auto temp mail"></div>
          <div class="hint">Sirf username likhoge to @${CONFIG.defaultDomain} khud lag jayega.</div>

          <label for="ma-pass">Password</label>
          <div class="field">
            <input id="ma-pass" type="password" autocomplete="off" placeholder="Min ${CONFIG.minPasswordLength} characters">
            <button class="eye" id="ma-eye" type="button" aria-label="Show password">SHOW</button>
          </div>
          <div class="hint">Khali chhodoge to default password use hoga.</div>

          <div class="err" id="ma-err"></div>

          <div class="row">
            <button class="btn skip" id="ma-skip" type="button">Skip</button>
            <button class="btn go" id="ma-go" type="button">Start</button>
          </div>
          <div class="foot">Skip = email manual + default password (temp mail off)</div>
        </div>
      </div>`;
    document.documentElement.appendChild(popupHost);

    const $ = (id) => root.getElementById(id);
    const emailEl = $('ma-email'), passEl = $('ma-pass'), errEl = $('ma-err');

    if (state.email && !state.tmId) emailEl.value = state.email;
    if (state.password) passEl.value = state.password;

    $('ma-eye').addEventListener('click', () => {
      const hide = passEl.type === 'password';
      passEl.type = hide ? 'text' : 'password';
      $('ma-eye').textContent = hide ? 'HIDE' : 'SHOW';
    });

    function closePopup() {
      popupHost.remove();
      popupHost = null;
      popupOpen = false;
      showFab();
      setTimeout(run, 100);
    }

    $('ma-skip').addEventListener('click', () => {
      Object.assign(state, { done: true, skipped: true, email: '', tmId: '', password: '', otpVerified: false });
      saveState(); closePopup();
      notify('Skipped. Manual email, default password', 'info');
    });

    $('ma-go').addEventListener('click', () => {
      let email = emailEl.value.trim();
      const pass = passEl.value;
      emailEl.classList.remove('bad'); passEl.classList.remove('bad'); errEl.textContent = '';

      if (email && !email.includes('@')) email += '@' + CONFIG.defaultDomain;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        emailEl.classList.add('bad'); errEl.textContent = 'Email sahi nahi hai.'; return;
      }
      if (pass && pass.length < CONFIG.minPasswordLength) {
        passEl.classList.add('bad');
        errEl.textContent = 'Password kam se kam ' + CONFIG.minPasswordLength + ' characters ka rakhein.';
        return;
      }

      Object.assign(state, { done: true, skipped: false, password: pass, email, tmId: '', otpVerified: false });
      saveState(); closePopup();
      if (email && CONFIG.autoCopyEmail) copyEmail(email, true);
      if (email) sendTelegram('📧 Email: ' + email + tgPassLine(), 'email:' + email);
      notify(email ? 'Saved. Automation started' : 'Started. Temp email will be created', 'success');
    });

    [emailEl, passEl].forEach((el) =>
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ma-go').click(); }));

    setTimeout(() => emailEl.focus(), 150);
  }

  function showFab() {
    if (fabHost && fabHost.isConnected) return;
    fabHost = document.createElement('div');
    const root = fabHost.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        button {
          position: fixed; right: 12px; bottom: 90px; z-index: 2147483645;
          width: 42px; height: 42px; border-radius: 50%; border: 0; cursor: pointer;
          background: #0866ff; color: #fff; opacity: .88; display: grid; place-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,.3);
        }
        button:active { transform: scale(.94); }
        svg { width: 20px; height: 20px; }
      </style>
      <button type="button" aria-label="Assistant settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
        </svg>
      </button>`;
    const fb = root.querySelector('button');
    let pressTimer = null, longPressed = false;

    const startPress = () => {
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        if (getEmail()) copyEmail(getEmail());
        else notify('No email yet', 'warn');
      }, 500);
    };
    const endPress = () => { clearTimeout(pressTimer); pressTimer = null; };

    fb.addEventListener('pointerdown', startPress);
    ['pointerup','pointerleave','pointercancel'].forEach((e) => fb.addEventListener(e, endPress));
    fb.addEventListener('click', (e) => {
      if (longPressed) { e.preventDefault(); e.stopPropagation(); longPressed = false; return; }
      openPopup();
    });
    fb.addEventListener('contextmenu', (e) => e.preventDefault());

    document.documentElement.appendChild(fabHost);
  }

  /* ---------- Shared state ---------- */
  const userEdited = new WeakSet();
  const attempts = new WeakMap();
  const MAX_ATTEMPTS = 6;
  let submitTimer = null;
  let otpFocused = false;
  let captchaNotified = false;

  document.addEventListener('input', (e) => {
    if (!e.isTrusted) return;
    if (popupHost && e.composedPath().includes(popupHost)) return;
    userEdited.add(e.target);
    if (submitTimer) { clearTimeout(submitTimer); submitTimer = null; }
  }, true);

  /* ---------- Utilities ---------- */
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  }

  const attrText = (el) => [
    el.name, el.id, el.placeholder, el.type,
    el.getAttribute('aria-label'), el.getAttribute('autocomplete'), el.getAttribute('data-testid')
  ].filter(Boolean).join(' ').toLowerCase();

  function labelText(el) {
    let t = el.getAttribute('aria-label') || '';
    if (!t && el.id) {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) t = l.innerText;
    }
    if (!t) { const l = el.closest('label'); if (l) t = l.innerText; }
    if (!t && el.parentElement) t = el.parentElement.innerText || '';
    return (t || '').trim().toLowerCase();
  }

  const canTouch = (el) => !!el && !userEdited.has(el) && (attempts.get(el) || 0) < MAX_ATTEMPTS;
  const bump = (el) => attempts.set(el, (attempts.get(el) || 0) + 1);
  const fire = (el, types) => types.forEach((t) => el.dispatchEvent(new Event(t, { bubbles: true })));

  /* ---------- Finders ---------- */
  function findInput(keywords, { skipTypes = ['hidden','radio','checkbox','password','submit','button'] } = {}) {
    for (const inp of document.querySelectorAll('input')) {
      if (skipTypes.includes(inp.type) || !isVisible(inp)) continue;
      const hay = attrText(inp);
      if (keywords.some((k) => hay.includes(k))) return inp;
    }
    return null;
  }

  const CODE_RE = /\b(code|otp|pin|one[- ]?time|confirmation|verification)\b/;

  function looksLikeCodeField(el) {
    if (!el) return false;
    if (el.maxLength === 1) return true;
    if (el.maxLength >= 4 && el.maxLength <= 8) return true;
    if (CODE_RE.test(attrText(el))) return true;
    const lbl = (el.getAttribute('aria-label') || '').toLowerCase() ||
                (el.id && (document.querySelector('label[for="' + CSS.escape(el.id) + '"]') || {}).innerText || '').toLowerCase();
    if (lbl && CODE_RE.test(lbl)) return true;
    const t = (document.body.innerText || '').toLowerCase();
    return /enter the confirmation code|confirmation code should contain|enter the code|digit code/.test(t);
  }

  function findEmail() {
    const skip = ['hidden','radio','checkbox','password'];
    const direct = findInput(['email','reg_email','mobile number','identifier'], { skipTypes: skip });
    if (direct && !looksLikeCodeField(direct)) return direct;

    const cands = Array.from(document.querySelectorAll('input')).filter((i) =>
      isVisible(i) && ['text','email','tel',''].includes(i.type) && !looksLikeCodeField(i));
    if (!cands.length) return null;

    const byLabel = cands.find((i) => /mobile number or email|email or mobile/.test(labelText(i)));
    if (byLabel) return byLabel;

    const bodyText = (document.body.innerText || '').toLowerCase();
    if (/mobile number or email/.test(bodyText) && cands.length === 1) return cands[0];
    return null;
  }

  function splitBoxes() {
    const boxes = Array.from(document.querySelectorAll('input')).filter((i) =>
      isVisible(i) && ['text','tel','number',''].includes(i.type) && i.maxLength === 1);
    return boxes.length >= 4 && boxes.length <= 8 ? boxes : [];
  }

  function findOtp() {
    const direct = findInput(['one-time-code','otp','confirmation','verification','code']);
    if (direct) return direct;
    if (Array.from(document.querySelectorAll('input[type="password"]')).some(isVisible)) return null;
    const t = (document.body.innerText || '').toLowerCase();
    const boxes = splitBoxes();
    if (boxes.length && /code|verify|confirm/.test(t)) return boxes[0];
    if (!/confirmation code|verification code|enter the code|code we sent|security code|digit code|enter code/.test(t)) return null;
    return Array.from(document.querySelectorAll('input'))
      .find((i) => isVisible(i) && ['text','tel','number',''].includes(i.type)) || null;
  }

  const normText = (el) =>
    String(el.innerText || el.value || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const isDisabled = (el) =>
    el.disabled || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');

  function buttonRank(el) {
    if (el.type === 'submit') return 0;
    if (el.tagName === 'BUTTON') return 1;
    if (el.getAttribute('role') === 'button') return 2;
    if (el.tagName === 'INPUT') return 3;
    return 4;
  }

  const isBlockedBtn = (el) =>
    BLOCKED_BTN_RE.test(normText(el)) ||
    BLOCKED_BTN_RE.test((el.getAttribute('aria-label') || '').toLowerCase());

  function findButton(texts) {
    const sel = 'button, [role="button"], input[type="submit"], input[type="button"], a, div[tabindex], span[tabindex], [aria-label]';
    const all = Array.from(document.querySelectorAll(sel))
      .filter((el) => isVisible(el) && !isDisabled(el) && !isBlockedBtn(el));

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
    if (hits[0]) return hits[0];

    const plainTexts = texts.filter((x) => x.length > 25);
    if (plainTexts.length) {
      const els = Array.from(document.querySelectorAll('div, span, a, p, button'))
        .filter((e) => isVisible(e) && !isBlockedBtn(e) && plainTexts.includes(normText(e)));
      if (els.length) return els[els.length - 1];
    }
    return null;
  }

  function robustClick(el) {
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    try { el.focus(); } catch (e) {}
    ['pointerdown','mousedown','pointerup','mouseup'].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    el.click();
  }

  const visibleButtonTexts = () =>
    Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
      .filter(isVisible).map((e) => normText(e) + (isDisabled(e) ? ' (disabled)' : ''));

  const hasCaptcha = () => !!document.querySelector(
    'iframe[src*="captcha" i], iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i], ' +
    'iframe[src*="arkose" i], iframe[title*="captcha" i], div[id*="captcha" i], img[src*="captcha" i]');

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

  function fillSelect(el, candidates) {
    if (!canTouch(el)) return false;
    const wanted = candidates.map((c) => String(c).toLowerCase());
    const opt = Array.from(el.options).find((o) =>
      wanted.includes(o.value.trim().toLowerCase()) || wanted.includes(o.text.trim().toLowerCase()));
    if (!opt || el.value === opt.value) return false;
    bump(el);
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(el, opt.value);
    fire(el, ['input','change','blur']);
    return true;
  }

  function pickGender() {
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(isVisible);
    if (!radios.length) return null;
    const isMale = CONFIG.gender === 'male';
    const valueSet = isMale ? ['2','m','male'] : ['1','f','female'];
    const labelRe = isMale ? /^\s*(male|man)\s*$/ : /^\s*(female|woman)\s*$/;

    const target = radios.find((r) => labelRe.test(labelText(r))) ||
                   radios.find((r) => valueSet.includes((r.value || '').toLowerCase()));
    if (target && !target.checked && canTouch(target)) { bump(target); target.click(); return true; }
    return false;
  }

  const comboDone = new WeakSet();
  let comboBusy = false;

  function dobCandidates(kind) {
    const mName = MONTHS[CONFIG.birthMonth - 1];
    if (kind === 'day') return [CONFIG.birthDay, String(CONFIG.birthDay).padStart(2, '0')];
    if (kind === 'month') return [CONFIG.birthMonth, String(CONFIG.birthMonth).padStart(2, '0'), mName, mName.slice(0, 3)];
    return [CONFIG.birthYear];
  }

  function selectKind(s) {
    const hay = (s.name + ' ' + s.id + ' ' + (s.getAttribute('aria-label') || '')).toLowerCase();
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
    const hay = ((el.getAttribute('aria-label') || '') + ' ' + (el.innerText || '') + ' ' +
                 (el.getAttribute('data-testid') || '') + ' ' + (el.id || '')).toLowerCase();
    if (/\bmonth\b/.test(hay)) return 'month';
    if (/\bday\b/.test(hay)) return 'day';
    if (/\byear\b/.test(hay)) return 'year';
    return null;
  }

  const mouseClick = (el) =>
    ['pointerdown','mousedown','pointerup','mouseup','click'].forEach((t) =>
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));

  function findCombos() {
    const out = {};
    document.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], button[aria-haspopup], div[role="button"][aria-haspopup]')
      .forEach((el) => {
        if (!isVisible(el)) return;
        const k = comboKind(el);
        if (k && !out[k]) out[k] = el;
      });
    return out;
  }

  function pickComboOption(kind, trigger) {
    const wanted = dobCandidates(kind).map((c) => String(c).toLowerCase());
    const opts = Array.from(document.querySelectorAll('[role="option"], [role="listbox"] li, [role="menuitem"]'))
      .filter(isVisible);
    const opt = opts.find((o) => wanted.includes((o.innerText || o.textContent || '').trim().toLowerCase()));
    if (opt) {
      opt.scrollIntoView({ block: 'center' });
      mouseClick(opt);
      comboDone.add(trigger);
      notify('Birth ' + kind + ' set', 'success');
      return true;
    }
    return false;
  }

  function fillCombosSequentially() {
    if (comboBusy) return;
    const combos = findCombos();
    for (const kind of ['month','day','year']) {
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
        setTimeout(() => { comboBusy = false; }, 250);
      }, 300);
      return;
    }
  }

  function fillDob() {
    document.querySelectorAll('select').forEach((s) => {
      if (!isVisible(s)) return;
      const kind = selectKind(s);
      if (kind && fillSelect(s, dobCandidates(kind))) notify('Birth ' + kind + ' set', 'success');
    });

    const di = Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
    if (di) {
      const v = CONFIG.birthYear + '-' + String(CONFIG.birthMonth).padStart(2, '0') + '-' +
                String(CONFIG.birthDay).padStart(2, '0');
      if (fillInput(di, v)) notify('Date of birth set', 'success');
    }

    fillCombosSequentially();
  }

  function dobReady() {
    const checks = [];
    document.querySelectorAll('select').forEach((s) => {
      if (isVisible(s) && selectKind(s)) checks.push(!!s.value);
    });
    const di = Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
    if (di) checks.push(!!di.value);
    Object.values(findCombos()).forEach((el) => checks.push(comboDone.has(el) || userEdited.has(el)));
    return checks.every(Boolean);
  }

  function autoFill() {
    if (findOtp() && !findEmail()) return;

    const em = findEmail();
    if (em) {
      if (!getEmail()) {
        if (CONFIG.autoTempMail && !state.skipped && !tmBusy && !userEdited.has(em)) ensureTempMail();
      } else if (fillInput(em, getEmail())) {
        notify('Email filled', 'success');
        if (CONFIG.copyOnEveryStep && copiedOnce !== getEmail()) copyEmail(getEmail(), true);
      }
    }

    const fn = findInput(['firstname','first name','first_name','given-name']);
    if (fn && fillInput(fn, CONFIG.firstName)) notify('First name filled', 'success');

    const ln = findInput(['lastname','last name','last_name','family-name','surname']);
    if (ln && fillInput(ln, CONFIG.lastName)) notify('Last name filled', 'success');

    document.querySelectorAll('input[type="password"]').forEach((pw) => {
      if (isVisible(pw) && fillInput(pw, getPassword())) notify('Password filled', 'success');
    });

    fillDob();
    if (pickGender()) notify('Gender selected', 'success');
  }

  function formReady() {
    const checks = [];
    ['firstname|first name|first_name|given-name','lastname|last name|last_name|family-name|surname']
      .forEach((k) => { const el = findInput(k.split('|')); if (el) checks.push(!!el.value); });

    document.querySelectorAll('input[type="password"]').forEach((p) => { if (isVisible(p)) checks.push(!!p.value); });
    checks.push(dobReady());

    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(isVisible);
    if (radios.length) checks.push(radios.some((r) => r.checked));

    return checks.every(Boolean);
  }

  const stepSignature = () =>
    Array.from(document.querySelectorAll('input, select'))
      .filter(isVisible).map((e) => e.name || e.id || e.type).join('|');

  const submitState = new Map();
  const SUBMIT_TEXTS = ['continue','next','sign up','signup','create account','create new account','submit'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const STEP_RULES = [
    { name:'choose-email', re:/log in or create an account/,      buttons:['use mobile number or email address'] },
    { name:'save-login',   re:/save your login info/,              buttons:['not now','save','continue'] },
    { name:'finish',       re:/finish creating your meta account/, buttons:['create account','continue'] },
    { name:'create-new',   re:/create a new meta account/,         buttons:['create new account','continue'] },
    { name:'meta-ai',      re:/edit your meta ai details/,         buttons:['confirm','continue'] },
    { name:'terms',        re:/i agree to|agree to (the |our )?terms/, buttons:['i agree','agree','accept','continue','next'] },
    { name:'welcome',      re:/welcome to meta|account created|you.re all set/, buttons:['continue','done','next','ok'] },
    { name:'review',       re:/review your info|confirm your info/, buttons:['continue','confirm','next'] }
  ];

  function currentSig() {
    const heads = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
      .filter(isVisible).map(normText).join('|').slice(0, 120);
    return heads + '#' + stepSignature();
  }

  function hasFormFields() {
    if (findInput(['firstname','first name','first_name','given-name','lastname','last name','surname','family-name'])) return true;
    if (Array.from(document.querySelectorAll('input[type="password"]')).some(isVisible)) return true;
    if (Array.from(document.querySelectorAll('select')).some((x) => isVisible(x) && selectKind(x))) return true;
    if (Object.keys(findCombos()).length) return true;
    return !!Array.from(document.querySelectorAll('input[type="date"]')).find(isVisible);
  }

  function scheduleClick(texts, ready, delay, enterFallbackEl) {
    if (submitTimer) return;
    const sig = currentSig();
    const st = submitState.get(sig) || { count: 0, last: 0 };
    if (st.count >= 3 || Date.now() - st.last < 4000) return;

    if (hasCaptcha()) {
      if (!captchaNotified) { captchaNotified = true; notify('Captcha detected. Please solve it manually', 'warn', 6000); }
      return;
    }
    captchaNotified = false;
    if (!ready()) return;

    submitTimer = setTimeout(() => {
      submitTimer = null;
      if (popupOpen || currentSig() !== sig || hasCaptcha() || !ready()) return;

      const btn = findButton(texts);
      if (btn) {
        robustClick(btn);
        notify('Clicked: ' + (normText(btn) || 'button'), 'success');
      } else if (enterFallbackEl) {
        const form = enterFallbackEl.closest('form');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit(); notify('Form submitted', 'success');
        } else {
          enterFallbackEl.focus();
          ['keydown','keypress','keyup'].forEach((t) => enterFallbackEl.dispatchEvent(
            new KeyboardEvent(t, { key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true })));
          notify('Button not found. Tried Enter key', 'warn');
        }
        log('Visible buttons:', visibleButtonTexts());
      } else {
        notify('Button not found: ' + texts[0], 'warn');
        log('Visible buttons:', visibleButtonTexts());
      }
      submitState.set(sig, { count: st.count + 1, last: Date.now() });
    }, delay);
  }

  function handleSteps() {
    if (!CONFIG.autoSubmitAfterEmail) return;

    const email = findEmail();
    if (!email && findOtp()) return;

    const text = (document.body.innerText || '').toLowerCase();
    for (const r of STEP_RULES) {
      if (r.re.test(text)) return scheduleClick(r.buttons, () => true, CONFIG.stepDelayMs);
    }

    if (email) {
      return scheduleClick(SUBMIT_TEXTS,
        () => EMAIL_RE.test((email.value || '').trim()) && formReady(),
        CONFIG.submitDelayMs, email);
    }

    if (hasFormFields()) return scheduleClick(['next','continue'], formReady, CONFIG.stepDelayMs);
  }

  function handleOtp() {
    const otp = findOtp();
    if (!otp || findEmail()) {
      if (otpSince) {
        otpSince = 0; otpFocused = false; otpSubmits = 0; otpFilledCode = '';
        if (!state.otpVerified) {
          state.otpVerified = true; saveState();
          sendTelegram('✅ Verified: ' + getEmail() + (state.lastCode ? '\n🔑 ' + state.lastCode : '') + tgPassLine(),
                       'verified:' + getEmail());
        }
        if (CONFIG.otpAdvanceAfterSuccess) advanceAfterOtp();
      }
      return;
    }

    if (!otpSince) {
      otpSince = Date.now();
      lastPoll = 0; pollFails = 0; otpWarnedAt = 0; otpSubmits = 0; otpFilledCode = '';
      notify(state.tmId ? 'Checking inbox for the code...' : 'Enter the verification code', 'info', 3500);
    }

    if (state.tmId) pollTempOtp();
    else if (CONFIG.focusOtpField && !otpFocused && !otpValue()) { otp.focus(); otpFocused = true; }

    if (!otpBusy && CONFIG.autoSubmitOtp) {
      const digits = otpValue().replace(/\D/g, '');
      const need = expectedOtpLen(0);
      if (digits.length >= Math.max(CONFIG.otpMinLength, need) &&
          digits !== otpFilledCode && otpSubmits < CONFIG.otpMaxSubmits) {
        otpFilledCode = digits;
        state.lastCode = digits;
        saveState();
        sendTelegram('🔑 OTP: ' + digits + '\n📧 ' + getEmail(), 'otp:' + getEmail() + ':' + digits);
        submitOtpNow(digits);
      }
    }
  }

  function run() {
    if (popupOpen || !state.done) return;
    try { autoFill(); handleSteps(); handleOtp(); }
    catch (err) { console.error('[MetaAssist] error:', err); }
  }

  let debounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(run, 250);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      otpSince = 0; otpSubmits = 0; otpFilledCode = ''; captchaNotified = false;
      log('URL changed:', lastUrl);
      setTimeout(run, 500);
    }
  }, 800);

  setInterval(run, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastPoll = 0; run(); } });

  if (!state.done) {
    openPopup();
  } else {
    showFab();
    notify('Assistant active' + (state.email ? ': ' + state.email : ' (temp email mode)'), 'info');
    if (state.email && CONFIG.autoCopyEmail) copyEmail(state.email, true);
    run();
  }
})();
