// Shared by the main process (require) and the renderer (import).
const FORBIDDEN = '\\s@<>()\\[\\]\\\\,;:"';
const EMAIL_PATTERN = new RegExp(`^[^${FORBIDDEN}]+@[^${FORBIDDEN}]+\\.[^${FORBIDDEN}]{2,}$`);
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(value) {
  return typeof value === 'string' && value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

/** "a@x.com, b@y.com; c@z.com" → ['a@x.com', 'b@y.com', 'c@z.com'] */
export function splitEmailList(value) {
  return String(value ?? '')
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function findInvalidEmails(emails) {
  return emails.filter((email) => !isValidEmail(email));
}
