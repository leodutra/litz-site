// Litz v7: progressive enhancement only; every link and section works without this file.
const WA = 'https://wa.me/5521966006613?text=';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
// A fresh visit, not a reload or back/forward: those restore the old scroll position at load, after this file has run,
// so anything measured here (the reveal's fold, the route, the re-anchor below) would be measured from the top.
const fresh = performance.getEntriesByType('navigation')[0]?.type === 'navigate';

// In-page jumps land instantly, under the header (scroll-padding-top in styles.css); a tap in the mobile menu closes it.
document.addEventListener('click', (e) => e.target.closest('.menu a[href*="#"]')?.closest('.menu').removeAttribute('open'));

// Touch has no hover, so a touch plays the desktop hover once, on its timing, from the moment the finger lands: gold,
// the sheen passing (its bright part has left the button by 600ms), then back after 600ms or once the finger is up,
// whichever is later (.is-tapped, styles.css). A touch that turns into a scroll is cancelled and drops it at once.
const untap = (btn) => { clearTimeout(btn.tapped); btn.tapped = 0; btn.classList.remove('is-tapped'); };
document.addEventListener('pointerdown', (e) => {
  const btn = e.pointerType !== 'mouse' && e.target.closest('.btn');
  if (!btn) return;
  untap(btn);
  btn.style.setProperty('--sweep-wait', '0s'); // a second tap: send the sheen back to its start at once, so it sweeps again
  void btn.offsetWidth;
  btn.style.removeProperty('--sweep-wait');
  btn.classList.add('is-tapped');
  btn.held = true;
  btn.tapped = setTimeout(() => { btn.tapped = 0; if (!btn.held) untap(btn); }, 600);
});
document.addEventListener('pointerup', (e) => {
  const btn = e.target.closest('.btn.is-tapped');
  if (!btn) return;
  btn.held = false;
  if (!btn.tapped) untap(btn);
});
document.addEventListener('pointercancel', (e) => { const btn = e.target.closest('.btn'); if (btn) untap(btn); });

// Mobile menu: while it's open the page behind it is inert, so Tab stays inside; Esc closes it and hands focus back to
// its button, and widening past the mobile breakpoint closes it too.
const menu = document.querySelector('.menu');
if (menu) {
  const behind = document.querySelectorAll('main, footer, .dock');
  menu.addEventListener('toggle', () => behind.forEach((el) => { el.inert = menu.open; }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) menu.open = false; });
}

// Mobile dock: hidden while the page's own primary action ([data-dock-hide]: each page's own booking buttons and the form) is on screen.
const dock = document.querySelector('.dock');
if (dock) {
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    dock.classList.toggle('is-hidden', visible.size > 0);
    dock.classList.add('is-placed');
  });
  document.querySelectorAll('[data-dock-hide]').forEach((el) => io.observe(el));
}

// Hero review: three quotes in one grid cell, crossfading every 5s, round and round. It holds while the pointer or focus
// is on it or the tab is hidden, and never moves under reduced motion. The dots show which quote is up and pick one;
// picking stops the rotation for good (WCAG 2.2.2), and then changes are announced.
document.querySelectorAll('[data-rotator]').forEach((box) => {
  const quotes = [...box.querySelectorAll('figure')], dots = [...box.querySelectorAll('.dots button')];
  const row = box.closest('.proof') || box;
  let i = 0, timer = 0;
  const show = (n) => {
    quotes[i].classList.remove('is-on'); quotes[i].setAttribute('aria-hidden', 'true'); dots[i]?.removeAttribute('aria-current');
    i = n;
    quotes[i].classList.add('is-on'); quotes[i].removeAttribute('aria-hidden'); dots[i]?.setAttribute('aria-current', 'true');
  };
  dots.forEach((d, n) => d.addEventListener('click', () => { clearInterval(timer); box.setAttribute('aria-live', 'polite'); if (n !== i) show(n); }));
  if (calm) return;
  timer = setInterval(() => {
    if (row.matches(':hover') || row.contains(document.activeElement) || document.hidden) return;
    show((i + 1) % quotes.length);
  }, 5000);
});

