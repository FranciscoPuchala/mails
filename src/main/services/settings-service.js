'use strict';

const { nativeTheme } = require('electron');
const { createJsonStore } = require('../utils/json-store');
const credentialsService = require('./credentials-service');
const {
  requireObject,
  requireText,
  requireOneOf,
  requirePort,
  requireEmail,
} = require('../utils/validators');
const { AppError } = require('../utils/app-error');

const PROVIDERS = ['gmail', 'smtp'];
const SECURITY_MODES = ['ssl', 'starttls', 'none'];
const THEMES = ['system', 'light', 'dark'];
const HOST_PATTERN = /^[a-z0-9.-]+$/i;

const GMAIL_PRESET = Object.freeze({ host: 'smtp.gmail.com', port: 465, security: 'ssl' });

const DEFAULT_SETTINGS = {
  provider: 'gmail',
  host: '',
  port: 465,
  security: 'ssl',
  username: '',
  fromName: '',
  fromEmail: '',
  signature: '',
  theme: 'system',
};

const store = createJsonStore('settings.json', DEFAULT_SETTINGS);

function requireHost(value) {
  const host = requireText(value, 'El servidor SMTP', { maxLength: 253 });
  if (!HOST_PATTERN.test(host)) throw new AppError('El servidor SMTP no tiene un formato válido.');
  return host;
}

/** Custom SMTP fields are only validated when used; with Gmail the last values are kept. */
function sanitizeServerFields(input, current) {
  if (input.provider !== 'smtp') {
    return {
      host: current.host,
      port: current.port,
      security: current.security,
      username: current.username,
    };
  }
  return {
    host: requireHost(input.host),
    port: requirePort(input.port),
    security: requireOneOf(input.security, SECURITY_MODES, 'Seguridad'),
    username: requireText(input.username, 'El usuario', { maxLength: 254, required: false }),
  };
}

function sanitizePassword(value, provider) {
  if (value === undefined || value === null || value === '') return null;
  const password = requireText(value, 'La contraseña', { maxLength: 1000, trim: false });
  // Google shows app passwords in groups ("abcd efgh ijkl mnop"); spaces are not part of it.
  return provider === 'gmail' ? password.replace(/\s+/g, '') : password;
}

async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...(await store.read()) };
}

/** Effective SMTP server, resolving the Gmail preset. */
function getServer(settings) {
  return settings.provider === 'gmail' ? GMAIL_PRESET : settings;
}

function isConfigured(settings, hasPassword) {
  return Boolean(settings.fromEmail && hasPassword && getServer(settings).host);
}

/** What the renderer is allowed to see: never the password, only whether one exists. */
async function getPublicSettings() {
  const settings = await getSettings();
  const hasPassword = await credentialsService.hasPassword();
  return { ...settings, hasPassword, isConfigured: isConfigured(settings, hasPassword) };
}

async function saveSettings(input) {
  requireObject(input, 'La configuración');
  const provider = requireOneOf(input.provider, PROVIDERS, 'Proveedor');
  const current = await getSettings();
  const password = sanitizePassword(input.password, provider);

  const next = {
    ...current,
    provider,
    ...sanitizeServerFields({ ...input, provider }, current),
    fromName: requireText(input.fromName, 'El nombre visible', { maxLength: 100, required: false }),
    fromEmail: requireEmail(input.fromEmail, 'El mail remitente'),
    signature: requireText(input.signature, 'La firma', {
      maxLength: 2000,
      required: false,
      trim: false,
    }).trimEnd(),
  };

  if (password) await credentialsService.savePassword(password);
  await store.write(next);
  return getPublicSettings();
}

function applyTheme(theme) {
  nativeTheme.themeSource = theme;
}

async function setTheme(theme) {
  requireOneOf(theme, THEMES, 'Tema');
  await store.update((current) => ({ ...DEFAULT_SETTINGS, ...current, theme }));
  applyTheme(theme);
}

async function applySavedTheme() {
  applyTheme((await getSettings()).theme);
}

module.exports = {
  getSettings,
  getServer,
  isConfigured,
  getPublicSettings,
  saveSettings,
  setTheme,
  applySavedTheme,
};
