'use strict';

const { ipcMain } = require('electron');
const { AppError } = require('./app-error');
const { APP_ORIGIN } = require('./app-protocol');

function isTrustedSender(event) {
  return Boolean(event.senderFrame?.url?.startsWith(`${APP_ORIGIN}/`));
}

/**
 * Registers an IPC handler that only answers our own UI and always resolves to
 * { ok: true, data } or { ok: false, error }, where `error` is user-facing text.
 * Unexpected errors are logged without their arguments (which may hold secrets).
 */
function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!isTrustedSender(event)) return { ok: false, error: 'Origen no autorizado.' };
    try {
      return { ok: true, data: await handler(...args) };
    } catch (error) {
      if (error instanceof AppError) return { ok: false, error: error.message };
      console.error(`[ipc:${channel}]`, error);
      return { ok: false, error: 'Ocurrió un error inesperado. Probá de nuevo.' };
    }
  });
}

module.exports = { handle };
