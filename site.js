// Litz v7: progressive enhancement only; every link and section works without this file.
const WA = 'https://wa.me/5521966006613?text=';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// In-page jumps land instantly, under the header (scroll-padding-top in styles.css); a tap in the mobile menu closes it.
document.addEventListener('click', (e) => e.target.closest('.menu a[href*="#"]')?.closest('.menu').removeAttribute('open'));

// Mobile menu: while it's open the page behind it is inert, so Tab stays inside; Esc closes it and hands focus back to
// its button, and widening past the mobile breakpoint closes it too.
const menu = document.querySelector('.menu');
if (menu) {
  const behind = document.querySelectorAll('main, footer, .dock');
  menu.addEventListener('toggle', () => behind.forEach((el) => { el.inert = menu.open; }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) menu.open = false; });
}

// Mobile dock: hidden while the page's own primary action ([data-dock-hide]: the hero button, the booking form) is on screen.
const dock = document.querySelector('.dock');
if (dock) {
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    dock.classList.toggle('is-hidden', visible.size > 0);
  });
  document.querySelectorAll('[data-dock-hide]').forEach((el) => io.observe(el));
}

// Hero review: three quotes in one grid cell, crossfading every 5s. It goes round once and rests on the first quote,
// holds while the pointer or focus is on it or the tab is hidden, and never moves under reduced motion.
document.querySelectorAll('[data-rotator]').forEach((box) => {
  if (calm) return;
  const quotes = [...box.children], row = box.closest('.proof') || box;
  let i = 0;
  const timer = setInterval(() => {
    if (row.matches(':hover') || row.contains(document.activeElement) || document.hidden) return;
    quotes[i].classList.remove('is-on'); quotes[i].setAttribute('aria-hidden', 'true');
    i = (i + 1) % quotes.length;
    quotes[i].classList.add('is-on'); quotes[i].removeAttribute('aria-hidden');
    if (i === 0) clearInterval(timer);
  }, 5000);
});

// Scroll reveal: only what starts below the fold is armed (hidden), so nothing on screen ever blinks; each element is
// released as it arrives, staggered by sibling index. Print shows them all (styles.css). Reduced motion: never armed.
if (!calm) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-revealed');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  // Measure all first, then arm: interleaving reads and writes would force a layout per element.
  [...document.querySelectorAll('[data-reveal]')].filter((el) => el.getBoundingClientRect().top >= innerHeight * 0.9).forEach((el) => {
    el.style.setProperty('--i', Math.min(5, [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal')).indexOf(el)));
    el.classList.add('is-armed');
    io.observe(el);
  });
}

// "Por que a Litz": the statement lights up word by word (opacity .18 → 1) as it scrolls through the viewport.
// Armed only once it comes near, so the words are never dim before anyone can see them.
const statement = document.querySelector('[data-words]');
if (statement && !calm) {
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const words = statement.textContent.trim().split(/\s+/).map((w) => Object.assign(document.createElement('span'), { textContent: w }));
    statement.replaceChildren(...words.flatMap((w, i) => (i ? [' ', w] : [w])));
    const light = () => {
      const r = statement.getBoundingClientRect();
      const lit = Math.round(Math.max(0, Math.min(1, (innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.3))) * words.length);
      words.forEach((w, i) => w.classList.toggle('is-dim', i >= lit));
    };
    let queued = 0;
    addEventListener('scroll', () => { queued ||= requestAnimationFrame(() => { queued = 0; light(); }); }, { passive: true });
    light();
  }, { rootMargin: '0px 0px 25% 0px' }).observe(statement);
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
  if (calm) return;
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

// Tratamentos: ?cat= presets the CSS-only filter (category links from Início).
const preset = new URLSearchParams(location.search).get('cat');
const tab = preset && document.querySelector(`.filters input[value="${CSS.escape(preset)}"]`);
if (tab) tab.checked = true;

// A jump to a section shows what lands on screen at once: its armed reveals there drop .is-armed (the hidden state and its
// transition go together), as on load; the rest still reveal on scroll. Measure all first, then write.
const releaseTarget = () => {
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (!target) return;
  [...target.querySelectorAll('[data-reveal].is-armed')].filter((el) => el.getBoundingClientRect().top < innerHeight).forEach((el) => el.classList.remove('is-armed'));
};
addEventListener('hashchange', releaseTarget);

// Arriving on page#section: re-anchor once the web fonts have swapped in, since their reflow moves the target.
if (location.hash) document.fonts.ready.then(() => { document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' }); releaseTarget(); });

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
