"use strict";
// Generated browser output: edit src/recovery.ts, then run `just build`.
const recovery_limits = { record_bytes: 512 * 1024, draft_bytes: 128 * 1024, delay_ms: 1000, max_wait_ms: 5000 };
let autosave_started = false;
let autosave_active = false;
let autosave_paused = false;
let autosave_restoring = false;
let autosave_timer = null;
let autosave_first_change = null;
let autosave_key = '';
let autosave_scene = null;
let autosave_payload = null;
let autosave_raw = null;
let autosave_consumed = null;
let autosave_controls = null;
let autosave_storage_failed = false;
function recovery_prefix() {
    return 'isovis.recovery.v1:' + encodeURIComponent(location.pathname) + ':';
}
function autosave_status(message, error = false) {
    if (!autosave_started)
        return;
    const status = document.getElementById('autosave_status');
    if (status) {
        if (status.textContent !== message)
            status.textContent = message;
        status.title = message;
        status.style.color = error ? '#ffb3b3' : '#ccc';
    }
}
function autosave_storage_error() {
    autosave_storage_failed = true;
    autosave_status('Autosave unavailable: storage blocked or full. Use Export.', true);
}
function has_local_recovery() {
    try {
        for (let i = 0; i < localStorage.length; i++)
            if (localStorage.key(i)?.startsWith(recovery_prefix()))
                return true;
    }
    catch {
        autosave_storage_error();
    }
    return false;
}
function parse_recovery(raw) {
    if (raw.length > recovery_limits.record_bytes || session_encoder.encode(raw).length > recovery_limits.record_bytes)
        throw new Error('Saved copy exceeds 512 KiB');
    const object = session_record(JSON.parse(raw), ['version', 'saved_at', 'scene', 'editor_text']);
    if (object.version !== 1)
        throw new Error('Unsupported recovery version');
    const saved_at = session_number(object.saved_at, 'recovery timestamp', 0, 8640000000000000);
    if (!Number.isInteger(saved_at))
        throw new Error('Invalid recovery timestamp');
    if (typeof object.editor_text !== 'string' || session_encoder.encode(object.editor_text).length > recovery_limits.draft_bytes)
        throw new Error('Editor draft exceeds 128 KiB');
    return { version: 1, saved_at, scene: object.scene, editor_text: object.editor_text };
}
function recovery_scene(saved) {
    if (saved.scene === null)
        return null;
    const scene = scene_from_prepared(prepare_session_v2(saved.scene));
    session_json(scene);
    return scene;
}
function list_recovery_copies() {
    const copies = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(recovery_prefix()))
                continue;
            const raw = localStorage.getItem(key);
            if (raw === null)
                continue;
            try {
                copies.push({ key, raw, saved: parse_recovery(raw), error: '' });
            }
            catch (error) {
                copies.push({ key, raw, saved: null, error: error instanceof Error ? error.message : String(error) });
            }
        }
        autosave_storage_failed = false;
    }
    catch {
        autosave_storage_error();
    }
    return copies.sort((a, b) => (b.saved?.saved_at ?? 0) - (a.saved?.saved_at ?? 0));
}
function discard_recovery(copy) {
    if (!copy.key.startsWith(recovery_prefix()))
        throw new Error('Recovery belongs to a different page');
    // Do not delete a newer write from another live tab after previewing an old one.
    if (localStorage.getItem(copy.key) !== copy.raw)
        return false;
    localStorage.removeItem(copy.key);
    if (copy.key === autosave_key) {
        autosave_active = false;
        autosave_payload = autosave_raw = null;
    }
    return true;
}
function remember_autosave_scene() {
    try {
        autosave_scene = capture_session();
    }
    catch { /* Keep the last settled scene while work is pending/failed. */ }
}
function flush_autosave() {
    if (autosave_timer !== null)
        clearTimeout(autosave_timer);
    autosave_timer = null;
    autosave_first_change = null;
    if (!autosave_started || !autosave_active || autosave_paused || autosave_restoring)
        return;
    remember_autosave_scene();
    const editor_text = my_code_mirror.getValue();
    if (session_encoder.encode(editor_text).length > recovery_limits.draft_bytes) {
        autosave_status('Draft exceeds 128 KiB; previous recovery kept. Copy your code manually.', true);
        return;
    }
    const payload = JSON.stringify({ scene: autosave_scene, editor_text });
    const raw = JSON.stringify({ version: 1, saved_at: Date.now(), scene: autosave_scene, editor_text });
    if (session_encoder.encode(raw).length > recovery_limits.record_bytes) {
        autosave_status('Recovery exceeds 512 KiB; previous copy kept. Use Export.', true);
        return;
    }
    try {
        if (payload !== autosave_payload || localStorage.getItem(autosave_key) !== autosave_raw) {
            localStorage.setItem(autosave_key, raw); // Atomic replacement; never delete first.
            autosave_payload = payload;
            autosave_raw = raw;
        }
        autosave_storage_failed = false;
        // A restored copy is consumed only once a replacement has been saved.
        if (autosave_consumed && autosave_consumed.key !== autosave_key) {
            discard_recovery(autosave_consumed);
            autosave_consumed = null;
        }
        autosave_status('Saved locally · Recovery');
    }
    catch {
        autosave_storage_error();
    }
}
function schedule_autosave() {
    if (!autosave_started || !autosave_active || autosave_paused || autosave_restoring)
        return;
    if (autosave_timer !== null)
        clearTimeout(autosave_timer);
    const now = Date.now();
    if (autosave_first_change === null)
        autosave_first_change = now;
    const delay = Math.min(recovery_limits.delay_ms, Math.max(0, recovery_limits.max_wait_ms - (now - autosave_first_change)));
    autosave_timer = setTimeout(flush_autosave, delay);
}
function note_autosave_activity() {
    if (!autosave_started || autosave_restoring)
        return;
    autosave_active = true;
    if (!autosave_storage_failed)
        autosave_status('Autosave pending · local only');
    schedule_autosave();
}
function autosave_worker_completed() {
    if (!autosave_started)
        return;
    remember_autosave_scene();
    schedule_autosave();
}
function bind_autosave_controls() {
    if (!autosave_started)
        return;
    autosave_controls?.removeEventListener('end', note_autosave_activity);
    autosave_controls = controls;
    autosave_controls.addEventListener('end', note_autosave_activity);
}
function apply_recovery(copy, run_scene) {
    const saved = parse_recovery(copy.raw);
    const scene = run_scene ? recovery_scene(saved) : null;
    const previous_scene = autosave_scene;
    autosave_restoring = true;
    try {
        if (scene) {
            import_settings(session_json(scene)); // Explicit consent precedes this call.
            autosave_scene = scene;
        }
        my_code_mirror.off('beforeChange', before_change_callback);
        try {
            my_code_mirror.setValue(saved.editor_text);
        }
        finally {
            my_code_mirror.on('beforeChange', before_change_callback);
        }
        my_code_mirror.refresh();
        // Draft-only recovery keeps the old scene copy, rather than silently losing it.
        if (run_scene || saved.scene === null)
            autosave_consumed = copy;
    }
    catch (error) {
        autosave_scene = previous_scene;
        throw error;
    }
    finally {
        autosave_restoring = false;
    }
    autosave_active = true;
}
function start_autosave() {
    if (autosave_started)
        return;
    autosave_started = true;
    const random = crypto.getRandomValues(new Uint32Array(4));
    autosave_key = recovery_prefix() + Array.from(random, n => n.toString(16).padStart(8, '0')).join('');
    my_code_mirror.on('change', note_autosave_activity);
    bind_autosave_controls();
    const gui_change = (event) => {
        if (event.target instanceof Element && event.target.closest('.dg'))
            note_autosave_activity();
    };
    document.addEventListener('input', gui_change, true);
    document.addEventListener('change', gui_change, true);
    // Vendor sliders/color pickers change values directly, without native input
    // events. Track their gestures through release, even outside the GUI.
    const gui_pointers = new Set();
    document.addEventListener('pointerdown', event => {
        if (event.target instanceof Element && event.target.closest('.dg .cr')) {
            gui_pointers.add(event.pointerId);
            note_autosave_activity();
        }
    }, true);
    document.addEventListener('pointermove', event => {
        if (!gui_pointers.has(event.pointerId))
            return;
        if (!event.buttons)
            gui_pointers.delete(event.pointerId);
        note_autosave_activity();
    }, true);
    const gui_release = (event) => {
        if (gui_pointers.delete(event.pointerId))
            note_autosave_activity();
    };
    document.addEventListener('pointerup', gui_release, true);
    document.addEventListener('pointercancel', gui_release, true);
    window.addEventListener('keydown', event => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && !(event.target instanceof Element && event.target.closest('dialog')))
            note_autosave_activity();
    });
    window.addEventListener('pagehide', flush_autosave);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            gui_pointers.clear();
            flush_autosave();
        }
    });
    remember_autosave_scene();
    const copies = list_recovery_copies();
    autosave_status(autosave_storage_failed ? 'Autosave unavailable: storage blocked or full. Use Export.' : copies.length ? 'Local recovery available' : 'Autosave ready · local only', autosave_storage_failed);
    // Explicit shared links take priority. Opening/canceling a link never consumes recovery.
    if (copies.length && !location.hash.startsWith('#session='))
        open_recovery();
}
