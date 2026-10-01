import { $, $$, cloneTemplate, normalizeForSearch } from '../utils/dom.js';

/**
 * Searchable, keyboard-navigable list of templates (used by Send and Templates).
 * Enter in the search box picks the first match; arrow keys move through items.
 */
export function createTemplateList({ listEl, searchInput, emptyEl, onSelect }) {
  let templates = [];
  let selectedId = null;

  const visibleButtons = () => $$('.template-item', listEl);

  function matches(template, query) {
    return normalizeForSearch(`${template.name} ${template.subject}`).includes(query);
  }

  function createItem(template) {
    const item = cloneTemplate('tpl-template-item');
    const button = $('.template-item', item);
    button.dataset.id = template.id;
    button.title = template.name;
    $('.template-item__name', item).textContent = template.name;
    $('.template-item__subject', item).textContent = template.subject;
    return item;
  }

  function syncSelection() {
    for (const button of visibleButtons()) {
      const isSelected = button.dataset.id === selectedId;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    }
  }

  function render() {
    const query = normalizeForSearch(searchInput.value.trim());
    const visible = templates.filter((template) => matches(template, query));
    listEl.replaceChildren(...visible.map(createItem));
    emptyEl.hidden = visible.length > 0 || templates.length === 0;
    syncSelection();
  }

  function selectById(id) {
    const template = templates.find((item) => item.id === id);
    if (template) onSelect(template);
  }

  function moveFocus(step) {
    const buttons = visibleButtons();
    const current = buttons.indexOf(document.activeElement);
    const next = buttons[current + step];
    if (next) next.focus();
    else if (step < 0) searchInput.focus();
  }

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('.template-item');
    if (button) selectById(button.dataset.id);
  });

  listEl.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(event.key === 'ArrowDown' ? 1 : -1);
    }
  });

  searchInput.addEventListener('input', render);
  searchInput.addEventListener('keydown', (event) => {
    const [first] = visibleButtons();
    if (!first) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      first.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectById(first.dataset.id);
    }
  });

  return {
    setTemplates(list) {
      templates = list;
      render();
    },
    setSelected(id) {
      selectedId = id;
      syncSelection();
    },
    focusSearch() {
      searchInput.focus();
    },
  };
}