// Tratamentos: ?cat= presets the CSS-only filter (category links from Início). Before the scroll reveal below measures,
// so the filtered list is what it sees: the results on screen are never armed.
const preset = new URLSearchParams(location.search).get('cat');
const tab = preset && document.querySelector(`.filters input[value="${CSS.escape(preset)}"]`);
if (tab) tab.checked = true;

// Scroll reveal: only what starts below the fold is armed (hidden), so nothing on screen ever blinks; each element is
// released as its first pixel arrives, staggered by its place among those arriving with it (--i, max 5): one that
// arrives alone starts at once, a row arriving together steps 80ms apart. One line, the fold, for arming and releasing:
// a later line (it was 90%) leaves whatever stops in the strip below it as an empty gap, on load or when a scroll ends.
// Print shows them all (styles.css). Reduced motion, a reload or back/forward (what is on screen there was already seen):
// never armed. What has no box yet (a treatment filtered out by ?cat=) is armed too, so it reveals like the rest once a filter shows it.
// A jump's target fades without the rise: the browser scrolls to its drawn box, 16px low while armed, so the rise
// would carry it 16px past its place, up against the header.
const still = (id) => { const t = id && document.getElementById(id)?.closest('[data-reveal]'); if (t) t.style.transform = 'none'; };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="#"]');
  if (a && a.hash && a.href.split('#')[0] === location.href.split('#')[0]) still(decodeURIComponent(a.hash.slice(1)));
});
if (fresh && location.hash) still(decodeURIComponent(location.hash.slice(1)));
const io = !calm && fresh && new IntersectionObserver((entries) => entries.filter((e) => e.isIntersecting).forEach((e, k) => {
  e.target.style.setProperty('--i', Math.min(5, k));
  e.target.classList.add('is-revealed');
  io.unobserve(e.target);
}), { rootMargin: '0px 0px 16px 0px' }); // the observer sees the armed box, 16px lower (translateY in styles.css)
if (io) {
  // Measure all first, then arm: interleaving reads and writes would force a layout per element.
  [...document.querySelectorAll('[data-reveal]')].filter((el) => { const r = el.getBoundingClientRect(); return !r.height || r.top >= innerHeight; }).forEach((el) => {
    el.classList.add('is-armed');
    io.observe(el);
  });
}

// "Por que a Litz": the statement lights up word by word (opacity .18 → 1) as it scrolls through the viewport.
// Armed only once it comes near, so the words are never dim before anyone can see them; scrolling only measures while
// it is near the viewport.
const statement = document.querySelector('[data-words]');
if (statement && !calm) {
  let words, near = false, queued = 0;
  const light = () => {
    const r = statement.getBoundingClientRect();
    const lit = Math.round(Math.max(0, Math.min(1, (innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.3))) * words.length);
    words.forEach((w, i) => w.classList.toggle('is-dim', i >= lit));
  };
  new IntersectionObserver(([e]) => {
    near = e.isIntersecting;
    if (!near) return;
    if (!words) {
      words = statement.textContent.trim().split(/\s+/).map((w) => Object.assign(document.createElement('span'), { textContent: w }));
      statement.replaceChildren(...words.flatMap((w, i) => (i ? [' ', w] : [w])));
    }
    light();
  }, { rootMargin: '0px 0px 25% 0px' }).observe(statement);
  addEventListener('scroll', () => { if (near) queued ||= requestAnimationFrame(() => { queued = 0; light(); }); }, { passive: true });
}

// Home › Tratamentos (≥960px): hovering or focusing a category swaps the sticky image, its caption and its WhatsApp link.
document.querySelectorAll('[data-cats]').forEach((box) => {
  const rows = [...box.querySelectorAll('.cat')], frames = [...box.querySelectorAll('.cat-frame img')];
  const name = box.querySelector('[data-cat-name]'), ask = box.querySelector('[data-cat-wa]');
  const pick = (i) => {
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    frames.forEach((f, k) => f.classList.toggle('is-on', k === i));
    name.textContent = rows[i].dataset.name;
    ask.href = WA + encodeURIComponent(`Olá, Litz! Gostaria de saber mais sobre ${rows[i].dataset.name.toLowerCase()}.`);
  };
  rows.forEach((r, i) => ['mouseenter', 'focusin'].forEach((ev) => r.addEventListener(ev, () => pick(i))));
});

