"use strict";
// Generated browser output: edit src/sessions.ts, then run `just build`.
const session_limits = { json_bytes: 262144, source_bytes: 32768, url_chars: 16000 };
const session_encoder = new TextEncoder();
function session_record(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Expected a session object');
    const record = value;
    if (Object.keys(record).length !== keys.length || Object.keys(record).some(key => !keys.includes(key)) || keys.some(key => !Object.prototype.hasOwnProperty.call(record, key)))
        throw new Error('Missing or unknown session fields');
    return record;
}
function session_pose(value) {
    const object = session_record(value, ['position', 'target', 'up']);
    function vector(value) {
        const values = session_numbers(value, 3);
        values.forEach(item => session_number(item, 'camera coordinate', -1000000, 1000000));
        return [values[0], values[1], values[2]];
    }
    const position = vector(object.position), target = vector(object.target), up = vector(object.up);
    const direction = position.map((item, i) => item - target[i]);
    const distance = Math.hypot(...direction), up_length = Math.hypot(...up);
    if (distance < 1e-8 || up_length < 1e-8)
        throw new Error('Invalid camera pose');
    const cross = Math.hypot(direction[1] * up[2] - direction[2] * up[1], direction[2] * up[0] - direction[0] * up[2], direction[0] * up[1] - direction[1] * up[0]);
    if (cross / distance / up_length < 1e-12)
        throw new Error('Camera up is parallel to its view');
    return { position, target, up };
}
// Unknown input is checked before touching live settings or starting workers.
function prepare_session_v2(value) {
    const document = session_record(value, ['version', 'shape', 'camera', 'material', 'transform', 'field_source', 'camera_pose']);
    if (document.version !== 2)
        throw new Error('Unsupported session version');
    const shape = session_record(document.shape, ['dimensions', 'resolution', 'iso', 'coeff', 'interpolate']);
    const dimensions = require_dimensions(shape.dimensions), resolution = require_resolution(shape.resolution);
    if (!Array.isArray(shape.coeff) || shape.coeff.length > 32)
        throw new Error('Invalid coefficients');
    const coeff = session_numbers(shape.coeff, shape.coeff.length);
    const next_shape = { ...shape_params, dimensions, resolution, iso: session_number(shape.iso, 'isovalue'), coeff,
        coeff_count: coeff.length, max_coeff_count: 32, interpolate: session_boolean(shape.interpolate), reset: false };
    const view = session_record(document.camera, ['perspective', 'fov', 'scale', 'wobble', 'radius', 'speed', 'axes', 'background']);
    if (typeof view.background !== 'string' || !/^#[0-9a-f]{6}$/i.test(view.background))
        throw new Error('Invalid background color');
    const next_camera = { ...camera_params, perspective: session_boolean(view.perspective),
        fov: session_number(view.fov, 'field of view', 0.05, 179.95), scale: require_zoom(view.scale),
        wobble: session_boolean(view.wobble), radius: session_number(view.radius, 'camera radius', 0, 10),
        speed: session_number(view.speed, 'camera speed', 0, 10), axes: session_boolean(view.axes), background: view.background };
    const surface = session_record(document.material, ['calc_normals', 'material', 'opacity', 'side', 'blending', 'equation', 'depth_test', 'depth_write', 'wireframe']);
    const equation = session_enum(surface.equation, [0, 100, 101, 102, 103, 104]);
    const next_material = { ...material_params, calc_normals: session_boolean(surface.calc_normals),
        material: session_enum(surface.material, [0, 1, 3, 4, 5]), opacity: session_number(surface.opacity, 'opacity', 0, 1),
        side: session_enum(surface.side, [0, 1, 2]), blending: session_enum(surface.blending, [0, 1, 2, 3, 4, 5]),
        equation: equation === 0 ? 100 : equation, depth_test: session_boolean(surface.depth_test),
        depth_write: session_boolean(surface.depth_write), wireframe: session_boolean(surface.wireframe) };
    const transform = session_record(document.transform, ['zoom', 'stack', 'base_orientation']);
    if (!Array.isArray(transform.stack))
        throw new Error('Invalid transform stack');
    transform.stack.forEach(item => session_record(item, ['type', 'axis1', 'axis2', 'degrees', 's', 'd', 'row', 'col', 'shear']));
    const stack = normalized_transform_stack(transform.stack, dimensions, true);
    const next_transform = { zoom: require_zoom(transform.zoom), invert_order: false, push_transform: false,
        pop_transform: false, apply_transforms: false, pop_all_on_apply: true, reset_orientation: false, pop_all_transforms: false };
    validate_numeric_settings(next_shape, next_transform, stack);
    if (!Array.isArray(transform.base_orientation) || transform.base_orientation.length !== dimensions + 1)
        throw new Error('Invalid base orientation');
    const matrix = Array.from(transform.base_orientation, row => session_numbers(row, dimensions + 1));
    if (matrix[dimensions].some((entry, i) => entry !== (i === dimensions ? 1 : 0)))
        throw new Error('Base orientation must be affine');
    const full = numeric.mul(1 / next_transform.zoom, numeric.dot(matrix, compute_transform_stack(stack, dimensions)));
    if (full.some(row => row.some(entry => !Number.isFinite(entry)) || !Number.isFinite(Math.fround(Math.abs(row[0]) * 10 + Math.abs(row[1]) * 10 + Math.abs(row[2]) * 10 + Math.abs(row[dimensions])))))
        throw new Error('Transform exceeds the finite sampling range');
    const source = document.field_source;
    if (typeof source !== 'string' || session_encoder.encode(source).length > session_limits.source_bytes)
        throw new Error('Expected function source (maximum 32 KiB)');
    new Function('x', 'c', source); // Parse only. Never call untrusted code here.
    return { shape_params: next_shape, camera_params: next_camera, material_params: next_material, transform_params: next_transform,
        transforms: stack, base_orientation: matrix, active_field_source: source, camera_pose: session_pose(document.camera_pose) };
}
function scene_from_prepared(state) {
    const s = state.shape_params, c = state.camera_params, m = state.material_params;
    if (!state.camera_pose)
        throw new Error('Missing camera pose');
    return { version: 2,
        shape: { dimensions: s.dimensions, resolution: s.resolution, iso: s.iso, coeff: s.coeff.slice(), interpolate: s.interpolate },
        camera: { perspective: c.perspective, fov: c.fov, scale: c.scale, wobble: c.wobble, radius: c.radius, speed: c.speed, axes: c.axes, background: c.background },
        material: { calc_normals: m.calc_normals, material: m.material, opacity: m.opacity, side: m.side, blending: m.blending,
            equation: m.equation, depth_test: m.depth_test, depth_write: m.depth_write, wireframe: m.wireframe },
        transform: { zoom: state.transform_params.zoom, stack: state.transforms, base_orientation: state.base_orientation },
        field_source: state.active_field_source ?? default_field_body(), camera_pose: state.camera_pose };
}
function assert_session_ready() {
    if (making_gif || waiting_for_any_web_worker() || pending_worker_stage !== null || size_dirty || coords_dirty || scalar_field_dirty || mesh_dirty ||
        calculation_failed || successful_calculation_signature === null || successful_calculation_signature !== calculation_signature()) {
        throw new Error('Wait for a successful calculation before exporting or sharing. Fix errors and click Update if needed.');
    }
}
function capture_session() {
    assert_session_ready();
    const pose = session_pose({ position: camera.position.toArray(), target: controls.target.toArray(), up: camera.up.toArray() });
    const candidate = scene_from_prepared({ shape_params, camera_params, material_params, transform_params,
        transforms, base_orientation, active_field_source, camera_pose: pose });
    // Round-trip through validation to clone data, normalize enums, and remove aliases.
    return scene_from_prepared(prepare_session_v2(candidate));
}
function session_json(session) {
    const text = JSON.stringify(session);
    if (session_encoder.encode(text).length > session_limits.json_bytes)
        throw new Error('Session is too large (maximum 256 KiB)');
    return text;
}
function export_session() {
    try {
        window.prompt('Copy session JSON. Unsubmitted editor drafts are not included.', session_json(capture_session()));
    }
    catch (error) {
        window.alert(error instanceof Error ? error.message : String(error));
    }
}
function session_base64(bytes) {
    let binary = '';
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function session_unbase64(text) {
    if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1)
        throw new Error('Invalid share-link encoding');
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (session_base64(bytes) !== text)
        throw new Error('Invalid share-link encoding');
    return bytes;
}
async function make_session_link(session, address) {
    let bytes = session_encoder.encode(session_json(session));
    let codec = 'j';
    if (typeof CompressionStream !== 'undefined') {
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
        codec = 'z';
    }
    const url = new URL(address);
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
        throw new Error('Serve IsoVis over HTTP before sharing');
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = 'session=2' + codec + '.' + session_base64(bytes);
    if (url.href.length > session_limits.url_chars)
        throw new Error('Link is too long (maximum 16,000 characters). Use JSON Export instead.');
    return url.href;
}
async function read_session_link(hash) {
    if (hash.length > session_limits.url_chars)
        throw new Error('Share link is too long');
    const match = /^#session=2([jz])\.([A-Za-z0-9_-]+)$/.exec(hash);
    if (!match)
        throw new Error('Invalid or unsupported share link');
    let bytes = session_unbase64(match[2]);
    if (match[1] === 'z') {
        if (typeof DecompressionStream === 'undefined')
            throw new Error('This browser cannot decode compressed links; use JSON Import or a newer browser');
        const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
        const chunks = [];
        let length = 0;
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                length += value.length;
                if (length > session_limits.json_bytes)
                    throw new Error('Expanded session exceeds 256 KiB');
                chunks.push(value);
            }
        }
        finally {
            await reader.cancel().catch(() => { });
        }
        bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
    }
    if (bytes.length > session_limits.json_bytes)
        throw new Error('Session exceeds 256 KiB');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return scene_from_prepared(prepare_session_v2(JSON.parse(text)));
}
