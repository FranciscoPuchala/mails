import { tokenize, resolveVariable } from '../../../shared/template-variables.mjs';

/** Renders text with variables replaced; missing ones are highlighted as {{name}}. */
function renderInto(target, text, values) {
  const nodes = tokenize(text).map((segment) => {
    if (segment.type === 'text') return document.createTextNode(segment.value);

    const value = resolveVariable(segment.name, values);
    if (value !== null) return document.createTextNode(value);

    const mark = document.createElement('mark');
    mark.classList.add('preview__missing');
    mark.textContent = segment.raw;
    return mark;
  });
  target.replaceChildren(...nodes);
}

export function createMailPreview({ subjectEl, bodyEl, signatureEl }) {
  return {
    render(template, values, signature) {
      renderInto(subjectEl, template.subject, values);
      renderInto(bodyEl, template.body, values);
      signatureEl.textContent = signature;
      signatureEl.hidden = !signature;
    },
  };
}