// Booking form → WhatsApp message, built in order from what's filled in. Nothing is stored on the site.
document.querySelectorAll('[data-composer]').forEach((form) => {
  const preview = form.querySelector('[data-preview]'), send = form.querySelector('[data-send]');
  const compose = () => {
    const data = new FormData(form), v = (k) => (data.get(k) || '').trim();
    let msg = 'Olá, Litz!';
    if (v('name')) msg += ` Meu nome é ${v('name')}.`;
    if (v('visit') === 'primeira') msg += ' Seria minha primeira consulta.';
    if (v('visit') === 'retorno') msg += ' Já sou paciente.';
    msg += ` Gostaria de agendar uma avaliação${v('treatment') ? ` para ${v('treatment')}` : ''}.`;
    if (v('period')) msg += ` O melhor horário para mim é ${v('period')}.`;
    if (v('note')) msg += ` Sobre mim: ${v('note').replace(/[.!?]?$/, '.')}`;
    preview.textContent = msg;
    send.href = WA + encodeURIComponent(msg);
  };
  // the message waits in WhatsApp until the patient taps send there
  send.addEventListener('click', () => { form.querySelector('[data-sent-note]').textContent = 'Abrimos o WhatsApp com a sua mensagem: toque em enviar por lá.'; });
  // optional choices: a second tap on the picked chip clears it
  form.querySelectorAll('[data-toggle]').forEach((group) => {
    let picked = null;
    group.querySelectorAll('input').forEach((r) => r.addEventListener('click', () => {
      if (picked === r) { r.checked = false; picked = null; compose(); } else picked = r;
    }));
  });
  form.addEventListener('input', compose);
  form.addEventListener('submit', (e) => { e.preventDefault(); compose(); send.click(); });
  compose();
});

// "Copiar endereço": shown only where the clipboard API exists, so the page never offers a dead button.
document.querySelectorAll('[data-copy]').forEach((btn) => {
  if (!navigator.clipboard) return;
  const label = btn.querySelector('span'), idle = label.textContent;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); label.textContent = 'Endereço copiado'; } catch { label.textContent = 'Não foi possível copiar'; }
    setTimeout(() => { label.textContent = idle; }, 2400);
  });
});

// The way in: once the route card is in view, the rail draws and each stop cascades in, .18s apart.
document.querySelectorAll('.route').forEach((route) => {
  if (calm || !fresh) return;
  [...route.children].forEach((li, i) => li.style.setProperty('--i', i));
  route.classList.add('is-armed');
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(() => requestAnimationFrame(() => route.classList.remove('is-armed')));
  }, { threshold: 0.35 }).observe(route);
});

// Tratamentos sidebar (sticky, top: 104px in styles.css): taller than most laptop screens, so where it doesn't fit it
// sticks by its bottom edge instead, 24px above the fold, and the help card under the list stays in view.
const side = document.querySelector('.trat-side');
if (side) {
  const fit = () => { side.style.top = `${Math.min(104, innerHeight - side.offsetHeight - 24)}px`; };
  new ResizeObserver(fit).observe(side);
  addEventListener('resize', fit);
}

// A new Tratamentos filter shows its results at once: a filter is clicked again and again, so its armed reveals now in
// view drop .is-armed (the hidden state and its transition go together), by the same line as on load; the rest still
// reveal on scroll. Filtered-out items (no box) stay armed. Measure all first, then write. A released element stops
// being watched, so it never takes a stagger slot from one that really arrives later. A jump to a section or a treatment
// is left to the observer: what lands on screen reveals together on the next frame, staggered by arrival (Equipe's cards).
const release = () => [...document.querySelectorAll('[data-reveal].is-armed')]
  .filter((el) => { const r = el.getBoundingClientRect(); return r.height && r.top < innerHeight; })
  .forEach((el) => { el.classList.remove('is-armed'); io.unobserve(el); });
document.querySelector('.filters')?.addEventListener('change', release);

// Arriving on page#section: re-anchor once the web fonts have swapped in, since their reflow moves the target.
// Only on a fresh visit, where the browser has already gone to the section. A reload or back/forward is left to the
// browser, as without JS: it restores where the visitor was at load, so a jump here bounced (a reload of /#equipe from
// the top showed Equipe, then the hero again). Not once the visitor has scrolled or pressed a key: on a slow line the
// fonts can arrive after they've moved on, and the jump would pull them back.
if (location.hash && fresh) {
  let moved = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => addEventListener(t, () => { moved = true; }, { once: true, passive: true }));
  document.fonts.ready.then(() => { if (!moved) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); });
}

