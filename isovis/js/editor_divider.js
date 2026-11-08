"use strict";
// Generated browser output: edit src/editor_divider.ts, then run `just build`.
var editor_divider = null;
var dispose_editor_divider = null;
function editor_width_limit() { return Math.floor(Math.max(0, window.innerWidth - 200)); }
function update_editor_divider() {
    if (!editor_divider)
        return;
    editor_divider.style.left = Math.max(0, shape_params.editor_width - 4) + 'px';
    editor_divider.setAttribute('aria-valuenow', String(shape_params.editor_width));
    editor_divider.setAttribute('aria-valuemin', '0');
    editor_divider.setAttribute('aria-valuemax', String(editor_width_limit()));
}
function init_editor_divider() {
    dispose_editor_divider?.();
    const handle = document.createElement('div');
    editor_divider = handle;
    handle.id = 'editor_divider';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', 'Resize code editor');
    handle.setAttribute('aria-controls', 'codemirror three_js');
    document.body.appendChild(handle);
    update_editor_divider();
    let drag = null;
    let frame = null, pending = null;
    function apply() {
        frame = null;
        if (pending === null)
            return;
        const width = pending;
        pending = null;
        shape_params.editor_width = Math.max(0, Math.min(editor_width_limit(), Math.round(width)));
        update_editor();
    }
    function queue(width) {
        pending = width;
        if (frame === null)
            frame = requestAnimationFrame(apply);
    }
    function flush() { if (frame !== null)
        cancelAnimationFrame(frame); frame = null; apply(); }
    function finish() {
        if (!drag)
            return;
        const pointer = drag.pointer;
        drag = null;
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', cancel);
        window.removeEventListener('blur', finish);
        document.body.classList.remove('editor_resize_active');
        if (handle.hasPointerCapture(pointer))
            handle.releasePointerCapture(pointer);
        flush();
        if (typeof note_autosave_activity === 'function')
            note_autosave_activity();
    }
    function down(event) {
        if (event.button !== 0 || drag)
            return;
        event.preventDefault();
        event.stopPropagation();
        drag = { pointer: event.pointerId, x: event.clientX, width: shape_params.editor_width };
        document.body.classList.add('editor_resize_active');
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', finish);
        handle.setPointerCapture(event.pointerId);
    }
    function move(event) {
        if (drag && event.pointerId === drag.pointer)
            queue(drag.width + event.clientX - drag.x);
    }
    function up(event) { if (drag && event.pointerId === drag.pointer) {
        move(event);
        finish();
    } }
    function cancel(event) { if (drag && event.pointerId === drag.pointer)
        finish(); }
    function key(event) {
        let width = shape_params.editor_width;
        if (event.key === 'ArrowLeft')
            width -= event.shiftKey ? 50 : 10;
        else if (event.key === 'ArrowRight')
            width += event.shiftKey ? 50 : 10;
        else if (event.key === 'Home')
            width = 0;
        else if (event.key === 'End')
            width = editor_width_limit();
        else
            return;
        event.preventDefault();
        event.stopPropagation();
        pending = width;
        flush();
        if (typeof note_autosave_activity === 'function')
            note_autosave_activity();
    }
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('keydown', key);
    handle.addEventListener('lostpointercapture', finish);
    dispose_editor_divider = () => {
        // Teardown drops pending work instead of resizing an already disposed view.
        if (frame !== null)
            cancelAnimationFrame(frame);
        frame = null;
        pending = null;
        finish();
        handle.removeEventListener('pointerdown', down);
        handle.removeEventListener('keydown', key);
        handle.removeEventListener('lostpointercapture', finish);
        handle.remove();
        editor_divider = null;
        dispose_editor_divider = null;
    };
}
