import { $, setFieldInvalid, setButtonLoading } from '../utils/dom.js';
import { isShortcut } from '../utils/keyboard.js';
import { showToast } from '../components/toast.js';
import { isValidEmail } from '../../../shared/email-address.mjs';

const PASSWORD_STATUS = {
  saved: 'Hay una contraseña guardada y cifrada. Dejá el campo vacío para conservarla.',
  missing: 'Todavía no guardaste ninguna contraseña.',
};

export function createSettingsView(root) {
  const api = window.api;
  const form = $('#settings-form', root);
  const inputs = {
    host: $('#settings-host', root),
    port: $('#settings-port', root),
    security: $('#settings-security', root),
    username: $('#settings-username', root),
    fromName: $('#settings-from-name', root),
    fromEmail: $('#settings-from-email', root),
    password: $('#settings-password', root),
    signature: $('#settings-signature', root),
  };
  const smtpFields = $('#settings-smtp-fields', root);
  const usernameField = $('#settings-username-field', root);
  const gmailHelp = $('#settings-gmail-help', root);
  const passwordLabel = $('#settings-password-label', root);
  const passwordStatus = $('#settings-password-status', root);
  const saveButton = $('#settings-save', root);
  const verifyButton = $('#settings-verify', root);
  const testButton = $('#settings-send-test', root);

  let hasPassword = false;

  const radioValue = (name) => $(`input[name="${name}"]:checked`, form).value;
  const setRadio = (name, value) => {
    const radio = $(`input[name="${name}"][value="${value}"]`, form);
    if (radio) radio.checked = true;
  };
  const fieldOf = (name) => $(`[data-field="${name}"]`, form);
  const isCustomSmtp = () => radioValue('provider') === 'smtp';

  function syncProvider() {
    const isCustom = isCustomSmtp();
    smtpFields.hidden = !isCustom;
    usernameField.hidden = !isCustom;
    gmailHelp.hidden = isCustom;
    inputs.fromEmail.placeholder = isCustom ? 'vos@tudominio.com' : 'vos@gmail.com';
    passwordLabel.textContent = isCustom ? 'Contraseña' : 'Contraseña de aplicación';
  }

  function fill(settings) {
    setRadio('provider', settings.provider);
    setRadio('theme', settings.theme);
    inputs.host.value = settings.host;
    inputs.port.value = String(settings.port);
    inputs.security.value = settings.security;
    inputs.username.value = settings.username;
    inputs.fromName.value = settings.fromName;
    inputs.fromEmail.value = settings.fromEmail;
    inputs.signature.value = settings.signature;
    inputs.password.value = '';

    hasPassword = settings.hasPassword;
    passwordStatus.textContent = hasPassword ? PASSWORD_STATUS.saved : PASSWORD_STATUS.missing;
    for (const name of Object.keys(inputs)) fieldOf(name)?.classList.remove('is-invalid');
    syncProvider();
  }

  function readForm() {
    return {
      provider: radioValue('provider'),
      host: inputs.host.value.trim(),
      port: Number(inputs.port.value),
      security: inputs.security.value,
      username: inputs.username.value.trim(),
      fromName: inputs.fromName.value.trim(),
      fromEmail: inputs.fromEmail.value.trim(),
      signature: inputs.signature.value,
      password: inputs.password.value,
    };
  }

  /** Marks invalid fields and focuses the first one. */
  function validate(values) {
    const checks = [
      ['host', !isCustomSmtp() || values.host.length > 0],
      [
        'port',
        !isCustomSmtp() ||
          (Number.isInteger(values.port) && values.port > 0 && values.port < 65536),
      ],
      ['fromEmail', isValidEmail(values.fromEmail)],
      ['password', hasPassword || values.password.length > 0],
    ];
    for (const [name, isValid] of checks) setFieldInvalid(fieldOf(name), !isValid);

    const firstInvalid = checks.find(([, isValid]) => !isValid);
    if (firstInvalid) inputs[firstInvalid[0]].focus();
    return !firstInvalid;
  }

  async function save({ silent = false } = {}) {
    const values = readForm();
    if (!validate(values)) return false;
    try {
      fill(await api.settings.save(values));
      if (!silent) showToast('Configuración guardada', 'success');
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  }

  /** Saves the form first, so tests always run against what the user is seeing. */
  async function runAccountAction(button, action, describeSuccess) {
    setButtonLoading(button, true);
    try {
      if (!(await save({ silent: true }))) return;
      showToast(describeSuccess(await action()), 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setButtonLoading(button, false);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    await save();
    saveButton.disabled = false;
  });

  form.addEventListener('change', (event) => {
    if (event.target.name === 'provider') syncProvider();
    if (event.target.name === 'theme') {
      api.settings.setTheme(event.target.value).catch((error) => showToast(error.message, 'error'));
    }
  });

  form.addEventListener('input', (event) => {
    const field = event.target.closest('.field');
    if (field) setFieldInvalid(field, false);
  });

  verifyButton.addEventListener('click', () =>
    runAccountAction(
      verifyButton,
      api.mail.verify,
      () => 'Conexión exitosa: tu cuenta está lista para enviar.',
    ),
  );
  testButton.addEventListener('click', () =>
    runAccountAction(
      testButton,
      api.mail.sendTest,
      ({ to }) => `Te enviamos un mail de prueba a ${to}.`,
    ),
  );

  return {
    async onShow() {
      fill(await api.settings.get());
    },
    onKeydown(event) {
      if (isShortcut(event, 's')) {
        event.preventDefault();
        form.requestSubmit();
      }
    },
  };
}
