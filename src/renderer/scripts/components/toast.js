import { $, cloneTemplate } from '../utils/dom.js';

const DURATION_MS = { success: 3500, info: 3500, error: 7000 };
const RESUME_DURATION_MS = 2000;
const LEAVE_DURATION_MS = 200;
const MAX_VISIBLE = 4;
const ICON_CLASS = { success: 'icon--success', error: 'icon--error', info: 'icon--info' };

/** Shows a self-dismissing notification. type: 'success' | 'error' | 'info' */
export function showToast(message, type = 'info') {
  const container = $('#toasts');
  const toast = cloneTemplate('tpl-toast');
  toast.classList.add(`toast--${type}`);
  $('.toast__icon', toast).classList.add(ICON_CLASS[type]);
  $('.toast__message', toast).textContent = message;
  if (type === 'error') toast.setAttribute('role', 'alert');

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), LEAVE_DURATION_MS);
  };

  $('.toast__close', toast).addEventListener('click', dismiss);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => {
    timer = setTimeout(dismiss, RESUME_DURATION_MS);
  });

  container.append(toast);
  while (container.children.length > MAX_VISIBLE) container.firstElementChild.remove();
  timer = setTimeout(dismiss, DURATION_MS[type]);
}