// Hero chips: reorder visually so each row fills before wrapping ([data-chip-pack] on the chips' flex-wrap row).
// "Só uma avaliação" stays first, the rest go first-fit by width, largest first, and keep their source order within a row.
// Only the CSS order changes, so reading and tab order stay as written; without JS the row keeps source order.
// Cost: one ResizeObserver acting on width changes only, the write deferred to a frame (no RO loop warnings);
// widths measured once, and again after the web fonts load.
{
  const packChips = (el) => {
    const kids = [...el.children]; if (kids.length < 2) return;
    const W = el.clientWidth + 0.5, G = parseFloat(getComputedStyle(el).columnGap) || 0;
    const w = kids.map((k) => k._w || (k._w = k.getBoundingClientRect().width));
    const rows = [{ used: w[0], items: [0] }];
    kids.map((_, i) => i).slice(1).sort((a, b) => w[b] - w[a]).forEach((i) => {
      let r = rows.find((r) => r.used + G + w[i] <= W);
      if (!r) rows.push(r = { used: -G, items: [] });
      r.used += G + w[i]; r.items.push(i);
    });
    let n = 0;
    rows.forEach((r) => r.items.sort((a, b) => a - b).forEach((i) => { const o = String(n++); if (kids[i].style.order !== o) kids[i].style.order = o; }));
  };
  const ro = new ResizeObserver((es) => es.forEach((e) => { const w = Math.round(e.contentRect.width); if (e.target._pw === w) return; e.target._pw = w; requestAnimationFrame(() => packChips(e.target)); }));
  const els = document.querySelectorAll('[data-chip-pack]');
  els.forEach((el) => ro.observe(el));
  document.fonts && document.fonts.ready.then(() => els.forEach((el) => { [...el.children].forEach((k) => { k._w = 0; }); packChips(el); }));
}

// Paid ads (Google Ads test from 2026-11). A visit that comes from an ad (gclid, gbraid, wbraid or utm_source in the URL)
// gets a short ref code, kept 90 days in this browser with the click ids. Every WhatsApp message the visitor opens then
// ends with "(Ref L7K2)", so a chat can be tied to its ad at the end of the test (search WhatsApp for "Ref"); the reception does nothing with it. The letter is the campaign
// (CODE below, utm_content before utm_campaign: L local, O ortodontia, P prótese e implante, C clareamento, E canal,
// I criança, B bruxismo, D dor de dente; an unknown value gives its first letter, G an ad click without one: add new ads to CODE so
// letters don't collide); the rest is random, without 0/O, 1/I/L. Visits not from an ad get no ref and load nothing.
// Google Tag Manager is the second confirmed third-party exception (CLAUDE.md): the container loads only for ad
// visitors, only after they accept cookies, and only while GTM below is set. Its tags (Google Ads conversion and
// conversion linker, GA4) are configured in Tag Manager, firing on the custom event "contato" pushed by measure().
const GTM = 'GTM-TH8GDLXL';
const keep = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: no ref */ } },
};
const lead = (() => {
  const q = new URLSearchParams(location.search), old = keep.get('litz-lead');
  const hit = Object.fromEntries(['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].filter((k) => q.get(k)).map((k) => [k, q.get(k)]));
  const fresh = old?.ref && Date.now() - old.at < 90 * 864e5;
  const click = hit.gclid || hit.gbraid || hit.wbraid;
  if (!click && !hit.utm_source) return fresh ? old : null;
  const key = (s) => s && s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const CODE = { local: 'L', ortodontia: 'O', 'protese-implante': 'P', clareamento: 'C', canal: 'E', crianca: 'I', bruxismo: 'B', 'dor-de-dente': 'D' };
  const tag = Object.hasOwn(CODE, key(hit.utm_content) ?? '') ? key(hit.utm_content) : key(hit.utm_campaign);
  const letter = (Object.hasOwn(CODE, tag ?? '') && CODE[tag]) ||(tag || (click ? 'g' : key(hit.utm_source)))[0].toUpperCase();
  const abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const ref = fresh && old.ref[0] === letter ? old.ref : letter + [...crypto.getRandomValues(new Uint8Array(3))].map((n) => abc[n % abc.length]).join('');
  const now = { ...hit, ref, at: Date.now() }; // the latest ad click wins; the ref stays the same for the same campaign
  keep.set('litz-lead', now);
  return now;
})();

const tagOn = () => {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); }; // consent commands must be `arguments` objects, not arrays
  gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' }); // no remarketing (health is a sensitive category)
  dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  // Ads reads the click id (gclid/gbraid/wbraid) from the page URL; the consent handler puts it back for a visitor who
  // accepts on a later page. No url_passthrough or pre-consent loading: Consent Mode's modelling needs ~700 ad clicks a
  // week (this account gets ~80), and its cookieless pings would send the treatment page before the visitor says yes.
  document.head.append(Object.assign(document.createElement('script'), { async: true, src: `https://www.googletagmanager.com/gtm.js?id=${GTM}` }));
};
// LGPD: generic event names, no treatment, no message text. In GTM, use ref as the Ads conversion's transaction ID
// (one conversion per lead).
const measure = (method) => {
  if (!window.gtag) return;
  dataLayer.push({ event: 'contato', method, ref: lead.ref, click_id: lead.gclid || lead.gbraid || lead.wbraid || '' });
};
if (lead) {
  // Capture phase, before the click's default action: the form's and the categories' links get their href set late.
  const stamp = (e) => {
    const a = e.target.closest?.('a[href^="https://wa.me/"], a[href^="tel:"]');
    if (!a) return;
    if (a.protocol === 'https:') {
      const url = new URL(a.href), text = url.searchParams.get('text') || '';
      if (!text.includes(`Ref ${lead.ref}`)) a.href = `${url.origin}${url.pathname}?text=${encodeURIComponent(`${text} (Ref ${lead.ref})`.trim())}`;
    }
    if (e.type !== 'contextmenu') measure(a.protocol === 'tel:' ? 'telefone' : 'whatsapp');
  };
  ['click', 'auxclick', 'contextmenu'].forEach((t) => document.addEventListener(t, stamp, true));
}

