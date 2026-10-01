'use strict';

// Sandboxed preload: only `electron` can be required here, so this file stays
// self-contained. It exposes a narrow, explicit API — never ipcRenderer itself.
const { contextBridge, ipcRenderer } = require('electron');

async function invoke(channel, ...args) {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response.ok) throw new Error(response.error);
  return response.data;
}

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,

  templates: {
    list: () => invoke('templates:list'),
    create: (input) => invoke('templates:create', input),
    update: (id, input) => invoke('templates:update', id, input),
    duplicate: (id) => invoke('templates:duplicate', id),
    remove: (id) => invoke('templates:remove', id),
  },

  settings: {
    get: () => invoke('settings:get'),
    save: (input) => invoke('settings:save', input),
    setTheme: (theme) => invoke('settings:set-theme', theme),
  },

  mail: {
    verify: () => invoke('mail:verify'),
    sendTest: () => invoke('mail:send-test'),
    send: (input) => invoke('mail:send', input),
  },

  history: {
    list: () => invoke('history:list'),
    clear: () => invoke('history:clear'),
  },
});
