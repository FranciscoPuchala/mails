import { $, $$, loadPartial } from './utils/dom.js';
import { isModKey, MOD_KEY_LABEL } from './utils/keyboard.js';
import { showToast } from './components/toast.js';
import { createSendView } from './views/send-view.js';
import { createTemplatesView } from './views/templates-view.js';
import { createHistoryView } from './views/history-view.js';
import { createSettingsView } from './views/settings-view.js';

const VIEW_FACTORIES = {
  send: createSendView,
  templates: createTemplatesView,
  history: createHistoryView,
  settings: createSettingsView,
};
const VIEW_NAMES = Object.keys(VIEW_FACTORIES);

const views = new Map();
let activeName = null;

async function navigate(name, payload) {
  const next = views.get(name);
  if (!next) return;

  const current = views.get(activeName);
  if (current && activeName !== name) {
    if (current.controller.canLeave && !(await current.controller.canLeave())) return;
    current.element.hidden = true;
  }

  for (const item of $$('[data-nav]')) {
    const isActive = item.dataset.nav === name;
    item.classList.toggle('is-active', isActive);
    if (isActive) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }

  next.element.hidden = false;
  activeName = name;
  await next.controller.onShow?.(payload);
}

function handleGlobalKeydown(event) {
  const index = Number(event.key) - 1;
  if (isModKey(event) && index >= 0 && index < VIEW_NAMES.length) {
    event.preventDefault();
    navigate(VIEW_NAMES[index]);
    return;
  }
  views.get(activeName)?.controller.onKeydown?.(event);
}

function handleNavigationClick(event) {
  const target = event.target.closest('[data-nav], [data-go-to]');
  if (target) navigate(target.dataset.nav ?? target.dataset.goTo);
}

async function loadViews() {
  const container = $('#views');
  const elements = await Promise.all(
    VIEW_NAMES.map((name) => loadPartial(`views/${name}-view.html`)),
  );
  container.append(...elements);

  VIEW_NAMES.forEach((name, i) => {
    const controller = VIEW_FACTORIES[name](elements[i], { navigate });
    views.set(name, { element: elements[i], controller });
  });
}

async function start() {
  await loadViews();
  for (const label of $$('[data-mod-key]')) label.textContent = MOD_KEY_LABEL;

  document.addEventListener('keydown', handleGlobalKeydown);
  document.addEventListener('click', handleNavigationClick);
  window.addEventListener('unhandledrejection', (event) => {
    showToast(event.reason?.message ?? 'Ocurrió un error inesperado.', 'error');
  });

  await navigate('send');
}

start();
