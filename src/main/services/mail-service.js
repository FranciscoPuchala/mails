'use strict';

const nodemailer = require('nodemailer');
const settingsService = require('./settings-service');
const credentialsService = require('./credentials-service');
const templateService = require('./template-service');
const historyService = require('./history-service');
const { translateSmtpError } = require('./smtp-errors');
const { textToHtml } = require('../utils/text-to-html');
const { AppError } = require('../utils/app-error');
const {
  requireObject,
  requireId,
  requireEmailList,
  requireStringMap,
} = require('../utils/validators');
const {
  extractVariables,
  findMissingVariables,
  renderTemplate,
} = require('../../shared/template-variables.mjs');

const SMTP_TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000 };
// Hard ceiling so the UI never hangs, whatever the server does.
const OPERATION_TIMEOUT_MS = 45_000;

const TEST_MAIL = {
  subject: 'Mail de prueba de MailRápido',
  body: 'Si estás leyendo esto, tu cuenta quedó bien configurada. ¡Ya podés enviar mails!',
};

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error('Operation timed out'), { code: 'ETIMEDOUT' })),
      OPERATION_TIMEOUT_MS,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildTransportOptions(settings, password) {
  const server = settingsService.getServer(settings);
  return {
    host: server.host,
    port: server.port,
    secure: server.security === 'ssl',
    requireTLS: server.security === 'starttls',
    ignoreTLS: server.security === 'none',
    auth: { user: settings.username || settings.fromEmail, pass: password },
    ...SMTP_TIMEOUTS,
  };
}

/** Loads the saved account, failing early (and clearly) when it is incomplete. */
async function loadAccount() {
  const settings = await settingsService.getSettings();
  const password = await credentialsService.readPassword();
  if (!settingsService.isConfigured(settings, Boolean(password))) {
    throw new AppError('Primero configurá tu cuenta de correo en Configuración.');
  }
  return { settings, password };
}

/** Runs `task(transporter, settings)` and translates any SMTP failure. */
async function withTransport({ settings, password }, task) {
  const transporter = nodemailer.createTransport(buildTransportOptions(settings, password));
  try {
    return await withTimeout(task(transporter, settings));
  } catch (error) {
    throw translateSmtpError(error);
  } finally {
    transporter.close();
  }
}

function composeMessage(settings, { to, cc, bcc, subject, body }) {
  const text = settings.signature ? `${body}\n\n${settings.signature}` : body;
  return {
    from: { name: settings.fromName || settings.fromEmail, address: settings.fromEmail },
    to,
    cc,
    bcc,
    subject,
    text,
    html: textToHtml(text),
  };
}

async function verifyConnection() {
  await withTransport(await loadAccount(), (transporter) => transporter.verify());
}

async function sendTestMail() {
  return withTransport(await loadAccount(), async (transporter, settings) => {
    await transporter.sendMail(
      composeMessage(settings, { to: [settings.fromEmail], ...TEST_MAIL }),
    );
    return { to: settings.fromEmail };
  });
}

function sanitizeSendInput(input) {
  requireObject(input, 'El envío');
  return {
    templateId: requireId(input.templateId),
    to: requireEmailList(input.to, 'El destinatario', { required: true }),
    cc: requireEmailList(input.cc, 'CC'),
    bcc: requireEmailList(input.bcc, 'CCO'),
    variables: requireStringMap(input.variables, 'Las variables'),
  };
}

/** Renders the template with the given variables, sends it and records the result. */
async function sendTemplateMail(input) {
  const { templateId, to, cc, bcc, variables } = sanitizeSendInput(input);
  const template = await templateService.getTemplate(templateId);

  const names = extractVariables(template.subject, template.body);
  const missing = findMissingVariables(names, variables);
  if (missing.length > 0) throw new AppError(`Falta completar: ${missing.join(', ')}.`);

  const now = new Date();
  const subject = renderTemplate(template.subject, variables, now).replace(/[\r\n]+/g, ' ');
  const body = renderTemplate(template.body, variables, now);
  const usedVariables = Object.fromEntries(names.map((name) => [name, variables[name].trim()]));

  // Loaded before the attempt: an incomplete account is not a send, so it is not recorded.
  const account = await loadAccount();
  let sendError = null;
  try {
    await withTransport(account, (transporter, settings) =>
      transporter.sendMail(composeMessage(settings, { to, cc, bcc, subject, body })),
    );
  } catch (error) {
    sendError = error;
  }

  await historyService.addEntry({
    to,
    cc,
    bcc,
    templateId,
    templateName: template.name,
    subject,
    variables: usedVariables,
    status: sendError ? 'error' : 'sent',
    error: sendError ? sendError.message : null,
  });

  if (sendError) throw sendError;
  return { to, subject };
}

module.exports = { verifyConnection, sendTestMail, sendTemplateMail };
