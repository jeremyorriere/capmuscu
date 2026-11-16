// Comportement partagé des démonstrations animées : Pause / Lecture, repli si une image ne charge pas, tiroirs à chargement différé.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function setPaused(root: HTMLElement, paused: boolean) {
  root.classList.toggle('paused', paused);
  const btn = root.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  if (!btn) return;
  const name = btn.getAttribute('aria-label')?.split(' : ')[1] ?? '';
  const text = btn.querySelector('[data-motion-text]');
  const icon = btn.querySelector('[data-motion-icon]');
  if (text) text.textContent = paused ? 'Lecture' : 'Pause';
  if (icon) icon.textContent = paused ? '▶' : '⏸';
  btn.setAttribute('aria-label', `${paused ? 'Relancer' : 'Mettre en pause'} la démonstration : ${name}`);
}

export function initMotion(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>('[data-motion]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    if (reduced) setPaused(root, true);
    root.querySelectorAll<HTMLImageElement>('img.cm-img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) root.classList.add('cm-failed');
    });
  });
}

document.addEventListener('click', (ev) => {
  const btn = (ev.target as Element).closest<HTMLButtonElement>('[data-motion-toggle]');
  const root = btn?.closest<HTMLElement>('[data-motion]');
  if (root) setPaused(root, !root.classList.contains('paused'));
});

// L'événement « error » ne remonte pas : on l'écoute en phase de capture.
document.addEventListener(
  'error',
  (ev) => {
    const t = ev.target;
    if (t instanceof HTMLImageElement && t.classList.contains('cm-img')) t.closest('[data-motion]')?.classList.add('cm-failed');
  },
  true,
);

/** Tiroirs <details data-peek> : le contenu (cloné depuis un <template>) n'est créé, donc les images chargées, qu'à l'ouverture. */
document.addEventListener(
  'toggle',
  (ev) => {
    const d = ev.target;
    if (!(d instanceof HTMLDetailsElement) || !d.open || !d.hasAttribute('data-peek')) return;
    const body = d.querySelector<HTMLElement>('[data-peek-body]');
    const tpl = d.querySelector<HTMLTemplateElement>('template');
    if (body && tpl && !body.hasChildNodes()) {
      body.append(tpl.content.cloneNode(true));
      initMotion(body);
    }
  },
  true,
);

initMotion();
