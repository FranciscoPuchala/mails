'use strict';

const { handle } = require('../utils/ipc-handler');
const mailService = require('../services/mail-service');

function registerMailIpc() {
  handle('mail:verify', () => mailService.verifyConnection());
  handle('mail:send-test', () => mailService.sendTestMail());
  handle('mail:send', (input) => mailService.sendTemplateMail(input));
}

module.exports = { registerMailIpc };
