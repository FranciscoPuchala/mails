'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { protocol, net } = require('electron');

// Serving the UI from a custom privileged scheme (instead of file://) gives the
// renderer a real origin, so ES modules and a strict CSP work as expected.
const SCHEME = 'app';
const HOST = 'mailrapido';
const APP_ROOT = path.join(__dirname, '..', '..', '..');
const ALLOWED_DIRS = [
  path.join(APP_ROOT, 'src', 'renderer'),
  path.join(APP_ROOT, 'src', 'shared'),
  path.join(APP_ROOT, 'assets'),
];

const APP_ORIGIN = `${SCHEME}://${HOST}`;
const APP_ENTRY_URL = `${APP_ORIGIN}/src/renderer/index.html`;

function registerAppScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  ]);
}

function isInsideAllowedDir(filePath) {
  return ALLOWED_DIRS.some((dir) => filePath.startsWith(dir + path.sep));
}

function handleAppProtocol() {
  protocol.handle(SCHEME, (request) => {
    const { host, pathname } = new URL(request.url);
    const filePath = path.normalize(path.join(APP_ROOT, decodeURIComponent(pathname)));

    if (host !== HOST || !isInsideAllowedDir(filePath)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

module.exports = { APP_ORIGIN, APP_ENTRY_URL, registerAppScheme, handleAppProtocol };