if (GTM) {
  const ask = () => {
    const box = Object.assign(document.createElement('div'), { className: 'consent', innerHTML: '<p>Usamos cookies do Google para medir os resultados dos nossos anúncios. Se você aceitar, o Google fica sabendo quais páginas do site você visitou (e, por elas, o tratamento que procura), mas nunca o que você escreve para a clínica. Não usamos esses dados para mostrar anúncios a você.</p><div class="consent-act"><button type="button" class="btn" value="no">Recusar</button><button type="button" class="btn" value="yes">Aceitar</button></div>' });
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Cookies');
    box.addEventListener('click', (e) => {
      const v = e.target.closest('button')?.value;
      if (!v) return;
      keep.set('litz-consent', v);
      box.remove();
      if (v === 'yes') {
        // accepted on a later page: restore the stored ad click to the URL so Ads still credits it (stays in the URL)
        const id = ['gclid', 'gbraid', 'wbraid'].find((k) => lead[k]), q = new URLSearchParams(location.search);
        if (id && !q.has(id)) { q.set(id, lead[id]); history.replaceState(history.state, '', `?${q}${location.hash}`); }
        return tagOn();
      }
      // refused: drop the tag's first-party cookies (_ga*, _gcl*), and reload if it was already running
      const host = location.hostname.replace(/^www\./, '');
      document.cookie.split('; ').map((c) => c.split('=')[0]).filter((n) => /^_g(a|cl)/.test(n)).forEach((n) => {
        document.cookie = `${n}=; max-age=0; path=/`;
        document.cookie = `${n}=; max-age=0; path=/; domain=.${host}`;
      });
      if (window.gtag) location.reload();
    });
    document.body.append(box);
  };
  const choice = keep.get('litz-consent');
  if (choice === 'yes' && lead) tagOn();
  if (!choice && lead) ask();
  // Footer "Cookies" (ad visitors only, the only ones the tag can load for): change the answer at any time.
  if (lead) document.querySelectorAll('[data-consent]').forEach((el) => {
    el.hidden = false;
    el.querySelector('button').addEventListener('click', () => { document.querySelector('.consent')?.remove(); ask(); });
  });
}
