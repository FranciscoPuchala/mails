'use strict';

const { handle } = require('../utils/ipc-handler');
const settingsService = require('../services/settings-service');

function registerSettingsIpc() {
  handle('settings:get', () => settingsService.getPublicSettings());
  handle('settings:save', (input) => settingsService.saveSettings(input));
  handle('settings:set-theme', (theme) => settingsService.setTheme(theme));
}

module.exports = { registerSettingsIpc };
