"use strict";
// Generated browser output: edit src/recovery_ui.ts, then run `just build`.
function open_recovery() {
    close_session_preview?.();
    flush_autosave();
    autosave_paused = true;
    if (autosave_timer !== null)
        clearTimeout(autosave_timer);
    autosave_timer = null;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Local recovery');
    dialog.style.cssText = 'max-width:760px;width:calc(100vw - 48px);max-height:85vh;box-sizing:border-box;background:#18212b;color:white;padding:20px;border:1px solid #aaa';
    const heading = document.createElement('h2');
    heading.textContent = 'Local recovery';
    const message = document.createElement('p');
    message.textContent = 'Saved on this browser for this address. Restoring replaces the current editor. The scene runs saved JavaScript: only restore code you trust. Draft text is restored without submitting it.';
    const label = document.createElement('label');
    label.textContent = 'Saved copy: ';
    const select = document.createElement('select');
    select.id = 'recovery_copy';
    label.appendChild(select);
    const preview = document.createElement('textarea');
    preview.readOnly = true;
    preview.setAttribute('aria-label', 'Recovery source preview');
    preview.style.cssText = 'display:block;box-sizing:border-box;width:100%;height:260px;margin:16px 0';
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    const close_button = document.createElement('button');
    close_button.type = 'button';
    close_button.textContent = 'Close';
    const draft = document.createElement('button');
    draft.type = 'button';
    draft.textContent = 'Restore draft only';
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.textContent = 'Restore scene and draft';
    const discard = document.createElement('button');
    discard.type = 'button';
    discard.textContent = 'Discard saved copy';
    let copies = [];
    function selected() { return copies.find(copy => copy.key === select.value); }
    function changed() {
        const copy = selected();
        draft.disabled = !copy?.saved;
        restore.disabled = true;
        discard.disabled = !copy;
        error.textContent = copy?.error ?? (autosave_storage_failed ? 'Browser storage is unavailable. Export still works.' : '');
        if (!copy?.saved) {
            preview.value = copy ? 'This saved copy is unreadable. It is kept until you explicitly discard it.' : 'No saved copies. Autosave starts after editing, changing settings or moving the view.';
            return;
        }
        let source = '(No settled scene was saved.)';
        try {
            const scene = recovery_scene(copy.saved);
            if (scene) {
                source = scene.field_source;
                restore.disabled = false;
            }
        }
        catch (failure) {
            error.textContent = 'The scene cannot be validated; its editor draft can still be restored. ' + (failure instanceof Error ? failure.message : String(failure));
            source = '(Invalid scene; it will not be run.)';
        }
        preview.value = 'LAST SETTLED SCENE — runs only with “Restore scene and draft”\n\n' + source + '\n\nEDITOR CONTENTS — restored as text, not submitted\n\n' + copy.saved.editor_text;
    }
    function refresh() {
        copies = list_recovery_copies();
        select.replaceChildren();
        for (const copy of copies) {
            const option = document.createElement('option');
            option.value = copy.key;
            option.textContent = copy.saved ? new Date(copy.saved.saved_at).toLocaleString() + (copy.key === autosave_key ? ' (this tab)' : '') : 'Unreadable saved copy';
            select.appendChild(option);
        }
        select.disabled = !copies.length;
        changed();
    }
    function close() {
        if (close_session_preview === close)
            close_session_preview = null;
        dialog.close();
        dialog.remove();
        autosave_paused = false;
        schedule_autosave();
    }
    function recover(run_scene) {
        const copy = selected();
        if (!copy)
            return;
        try {
            apply_recovery(copy, run_scene);
            close();
            flush_autosave();
        }
        catch (failure) {
            error.textContent = failure instanceof Error ? failure.message : String(failure);
        }
    }
    select.addEventListener('change', changed);
    close_button.addEventListener('click', close);
    draft.addEventListener('click', () => recover(false));
    restore.addEventListener('click', () => recover(true));
    discard.addEventListener('click', () => {
        const copy = selected();
        if (!copy)
            return;
        try {
            if (!discard_recovery(copy)) {
                error.textContent = 'This copy changed in another tab. Close and reopen Recovery to refresh it.';
                return;
            }
            autosave_status('Recovery discarded · autosave resumes on your next edit');
            refresh();
        }
        catch {
            autosave_storage_error();
            error.textContent = 'Could not discard this copy: browser storage is unavailable.';
        }
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.append(heading, message, label, preview, error, close_button, draft, restore, discard);
    document.body.appendChild(dialog);
    close_session_preview = close;
    refresh();
    dialog.showModal();
    close_button.focus();
}
