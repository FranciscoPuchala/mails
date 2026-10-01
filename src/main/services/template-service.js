'use strict';

const { randomUUID } = require('node:crypto');
const { createJsonStore } = require('../utils/json-store');
const { AppError } = require('../utils/app-error');
const { requireObject, requireText, requireId } = require('../utils/validators');

const store = createJsonStore('templates.json', []);

const LIMITS = { name: 120, subject: 300, body: 50000 };
const COPY_SUFFIX = ' (copia)';

function sanitizeTemplateInput(input) {
  requireObject(input, 'La plantilla');
  return {
    name: requireText(input.name, 'El nombre', { maxLength: LIMITS.name }),
    subject: requireText(input.subject, 'El asunto', { maxLength: LIMITS.subject }),
    // The body keeps its leading/trailing whitespace: it is part of the mail layout.
    body: requireText(input.body, 'El cuerpo', { maxLength: LIMITS.body, trim: false }),
  };
}

const byName = (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });

function findIndexOrThrow(templates, id) {
  const index = templates.findIndex((template) => template.id === id);
  if (index === -1) throw new AppError('La plantilla ya no existe.');
  return index;
}

async function listTemplates() {
  return (await store.read()).sort(byName);
}

async function getTemplate(id) {
  requireId(id);
  const templates = await store.read();
  return templates[findIndexOrThrow(templates, id)];
}

async function createTemplate(input) {
  const now = new Date().toISOString();
  const template = {
    id: randomUUID(),
    ...sanitizeTemplateInput(input),
    createdAt: now,
    updatedAt: now,
  };
  await store.update((templates) => [...templates, template]);
  return template;
}

async function updateTemplate(id, input) {
  requireId(id);
  const changes = sanitizeTemplateInput(input);
  let updated;

  await store.update((templates) => {
    const index = findIndexOrThrow(templates, id);
    updated = { ...templates[index], ...changes, updatedAt: new Date().toISOString() };
    return templates.with(index, updated);
  });
  return updated;
}

async function duplicateTemplate(id) {
  requireId(id);
  let copy;

  await store.update((templates) => {
    const original = templates[findIndexOrThrow(templates, id)];
    const now = new Date().toISOString();
    const name = original.name.slice(0, LIMITS.name - COPY_SUFFIX.length) + COPY_SUFFIX;
    copy = { ...original, id: randomUUID(), name, createdAt: now, updatedAt: now };
    return [...templates, copy];
  });
  return copy;
}

async function deleteTemplate(id) {
  requireId(id);
  await store.update((templates) => {
    findIndexOrThrow(templates, id);
    return templates.filter((template) => template.id !== id);
  });
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
};
