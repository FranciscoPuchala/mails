import { $ } from '../utils/dom.js';

/**
 * Opens the shared confirmation dialog.
 * Resolves true only when the user explicitly confirms (Esc or Cancel → false).
 */
export function confirmDialog({ title, message, confirmLabel = 'Eliminar' }) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title', dialog).textContent = title;
  $('#confirm-message', dialog).textContent = message;
  $('[data-dialog-action="confirm"]', dialog).textContent = confirmLabel;

  return new Promise((resolve) => {
    const handleClick = (event) => {
      const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
      if (action) dialog.close(action);
    };

    dialog.addEventListener('click', handleClick);
    dialog.addEventListener(
      'close',
      () => {
        dialog.removeEventListener('click', handleClick);
        resolve(dialog.returnValue === 'confirm');
      },
      { once: true },
    );

    dialog.returnValue = '';
    dialog.showModal();
    $('[data-dialog-action="cancel"]', dialog).focus();
  });
}
