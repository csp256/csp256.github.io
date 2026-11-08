"use strict";
// Generated browser output: edit src/mesh_session.ts, then run `just build`.
function mesh_metadata_object(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Missing IsoVis session metadata');
    return value;
}
function validated_mesh_session(value) {
    const session = scene_from_prepared(prepare_session_v2(value));
    session_json(session); // Same decoded size bound as ordinary sessions.
    return session;
}
async function read_glb_session(file) {
    if (file.size < 20 || file.size > mesh_export_limits.file_bytes)
        throw new Error('GLB must be between 20 bytes and 128 MiB');
    const header = new DataView(await file.slice(0, 20).arrayBuffer());
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== file.size || file.size % 4 !== 0 || header.getUint32(16, true) !== 0x4e4f534a)
        throw new Error('Invalid GLB 2.0 header');
    const length = header.getUint32(12, true), end = 20 + length;
    if (length === 0 || length % 4 !== 0 || length > mesh_export_limits.json_bytes || end > file.size)
        throw new Error('Invalid or oversized GLB JSON chunk');
    if (end < file.size) {
        if (end + 8 > file.size)
            throw new Error('Truncated GLB binary header');
        const binary = new DataView(await file.slice(end, end + 8).arrayBuffer());
        const bytes = binary.getUint32(0, true);
        if (binary.getUint32(4, true) !== 0x004e4942 || bytes % 4 !== 0 || end + 8 + bytes !== file.size)
            throw new Error('Invalid GLB binary chunk');
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.slice(20, end).arrayBuffer());
    const document = mesh_metadata_object(JSON.parse(text));
    if (mesh_metadata_object(document.asset).version !== '2.0')
        throw new Error('Unsupported glTF version');
    return validated_mesh_session(mesh_metadata_object(document.extras).isovis_session);
}
async function read_obj_session(file) {
    if (file.size > mesh_export_limits.file_bytes)
        throw new Error('OBJ exceeds 128 MiB');
    // Our comments always precede the mesh. Never load a huge OBJ just for metadata.
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.slice(0, mesh_export_limits.json_bytes).arrayBuffer());
    const lines = text.split(/\r?\n/), start = lines.indexOf('# isovis_session_v2_begin');
    const end = lines.indexOf('# isovis_session_v2_end', start + 1);
    if (start < 0 || end < 0)
        throw new Error('No complete IsoVis session in the first 1 MiB of this OBJ');
    const encoded = lines.slice(start + 1, end).map(line => {
        const match = /^# isovis_session_v2 ([A-Za-z0-9_-]{1,76})$/.exec(line);
        if (!match)
            throw new Error('Invalid OBJ session comment');
        return match[1];
    }).join('');
    const bytes = session_unbase64(encoded);
    if (bytes.length > session_limits.json_bytes)
        throw new Error('OBJ session exceeds 256 KiB');
    return validated_mesh_session(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}
async function read_mesh_session_file(file) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'glb')
        return read_glb_session(file);
    if (extension === 'obj')
        return read_obj_session(file);
    if (extension === 'json') {
        if (file.size > session_limits.json_bytes)
            throw new Error('Session exceeds 256 KiB');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
        return validated_mesh_session(JSON.parse(text));
    }
    throw new Error('Choose a GLB/OBJ with IsoVis metadata, or a v2 session JSON file. STL has no embedded session.');
}
