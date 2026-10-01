'use strict';

const { randomUUID } = require('node:crypto');
const { createJsonStore } = require('../utils/json-store');

const MAX_ENTRIES = 1000;

// Stored newest first.
const store = createJsonStore('history.json', []);

async function listHistory() {
  return store.read();
}

async function addEntry(entry) {
  const record = { id: randomUUID(), ...entry, sentAt: new Date().toISOString() };
  await store.update((entries) => [record, ...entries].slice(0, MAX_ENTRIES));
  return record;
}

async function clearHistory() {
  await store.write([]);
}

module.exports = { listHistory, addEntry, clearHistory };
