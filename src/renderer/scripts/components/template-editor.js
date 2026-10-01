import { $, cloneTemplate, setFieldInvalid } from '../utils/dom.js';
import { extractVariables } from '../../../shared/template-variables.mjs';

const FIELD_NAMES = ['name', 'subject', 'body'];
const EMPTY_VALUES = { name: '', subject: '', body: '' };

/** Name/subject/body form with dirty tracking, validation and detected variables. */
export function createTemplateEditor(form) {
  const inputs = {
    name: $('#template-name', form),
    subject: $('#template-subject', form),
    body: $('#template-body', form),
  };
  const fieldOf = (name) => inputs[name].closest('.field');
  const chips = $('#template-variables', form);
  const variablesHint = $('#template-variables-hint', form);
  const unsavedBadge = $('#template-unsaved', form);

  let snapshot = { ...EMPTY_VALUES };

  function getValues() {
    return Object.fromEntries(FIELD_NAMES.map((name) => [name, inputs[name].value]));
  }

  function isDirty() {
    const values = getValues();
    return FIELD_NAMES.some((name) => values[name] !== snapshot[name]);
  }

  function renderVariables() {
    const names = extractVariables(inputs.subject.value, inputs.body.value);
    chips.replaceChildren(
      ...names.map((name) => {
        const chip = cloneTemplate('tpl-chip');
        chip.textContent = `{{${name}}}`;
        return chip;
      }),
    );
    chips.hidden = names.length === 0;
    variablesHint.hidden = names.length > 0;
  }

  function refresh() {
    renderVariables();
    unsavedBadge.hidden = !isDirty();
  }

  function setValues(values = EMPTY_VALUES) {
    for (const name of FIELD_NAMES) {
      inputs[name].value = values[name] ?? '';
      setFieldInvalid(fieldOf(name), false);
    }
    snapshot = getValues();
    refresh();
  }

  /** Marks empty required fields and focuses the first one. */
  function validate() {
    const invalid = FIELD_NAMES.filter((name) => !inputs[name].value.trim());
    for (const name of FIELD_NAMES) setFieldInvalid(fieldOf(name), invalid.includes(name));
    if (invalid.length > 0) inputs[invalid[0]].focus();
    return invalid.length === 0;
  }

  form.addEventListener('input', (event) => {
    const name = FIELD_NAMES.find((key) => inputs[key] === event.target);
    if (name && inputs[name].value.trim()) setFieldInvalid(fieldOf(name), false);
    refresh();
  });

  return {
    getValues,
    setValues,
    isDirty,
    validate,
    focus: () => inputs.name.focus(),
  };
}
