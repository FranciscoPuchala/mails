'use strict';

const { handle } = require('../utils/ipc-handler');
const historyService = require('../services/history-service');

function registerHistoryIpc() {
  handle('history:list', () => historyService.listHistory());
  handle('history:clear', () => historyService.clearHistory());
}

module.exports = { registerHistoryIpc };
