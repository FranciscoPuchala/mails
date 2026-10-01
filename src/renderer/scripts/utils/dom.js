export const $ = (selector, root = document) => root.querySelector(selector);

export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Clones the first element inside a <template id="..."> */
export function cloneTemplate(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

/** Loads an HTML partial file and returns its root element, ready to insert. */
export async function loadPartial(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
  const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  return document.adoptNode(doc.body.firstElementChild);
}

export function setFieldInvalid(field, invalid) {
  field.classList.toggle('is-invalid', invalid);
  const control = $('input, textarea, select', field);
  if (control) control.setAttribute('aria-invalid', String(invalid));
}

export function setButtonLoading(button, loading) {
  button.classList.toggle('is-loading', loading);
  button.disabled = loading;
  button.setAttribute('aria-busy', String(loading));
}

export function debounce(fn, waitMs) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

/** Lowercase and accent-free, for forgiving search matches. */
export function normalizeForSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const dateTimeFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(isoString) {
  return dateTimeFormat.format(new Date(isoString));
}
