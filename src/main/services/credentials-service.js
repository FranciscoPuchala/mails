'use strict';

const fs = require('node:fs/promises');
const { safeStorage } = require('electron');
const { writeFileAtomic, resolveDataPath } = require('../utils/json-store');
const { AppError } = require('../utils/app-error');

// The password is encrypted with the OS keychain (DPAPI on Windows, Keychain on
// macOS). It is never written in plain text, never logged and never sent to the UI.
const FILE_NAME = 'credentials.bin';

function ensureEncryptionAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new AppError(
      'Tu sistema no permite cifrar la contraseña de forma segura, así que no se guardó.',
    );
  }
}

async function savePassword(password) {
  ensureEncryptionAvailable();
  await writeFileAtomic(resolveDataPath(FILE_NAME), safeStorage.encryptString(password));
}

/** Returns the decrypted password, or null when none is stored. Main process only. */
async function readPassword() {
  let encrypted;
  try {
    encrypted = await fs.readFile(resolveDataPath(FILE_NAME));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }

  ensureEncryptionAvailable();
  try {
    return safeStorage.decryptString(encrypted);
  } catch {
    throw new AppError(
      'No se pudo leer la contraseña guardada. Volvé a ingresarla en Configuración.',
    );
  }
}

async function hasPassword() {
  try {
    await fs.access(resolveDataPath(FILE_NAME));
    return true;
  } catch {
    return false;
  }
}

module.exports = { savePassword, readPassword, hasPassword };
