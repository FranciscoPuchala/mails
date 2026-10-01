import { $, cloneTemplate, normalizeForSearch, formatDateTime } from '../utils/dom.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';

const STATUS = {
  sent: { label: 'Enviado', className: 'badge--success' },
  error: { label: 'Error', className: 'badge--error' },
};

export function createHistoryView(root, { navigate }) {
  const api = window.api.history;
  const rows = $('#history-rows', root);
  const table = $('#history-table', root);
  const emptyState = $('#history-empty', root);
  const noResults = $('#history-no-results', root);
  const toolbar = $('.history__toolbar', root);
  const search = $('#history-search', root);
  const filter = $('#history-filter', root);
  const clearButton = $('#history-clear', root);

  let entries = [];

  function matches(entry, query, status) {
    if (status !== 'all' && entry.status !== status) return false;
    const haystack = [
      ...entry.to,
      ...entry.cc,
      ...entry.bcc,
      entry.templateName,
      entry.subject,
    ].join(' ');
    return normalizeForSearch(haystack).includes(query);
  }

  function describeRecipients(entry) {
    return [
      `Para: ${entry.to.join(', ')}`,
      entry.cc.length > 0 ? `CC: ${entry.cc.join(', ')}` : '',
      entry.bcc.length > 0 ? `CCO: ${entry.bcc.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  function createRow(entry) {
    const row = cloneTemplate('tpl-history-row');
    const status = STATUS[entry.status] ?? STATUS.error;
    const recipients = $('.table__to', row);
    const template = $('.table__template', row);
    const subject = $('.table__subject', row);
    const badge = $('.badge', row);
    const error = $('.table__error', row);

    row.dataset.id = entry.id;
    $('.table__date', row).textContent = formatDateTime(entry.sentAt);
    recipients.textContent = entry.to.join(', ');
    recipients.title = describeRecipients(entry);
    template.textContent = entry.templateName;
    template.title = entry.templateName;
    subject.textContent = entry.subject;
    subject.title = entry.subject;
    badge.textContent = status.label;
    badge.classList.add(status.className);
    error.textContent = entry.error ?? '';
    error.title = entry.error ?? '';
    return row;
  }

  function render() {
    const query = normalizeForSearch(search.value.trim());
    const visible = entries.filter((entry) => matches(entry, query, filter.value));
    const isEmpty = entries.length === 0;

    rows.replaceChildren(...visible.map(createRow));
    table.hidden = visible.length === 0;
    toolbar.hidden = isEmpty;
    emptyState.hidden = !isEmpty;
    noResults.hidden = isEmpty || visible.length > 0;
    clearButton.disabled = isEmpty;
  }

  async function clearHistory() {
    const confirmed = await confirmDialog({
      title: 'Limpiar historial',
      message: `Se van a borrar ${entries.length} registros de envíos. Esta acción no se puede deshacer.`,
      confirmLabel: 'Limpiar',
    });
    if (!confirmed) return;

    await api.clear();
    entries = [];
    render();
    showToast('Historial borrado', 'success');
  }

  rows.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="resend"]');
    if (!button) return;
    const entry = entries.find((item) => item.id === button.closest('tr').dataset.id);
    if (entry) navigate('send', { resend: entry });
  });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);
  clearButton.addEventListener('click', clearHistory);

  return {
    async onShow() {
      entries = await api.list();
      render();
    },
  };
}
