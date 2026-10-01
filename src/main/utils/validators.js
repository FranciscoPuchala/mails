'use strict';

const { AppError } = require('./app-error');
const {
  isValidEmail,
  splitEmailList,
  findInvalidEmails,
} = require('../../shared/email-address.mjs');

const ID_PATTERN = /^[\w-]{1,64}$/;

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(`${label}: datos inválidos.`);
  }
  return value;
}

/** Validates a string field. Returns it trimmed unless `trim: false`. */
function requireText(value, label, { maxLength, required = true, trim = true }) {
  const text = value ?? '';
  if (typeof text !== 'string') throw new AppError(`${label}: valor inválido.`);
  if (required && !text.trim()) throw new AppError(`${label} es obligatorio.`);
  if (text.length > maxLength) throw new AppError(`${label} supera los ${maxLength} caracteres.`);
  return trim ? text.trim() : text;
}

function requireId(value) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new AppError('Identificador inválido.');
  }
  return value;
}

function requireOneOf(value, options, label) {
  if (!options.includes(value)) throw new AppError(`${label}: opción inválida.`);
  return value;
}

function requirePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError('El puerto debe ser un número entre 1 y 65535.');
  }
  return port;
}

function requireEmail(value, label) {
  const email = requireText(value, label, { maxLength: 254 });
  if (!isValidEmail(email)) throw new AppError(`${label} no tiene un formato válido.`);
  return email;
}

/** Accepts a comma/semicolon separated string and returns a validated array. */
function requireEmailList(value, label, { required = false, max = 50 } = {}) {
  const text = requireText(value, label, { maxLength: 5000, required });
  const emails = splitEmailList(text);
  if (required && emails.length === 0) throw new AppError(`${label} es obligatorio.`);
  if (emails.length > max) throw new AppError(`${label}: máximo ${max} direcciones.`);

  const invalid = findInvalidEmails(emails);
  if (invalid.length > 0) throw new AppError(`${label}: "${invalid[0]}" no es un mail válido.`);
  return emails;
}

/** Plain { [string]: string } map, used for template variable values. */
function requireStringMap(value, label, { maxKeys = 100, maxLength = 2000 } = {}) {
  const map = requireObject(value ?? {}, label);
  const entries = Object.entries(map);
  if (entries.length > maxKeys) throw new AppError(`${label}: demasiados valores.`);

  return Object.fromEntries(
    entries.map(([key, text]) => [key, requireText(text, label, { maxLength, required: false })]),
  );
}

module.exports = {
  requireObject,
  requireText,
  requireId,
  requireOneOf,
  requirePort,
  requireEmail,
  requireEmailList,
  requireStringMap,
};
