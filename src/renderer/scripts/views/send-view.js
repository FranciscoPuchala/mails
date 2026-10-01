import { $, setFieldInvalid, setButtonLoading } from '../utils/dom.js';
import { isShortcut } from '../utils/keyboard.js';
import { showToast } from '../components/toast.js';
import { createTemplateList } from '../components/template-list.js';
import { createVariableFields } from '../components/variable-fields.js';
import { createMailPreview } from '../components/mail-preview.js';
import { extractVariables } from '../../../shared/template-variables.mjs';
import { splitEmailList, findInvalidEmails } from '../../../shared/email-address.mjs';

const MAX_RECENT_RECIPIENTS = 50;

export function createSendView(root) {
  const api = window.api;
  const form = $('#send-form', root);
  const recipients = {
    to: $('#send-to', root),
    cc: $('#send-cc', root),
    bcc: $('#send-bcc', root),
  };
  const ccFields = $('#send-cc-fields', root);
  const ccToggle = $('#send-toggle-cc', root);
  const submitButton = $('#send-submit', root);
  const templateName = $('#send-template-name', root);
  const recentList = $('#recent-recipients', root);
  const states = {
    configBanner: $('#send-config-banner', root),
    noTemplates: $('#send-no-templates', root),
    pickTemplate: $('#send-pick-template', root),
  };

  const list = createTemplateList({
    listEl: $('#send-template-list', root),
    searchInput: $('#send-search', root),
    emptyEl: $('#send-list-empty', root),
    onSelect: (template) => selectTemplate(template),
  });
  const variables = createVariableFields(
    $('#send-variables', root),
    $('#send-variables-section', root),
    {
      onInput: update,
    },
  );
  const preview = createMailPreview({
    subjectEl: $('#send-preview-subject', root),
    bodyEl: $('#send-preview-body', root),
    signatureEl: $('#send-preview-signature', root),
  });

  let templates = [];
  let settings = { isConfigured: false, signature: '' };
  let selected = null;
  let isSending = false;

  const fieldOf = (name) => recipients[name].closest('.field');

  /** to: at least one valid address; cc/bcc: optional but valid. */
  function isRecipientValid(name) {
    const emails = splitEmailList(recipients[name].value);
    if (name === 'to' && emails.length === 0) return false;
    return findInvalidEmails(emails).length === 0;
  }

  const recipientsAreValid = () => Object.keys(recipients).every(isRecipientValid);

  function renderState() {
    states.configBanner.hidden = settings.isConfigured;
    states.noTemplates.hidden = templates.length > 0;
    states.pickTemplate.hidden = templates.length === 0 || selected !== null;
    form.hidden = selected === null;
  }

  function update() {
    if (!selected) return;
    preview.render(selected, variables.getValues(), settings.signature);
    submitButton.disabled = isSending || !recipientsAreValid() || variables.hasMissing();
  }

  /** Keeps already-typed values for variables with the same name. */
  function selectTemplate(template, values = variables.getValues()) {
    selected = template;
    list.setSelected(template.id);
    templateName.textContent = template.name;
    variables.render(extractVariables(template.subject, template.body), values);
    renderState();
    update();
    recipients.to.focus();
  }

  function setCcVisible(visible) {
    ccFields.hidden = !visible;
    ccToggle.hidden = visible;
  }

  function resetForm() {
    for (const input of Object.values(recipients)) input.value = '';
    for (const name of Object.keys(recipients)) setFieldInvalid(fieldOf(name), false);
    setCcVisible(false);
    variables.clear();
    update();
    recipients.to.focus();
  }

  /** Shows every problem at once; returns true when the form can be sent. */
  function revealErrors() {
    for (const name of Object.keys(recipients))
      setFieldInvalid(fieldOf(name), !isRecipientValid(name));
    const firstInvalid = Object.keys(recipients).find((name) => !isRecipientValid(name));
    if (firstInvalid) recipients[firstInvalid].focus();
    const hasMissingVariables = variables.revealMissing();
    return !firstInvalid && !hasMissingVariables;
  }

  async function loadRecentRecipients() {
    const history = await api.history.list();
    const delivered = history.filter((entry) => entry.status === 'sent');
    const unique = [...new Set(delivered.flatMap((entry) => entry.to))].slice(
      0,
      MAX_RECENT_RECIPIENTS,
    );
    recentList.replaceChildren(
      ...unique.map((email) => {
        const option = document.createElement('option');
        option.value = email;
        return option;
      }),
    );
  }

  async function send() {
    if (!selected || isSending || !revealErrors()) return;

    isSending = true;
    setButtonLoading(submitButton, true);
    try {
      const result = await api.mail.send({
        templateId: selected.id,
        to: recipients.to.value,
        cc: recipients.cc.value,
        bcc: recipients.bcc.value,
        variables: variables.getValues(),
      });
      showToast(`Mail enviado a ${result.to.join(', ')}`, 'success');
      resetForm();
      loadRecentRecipients();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      isSending = false;
      setButtonLoading(submitButton, false);
      update();
    }
  }

  /** Loads a history entry back into the form ("Reenviar"). */
  function applyResend(entry) {
    const template = templates.find((item) => item.id === entry.templateId);
    if (!template) {
      showToast('La plantilla de ese envío ya no existe.', 'error');
      return;
    }
    recipients.to.value = entry.to.join(', ');
    recipients.cc.value = entry.cc.join(', ');
    recipients.bcc.value = entry.bcc.join(', ');
    setCcVisible(entry.cc.length > 0 || entry.bcc.length > 0);
    selectTemplate(template, entry.variables ?? {});
  }

  for (const [name, input] of Object.entries(recipients)) {
    input.addEventListener('input', () => {
      setFieldInvalid(fieldOf(name), false);
      update();
    });
    input.addEventListener('blur', () => {
      if (input.value.trim()) setFieldInvalid(fieldOf(name), !isRecipientValid(name));
    });
  }

  ccToggle.addEventListener('click', () => {
    setCcVisible(true);
    recipients.cc.focus();
  });
  submitButton.addEventListener('click', send);
  form.addEventListener('submit', (event) => event.preventDefault());

  return {
    async onShow(payload) {
      [templates, settings] = await Promise.all([api.templates.list(), api.settings.get()]);
      list.setTemplates(templates);
      loadRecentRecipients();

      // The selected template may have been edited or deleted meanwhile.
      const fresh = selected && templates.find((template) => template.id === selected.id);
      selected = null;
      if (payload?.resend) applyResend(payload.resend);
      else if (fresh) selectTemplate(fresh);

      renderState();
      if (!selected) list.focusSearch();
    },
    onKeydown(event) {
      if (isShortcut(event, 'Enter') && selected) {
        event.preventDefault();
        send();
      }
    },
  };
}
