import { $, $$, cloneTemplate, setFieldInvalid } from '../utils/dom.js';

/** "fecha_entrega" → "Fecha entrega" */
function toLabel(name) {
  const text = name.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One input per template variable, generated on the fly. */
export function createVariableFields(container, section, { onInput }) {
  let names = [];

  const inputs = () => $$('input', container);
  const fieldOf = (input) => input.closest('.field');

  function render(nextNames, values = {}) {
    names = nextNames;
    container.replaceChildren(
      ...names.map((name, index) => {
        const field = cloneTemplate('tpl-variable-field');
        const input = $('input', field);
        const label = $('label', field);
        input.id = `send-variable-${index}`;
        input.dataset.variable = name;
        input.value = values[name] ?? '';
        label.htmlFor = input.id;
        label.textContent = toLabel(name);
        return field;
      }),
    );
    section.hidden = names.length === 0;
  }

  function getValues() {
    return Object.fromEntries(inputs().map((input) => [input.dataset.variable, input.value]));
  }

  function getMissing() {
    return inputs().filter((input) => !input.value.trim());
  }

  /** Marks every empty variable and focuses the first one. Returns true if any was missing. */
  function revealMissing() {
    const missing = getMissing();
    for (const input of missing) setFieldInvalid(fieldOf(input), true);
    missing[0]?.focus();
    return missing.length > 0;
  }

  function clear() {
    for (const input of inputs()) {
      input.value = '';
      setFieldInvalid(fieldOf(input), false);
    }
  }

  container.addEventListener('input', (event) => {
    setFieldInvalid(fieldOf(event.target), false);
    onInput();
  });

  container.addEventListener('focusout', (event) => {
    if (!event.target.value.trim()) setFieldInvalid(fieldOf(event.target), true);
  });

  return {
    render,
    getValues,
    clear,
    revealMissing,
    hasMissing: () => getMissing().length > 0,
    getNames: () => names,
  };
}
