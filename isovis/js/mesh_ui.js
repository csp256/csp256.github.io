"use strict";
// Generated browser output: edit src/mesh_ui.ts, then run `just build`.
function open_mesh_export() {
    close_session_preview?.();
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Download mesh');
    dialog.style.cssText = 'max-width:600px;width:calc(100vw - 48px);box-sizing:border-box;background:#18212b;color:white;padding:20px;border:1px solid #aaa';
    const heading = document.createElement('h2');
    heading.textContent = 'Download mesh';
    const label = document.createElement('label');
    label.textContent = 'File format: ';
    const select = document.createElement('select');
    select.id = 'mesh_export_format';
    for (const [value, text] of [['glb', 'GLB (binary glTF)'], ['obj', 'OBJ'], ['stl', 'STL (binary)']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    label.appendChild(select);
    const details = document.createElement('p');
    const metadata_label = document.createElement('label');
    const metadata = document.createElement('input');
    metadata.type = 'checkbox';
    metadata.checked = true;
    metadata.id = 'mesh_export_session';
    metadata_label.append(metadata, document.createTextNode(' Include editable IsoVis session (OBJ/GLB)'));
    const privacy = document.createElement('p');
    privacy.textContent = 'Session metadata contains readable submitted JavaScript and coefficients. Other tools may discard it when re-saving. Uncheck for mesh-only compatibility.';
    const error = document.createElement('p');
    error.setAttribute('role', 'alert');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const download = document.createElement('button');
    download.type = 'button';
    download.textContent = 'Download';
    function close() {
        if (close_session_preview === close)
            close_session_preview = null;
        dialog.close();
        dialog.remove();
    }
    function changed() {
        metadata.disabled = select.value === 'stl';
        metadata_label.hidden = metadata.disabled;
        privacy.hidden = metadata.disabled;
        details.textContent = select.value === 'stl' ? 'Triangles only; STL has no portable full-session metadata.' : select.value === 'obj' ?
            'Indexed geometry and normals in one OBJ (no MTL). Session data uses standard # comments.' :
            'Indexed geometry and approximate materials. Normal colors are baked; depth, wireframe, lighting and blending do not transfer exactly. Session data uses standard extras metadata.';
        error.textContent = '';
    }
    select.addEventListener('change', changed);
    changed();
    cancel.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    download.addEventListener('click', () => {
        try {
            const format = select.value;
            if (format !== 'stl' && format !== 'obj' && format !== 'glb')
                throw new Error('Choose a supported mesh format');
            const blob = make_mesh_download(format, metadata.checked && !metadata.disabled);
            saveAs(blob, 'isovis.' + format);
            close();
        }
        catch (failure) {
            error.textContent = failure instanceof Error ? failure.message : String(failure);
        }
    });
    dialog.append(heading, label, details, metadata_label, privacy, error, cancel, download);
    document.body.appendChild(dialog);
    close_session_preview = close;
    dialog.showModal();
    cancel.focus();
}
let mesh_file_generation = 0;
async function import_mesh_session_file(file) {
    const generation = ++mesh_file_generation;
    close_session_preview?.();
    try {
        const session = await read_mesh_session_file(file);
        if (generation !== mesh_file_generation)
            return;
        const accepted = await session_dialog('Restore scene from file?', 'This regenerates the scene from its saved session, not from the mesh. It replaces the current scene and runs JavaScript in workers. Only load code you trust: it can use the network and consume CPU/memory.', `File: ${file.name}\n${session.shape.dimensions} dimensions, resolution ${session.shape.resolution}.\n\n` + session.field_source, 'Load and run');
        if (accepted && generation === mesh_file_generation)
            import_settings(session_json(session));
    }
    catch (error) {
        if (generation === mesh_file_generation)
            window.alert('Could not restore session: ' + (error instanceof Error ? error.message : String(error)));
    }
}
function choose_mesh_session_file() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.obj,.json';
    input.hidden = true;
    input.addEventListener('change', () => { const file = input.files?.[0]; input.remove(); if (file)
        void import_mesh_session_file(file); }, { once: true });
    input.addEventListener('cancel', () => input.remove(), { once: true });
    document.body.appendChild(input);
    input.click();
}
