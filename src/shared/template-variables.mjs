// Shared by the main process (require) and the renderer (import).
// Syntax: {{name}} — letters, digits and underscore; spaces inside the braces are tolerated.
const VARIABLE_PATTERN = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;

export const AUTOMATIC_VARIABLES = Object.freeze(['fecha']);

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Values the app fills in by itself, e.g. {{fecha}} → dd/mm/aaaa. */
export function getAutomaticValues(now = new Date()) {
  return { fecha: formatDate(now) };
}

/**
 * Splits a text into literal and variable segments:
 * [{ type: 'text', value }, { type: 'variable', name, raw }]
 */
export function tokenize(text) {
  const source = String(text ?? '');
  const segments = [];
  let lastIndex = 0;

  for (const match of source.matchAll(VARIABLE_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'variable', name: match[1], raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) segments.push({ type: 'text', value: source.slice(lastIndex) });

  return segments;
}

/** Unique variable names (in order of appearance) that the user must fill in. */
export function extractVariables(...texts) {
  const names = new Set();
  for (const text of texts) {
    for (const segment of tokenize(text)) {
      if (segment.type === 'variable') names.add(segment.name);
    }
  }
  return [...names].filter((name) => !AUTOMATIC_VARIABLES.includes(name));
}

/** Returns the value to insert for a variable, or null when it is missing. */
export function resolveVariable(name, values, now) {
  const automatic = getAutomaticValues(now);
  if (Object.hasOwn(automatic, name)) return automatic[name];
  const value = values && Object.hasOwn(values, name) ? values[name] : null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function findMissingVariables(names, values) {
  return names.filter((name) => resolveVariable(name, values) === null);
}

/** Replaces variables with their values; missing ones are left as {{name}}. */
export function renderTemplate(text, values, now = new Date()) {
  return tokenize(text)
    .map((segment) =>
      segment.type === 'text'
        ? segment.value
        : (resolveVariable(segment.name, values, now) ?? segment.raw),
    )
    .join('');
}
