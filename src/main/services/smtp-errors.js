'use strict';

const { AppError } = require('../utils/app-error');

const CONNECTION_CODES = new Set([
  'ECONNECTION',
  'ESOCKET',
  'EDNS',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
]);
const AUTH_CODES = new Set(['EAUTH', 'ENOAUTH']);
const AUTH_RESPONSE_CODES = new Set([534, 535]);
const RECIPIENT_REJECTED_CODES = new Set([501, 550, 551, 553]);
const LIMIT_PATTERN = /limit|quota|5\.4\.5|too many|\brate\b/i;
const TLS_PATTERN = /ssl|tls|wrong version number|certificate/i;

const MESSAGES = {
  auth: 'Usuario o contraseña incorrectos. Si usás Gmail, necesitás una contraseña de aplicación (no tu contraseña normal).',
  limit: 'Alcanzaste el límite de envío de tu proveedor. Probá de nuevo más tarde.',
  recipient: 'El servidor rechazó el destinatario. Revisá que la dirección sea correcta.',
  timeout: 'El servidor tardó demasiado en responder. Revisá tu conexión e intentá de nuevo.',
  connection:
    'No se pudo conectar con el servidor de correo. Revisá tu conexión a internet y los datos del servidor.',
  tls: 'Falló la conexión segura. Revisá el puerto y el tipo de seguridad.',
};

function classify(error) {
  const code = error?.code;
  const responseCode = error?.responseCode;
  const text = `${error?.response ?? ''} ${error?.message ?? ''}`;

  if (AUTH_CODES.has(code) || AUTH_RESPONSE_CODES.has(responseCode)) return 'auth';
  // Checked before recipient errors: Gmail reports its daily limit as "550 5.4.5".
  if (code === 'EMAXLIMIT' || (responseCode >= 400 && LIMIT_PATTERN.test(text))) return 'limit';
  if (code === 'EENVELOPE' || RECIPIENT_REJECTED_CODES.has(responseCode)) return 'recipient';
  if (code === 'ETIMEDOUT' || /timed? ?out/i.test(text)) return 'timeout';
  if (code === 'ETLS' || code === 'EREQUIRETLS' || TLS_PATTERN.test(text)) return 'tls';
  if (CONNECTION_CODES.has(code)) return 'connection';
  return null;
}

/** Converts a Nodemailer/network error into a clear, user-facing AppError in Spanish. */
function translateSmtpError(error) {
  if (error instanceof AppError) return error;
  const kind = classify(error);
  const message = kind
    ? MESSAGES[kind]
    : `No se pudo enviar el mail${error?.message ? `: ${error.message}` : '.'}`;
  return new AppError(message, { cause: error });
}

module.exports = { translateSmtpError };
