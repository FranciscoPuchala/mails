import { $ } from '../utils/dom.js';
import { isShortcut } from '../utils/keyboard.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { createTemplateList } from '../components/template-list.js';
import { createTemplateEditor } from '../components/template-editor.js';

export function createTemplatesView(root) {
  const api = window.api.templates;
  const form = $('#template-form', root);
  const emptyState = $('#templates-empty', root);
  const title = $('#template-form-title', root);
  const duplicateButton = $('#template-duplicate', root);
  const deleteButton = $('#template-delete', root);
  const saveButton = $('#template-save', root);

  const editor = createTemplateEditor(form);
  const list = createTemplateList({
    listEl: $('#templates-list', root),
    searchInput: $('#templates-search', root),
    emptyEl: $('#templates-list-empty', root),
    onSelect: openTemplate,
  });

  let templates = [];
  let currentId = null;

  const isEditorOpen = () => !form.hidden;
  const currentTemplate = () => templates.find((template) => template.id === currentId);

  function showEditor(template) {
    currentId = template?.id ?? null;
    editor.setValues(template ?? undefined);
    title.textContent = template ? template.name : 'Nueva plantilla';
    duplicateButton.hidden = !template;
    deleteButton.hidden = !template;
    form.hidden = false;
    emptyState.hidden = true;
    list.setSelected(currentId);
  }

  function showEmptyState() {
    currentId = null;
    form.hidden = true;
    emptyState.hidden = false;
    list.setSelected(null);
  }

  /** Reloads the list and opens `selectId`, falling back to the first template. */
  async function reload(selectId) {
    templates = await api.list();
    list.setTemplates(templates);
    const target = templates.find((template) => template.id === selectId) ?? templates[0];
    if (target) showEditor(target);
    else showEmptyState();
  }

  async function confirmDiscard() {
    if (!isEditorOpen() || !editor.isDirty()) return true;
    return confirmDialog({
      title: 'Descartar cambios',
      message: 'Tenés cambios sin guardar en esta plantilla. ¿Querés descartarlos?',
      confirmLabel: 'Descartar',
    });
  }

  async function openTemplate(template) {
    if (template.id === currentId || !(await confirmDiscard())) return;
    showEditor(template);
  }

  async function startNew() {
    if (!(await confirmDiscard())) return;
    showEditor(null);
    editor.focus();
  }

  async function save() {
    if (!isEditorOpen() || !editor.validate()) return;
    saveButton.disabled = true;
    try {
      const values = editor.getValues();
      const saved = currentId ? await api.update(currentId, values) : await api.create(values);
      await reload(saved.id);
      showToast('Plantilla guardada', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      saveButton.disabled = false;
    }
  }

  async function duplicate() {
    if (editor.isDirty()) {
      showToast('Guardá los cambios antes de duplicar la plantilla.', 'info');
      return;
    }
    const copy = await api.duplicate(currentId);
    await reload(copy.id);
    editor.focus();
    showToast('Plantilla duplicada', 'success');
  }

  async function remove() {
    const template = currentTemplate();
    const confirmed = await confirmDialog({
      title: 'Eliminar plantilla',
      message: `Se va a eliminar "${template.name}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;

    await api.remove(template.id);
    form.hidden = true; // skip the unsaved-changes prompt for a deleted template
    await reload(null);
    showToast('Plantilla eliminada', 'success');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save();
  });
  $('#templates-new', root).addEventListener('click', startNew);
  $('#templates-create-first', root).addEventListener('click', startNew);
  duplicateButton.addEventListener('click', duplicate);
  deleteButton.addEventListener('click', remove);

  return {
    async onShow() {
      // Keep unsaved work untouched when coming back to this view.
      if (isEditorOpen() && editor.isDirty()) return;
      await reload(currentId);
    },
    async canLeave() {
      const canLeave = await confirmDiscard();
      // Discarded edits must not reappear when coming back: close the editor so onShow reloads.
      if (canLeave && editor.isDirty()) form.hidden = true;
      return canLeave;
    },
    onKeydown(event) {
      if (isShortcut(event, 's')) {
        event.preventDefault();
        save();
      }
    },
  };
}
