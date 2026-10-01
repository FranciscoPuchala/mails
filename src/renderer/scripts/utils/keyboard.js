const isMac = window.api.platform === 'darwin';

export const MOD_KEY_LABEL = isMac ? '⌘' : 'Ctrl';

/** True when Ctrl (Windows/Linux) or Cmd (macOS) is held, without Alt. */
export function isModKey(event) {
  return (isMac ? event.metaKey : event.ctrlKey) && !event.altKey;
}

export function isShortcut(event, key) {
  return isModKey(event) && event.key.toLowerCase() === key.toLowerCase();
}
