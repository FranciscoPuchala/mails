'use strict';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Plain text → minimal HTML: escaped, with line breaks preserved as <br>. */
function textToHtml(text) {
  const escaped = text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  return `<div>${escaped.replace(/\r?\n/g, '<br>\n')}</div>`;
}

module.exports = { textToHtml };
