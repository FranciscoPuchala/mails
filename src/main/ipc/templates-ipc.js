'use strict';

const { handle } = require('../utils/ipc-handler');
const templateService = require('../services/template-service');

function registerTemplatesIpc() {
  handle('templates:list', () => templateService.listTemplates());
  handle('templates:create', (input) => templateService.createTemplate(input));
  handle('templates:update', (id, input) => templateService.updateTemplate(id, input));
  handle('templates:duplicate', (id) => templateService.duplicateTemplate(id));
  handle('templates:remove', (id) => templateService.deleteTemplate(id));
}

module.exports = { registerTemplatesIpc };
