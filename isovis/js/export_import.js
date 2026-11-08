"use strict";
// Generated browser output: edit src/export_import.ts, then run `just build`.
// Keep historical wire names and user source text intact.
function session_number(value, name, min = -Number.MAX_VALUE, max = Number.MAX_VALUE) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
        throw new Error('Invalid ' + name);
    return value;
}
function session_boolean(value) {
    if (typeof value !== 'boolean')
        throw new Error('Expected a boolean setting');
    return value;
}
function session_enum(value, values) {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (typeof number !== 'number' || !values.includes(number))
        throw new Error('Invalid material setting');
    return number;
}
function session_numbers(value, length) {
    if (!Array.isArray(value) || value.length !== length)
        throw new Error('Invalid vector or matrix size');
    return Array.from(value, item => session_number(item, 'vector/matrix entry'));
}
var session_wire_names = { shape_params: 'shapeParams', camera_params: 'cameraParams', material_params: 'materialParams', transform_params: 'transformParams' };
var session_wire_fields = {
    shape_params: { edit_code: 'editCode', editor_width: 'editorWidth', memory_overuse: 'memoryOveruse', max_coeff_count: 'maxCoeffCount', coeff_count: 'coeffCount' },
    material_params: { calc_normals: 'calcNormals', depth_test: 'depthTest', depth_write: 'depthWrite' },
    transform_params: { invert_order: 'invertOrder', push_transform: 'pushTransform', pop_transform: 'popTransform', apply_transforms: 'applyTransforms', pop_all_on_apply: 'popAllOnApply', reset_orientation: 'resetOrientation', pop_all_transforms: 'popAllTransforms' }
};
function is_settings_record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function translate_record_keys(record, canonical_to_wire, to_wire) {
    if (!is_settings_record(record))
        return record;
    const names = Object.create(null), result = Object.create(null);
    for (const [key, wire] of Object.entries(canonical_to_wire))
        names[to_wire ? key : wire] = to_wire ? wire : key;
    for (const [key, value] of Object.entries(record)) {
        const name = Object.prototype.hasOwnProperty.call(names, key) ? names[key] : key;
        if (Object.prototype.hasOwnProperty.call(result, name))
            throw new Error('Duplicate settings alias: ' + name);
        result[name] = value;
    }
    return result;
}
function translate_session(saved, to_wire) {
    const legacy = Array.isArray(saved);
    const result = legacy ? saved : translate_record_keys(saved, { base_orientation: 'baseOrientation', active_field_source: 'activeFieldSource' }, to_wire);
    const groups = legacy ? saved : is_settings_record(result) ? result.groups : undefined;
    if (!Array.isArray(groups))
        return result;
    const translated = groups.map((group) => {
        if (!is_settings_record(group))
            return group;
        const copy = translate_record_keys(group, {}, to_wire);
        let canonical = group.name;
        if (!to_wire)
            for (const [name, wire] of Object.entries(session_wire_names))
                if (wire === group.name)
                    canonical = name;
        copy.name = to_wire && typeof canonical === 'string' && Object.prototype.hasOwnProperty.call(session_wire_names, canonical) ? session_wire_names[canonical] : canonical;
        const fields = typeof canonical === 'string' && Object.prototype.hasOwnProperty.call(session_wire_fields, canonical) ? session_wire_fields[canonical] : {};
        copy.data = translate_record_keys(group.data, fields, to_wire);
        return copy;
    });
    if (legacy)
        return translated;
    if (is_settings_record(result))
        result.groups = translated;
    return result;
}
function session_from_wire(saved) { return translate_session(saved, false); }
function session_to_wire(saved) { return translate_session(saved, true); }
function check_session_keys(object, allowed) {
    if (!is_settings_record(object))
        throw new Error('Expected settings object');
    for (const key of Object.keys(object))
        if (['__proto__', 'prototype', 'constructor'].includes(key) || !allowed.includes(key))
            throw new Error('Unknown settings field: ' + key);
}
function legacy_groups(value) {
    if (!Array.isArray(value))
        throw new Error('Settings must be an array of groups');
    const seen = new Set();
    return value.map((group) => {
        check_session_keys(group, ['name', 'data']);
        if (typeof group.name !== 'string' || seen.has(group.name) || !group.data)
            throw new Error('Invalid or duplicate settings group');
        seen.add(group.name);
        return { name: group.name, data: group.data };
    });
}
function legacy_patch(base, groups, name) {
    const result = { ...base };
    const group = groups.find(group => group.name === name);
    if (group) {
        check_session_keys(group.data, Object.keys(base));
        Object.assign(result, group.data);
    }
    return result;
}
function legacy_numbers(value) {
    if (!Array.isArray(value))
        throw new Error('Invalid numeric array');
    return value.map((item) => session_number(item, 'array entry'));
}
function session_range(value, min, max, name) {
    if (!Number.isFinite(value) || value < min || value > max)
        throw new Error('Invalid ' + name);
}
function imported_dimension_state(value) {
    const groups = legacy_groups(value);
    let requested_dimensions = shape_params.dimensions, resolution = shape_params.resolution;
    let stack = transforms, explicit_stack = false;
    const shape = groups.find(group => group.name === 'shape_params');
    if (shape) {
        if (!is_settings_record(shape.data))
            throw new Error('Invalid shape settings');
        if (shape.data.dimensions !== undefined)
            requested_dimensions = shape.data.dimensions;
        if (shape.data.resolution !== undefined)
            resolution = shape.data.resolution;
        if (shape.data.coeff !== undefined) {
            const coeff = legacy_numbers(shape.data.coeff);
            if (coeff.length > 32 || (shape.data.coeff_count !== undefined && shape.data.coeff_count !== coeff.length))
                throw new Error('Invalid coefficients');
        }
    }
    const dimensions = require_dimensions(requested_dimensions);
    require_resolution(resolution);
    const imported = groups.find(group => group.name === 'transforms');
    if (imported) {
        stack = imported.data;
        explicit_stack = true;
    }
    return { dimensions, transforms: normalized_transform_stack(stack, dimensions, explicit_stack) };
}
function prepare_session(text) {
    if (typeof text !== 'string' || text.length > 262144)
        throw new Error('Session JSON is too large (maximum 256 KiB)');
    const parsed = JSON.parse(text);
    if (is_settings_record(parsed) && parsed.version === 2)
        return prepare_session_v2(parsed);
    const saved = session_from_wire(parsed), legacy = Array.isArray(saved);
    if (!legacy) {
        check_session_keys(saved, ['version', 'groups', 'base_orientation', 'active_field_source']);
        if (saved.version !== 1)
            throw new Error('Unsupported session format');
    }
    const groups = legacy_groups(legacy ? saved : is_settings_record(saved) ? saved.groups : undefined);
    const allowed = ['shape_params', 'camera_params', 'material_params', 'transform_params', 'transforms'];
    for (const group of groups) {
        if (!allowed.includes(group.name))
            throw new Error('Unknown settings group: ' + group.name);
        if (group.name === 'transforms') {
            if (!Array.isArray(group.data))
                throw new Error('Invalid transform stack');
            for (const item of group.data)
                check_session_keys(item, Object.keys(plain_transform()));
        }
    }
    const dimensions = imported_dimension_state(groups);
    const s = legacy_patch(shape_params, groups, 'shape_params'), c = legacy_patch(camera_params, groups, 'camera_params'), m = legacy_patch(material_params, groups, 'material_params'), t = legacy_patch(transform_params, groups, 'transform_params');
    const patch = groups.find(group => group.name === 'shape_params')?.data;
    const coeff = legacy_numbers(s.coeff);
    if (is_settings_record(patch) && patch.coeff !== undefined && patch.coeff_count === undefined)
        s.coeff_count = coeff.length;
    // Accept valid historical overhead values, but always use fixed 1.5x capacity.
    session_number(s.memory_overuse, 'memory overhead', 0, 1);
    const shape = {
        edit_code: session_boolean(s.edit_code), editor_width: session_number(s.editor_width, 'editor width', 0, 100000),
        resolution: require_resolution(s.resolution), reset: session_boolean(s.reset), dimensions: require_dimensions(s.dimensions),
        memory_overuse: 0.5, iso: session_number(s.iso, 'isovalue'),
        parameters: legacy_numbers(s.parameters), interpolate: session_boolean(s.interpolate),
        max_coeff_count: session_number(s.max_coeff_count, 'maximum coefficient count', 1, 32), coeff_count: session_number(s.coeff_count, 'coefficient count', 0, 32), coeff
    };
    if (!Number.isInteger(shape.max_coeff_count) || !Number.isInteger(shape.coeff_count) || shape.coeff_count > shape.max_coeff_count || coeff.length !== shape.coeff_count)
        throw new Error('Invalid coefficient count');
    if (typeof c.background !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.background))
        throw new Error('Invalid background color');
    const camera = { perspective: session_boolean(c.perspective), fov: session_number(c.fov, 'field of view', 0.05, 179.95), scale: session_number(c.scale, 'camera scale'), wobble: session_boolean(c.wobble), radius: session_number(c.radius, 'camera radius', 0, 10), speed: session_number(c.speed, 'camera speed', 0, 10), axes: session_boolean(c.axes), background: c.background, fps: session_boolean(c.fps) };
    if (camera.scale <= 0)
        throw new Error('Camera scale must be positive');
    const equation = session_enum(m.equation, [0, 100, 101, 102, 103, 104]);
    const material = { calc_normals: session_boolean(m.calc_normals), material: session_enum(m.material, [0, 1, 3, 4, 5]), opacity: session_number(m.opacity, 'opacity', 0, 1), side: session_enum(m.side, [0, 1, 2]), blending: session_enum(m.blending, [0, 1, 2, 3, 4, 5]), equation: equation === 0 ? 100 : equation, depth_test: session_boolean(m.depth_test), depth_write: session_boolean(m.depth_write), wireframe: session_boolean(m.wireframe), coordinates: session_boolean(m.coordinates), values: session_boolean(m.values), geometry: session_boolean(m.geometry) };
    const transform = { zoom: require_zoom(t.zoom), invert_order: session_boolean(t.invert_order), push_transform: session_boolean(t.push_transform), pop_transform: session_boolean(t.pop_transform), apply_transforms: session_boolean(t.apply_transforms), pop_all_on_apply: session_boolean(t.pop_all_on_apply), reset_orientation: session_boolean(t.reset_orientation), pop_all_transforms: session_boolean(t.pop_all_transforms) };
    validate_numeric_settings(shape, transform, dimensions.transforms);
    const matrix = legacy ? numeric.identity(dimensions.dimensions + 1) : is_settings_record(saved) ? saved.base_orientation : undefined;
    if (!Array.isArray(matrix) || matrix.length !== dimensions.dimensions + 1)
        throw new Error('Invalid base orientation');
    const orientation = matrix.map((row) => session_numbers(row, dimensions.dimensions + 1));
    const source = legacy ? null : is_settings_record(saved) ? saved.active_field_source : undefined;
    if (source !== null) {
        if (typeof source !== 'string')
            throw new Error('Invalid function source');
        new Function('x', 'c', source);
    }
    return { shape_params: shape, camera_params: camera, material_params: material, transform_params: transform, transforms: dimensions.transforms, base_orientation: orientation, active_field_source: source };
}
function export_to_json() {
    if (typeof assert_session_ready === 'function')
        assert_session_ready();
    const groups = [{ name: 'shape_params', data: shape_params }, { name: 'camera_params', data: camera_params }, { name: 'material_params', data: material_params }, { name: 'transform_params', data: transform_params }, { name: 'transforms', data: transforms }];
    const text = JSON.stringify(session_to_wire({ version: 1, groups, base_orientation, active_field_source }));
    prepare_session(text);
    window.prompt('Copy to clipboard: Ctrl+C, Enter.', text);
}
function merge(a, b) { Object.assign(a, b); }
function import_from_json() {
    const text = window.prompt('Paste JSON from a trusted source. Imported JavaScript runs in workers.', '');
    if (text === null)
        return false;
    try {
        import_settings(text);
        return true;
    }
    catch (error) {
        window.alert('Could not import settings: ' + (error instanceof Error ? error.message : String(error)));
        return false;
    }
}
function import_settings(text) {
    const state = prepare_session(text);
    if (typeof making_gif !== 'undefined' && making_gif)
        stop_gif();
    merge(shape_params, state.shape_params);
    merge(camera_params, state.camera_params);
    merge(material_params, state.material_params);
    merge(transform_params, state.transform_params);
    n = shape_params.dimensions;
    transforms = state.transforms;
    base_orientation = state.base_orientation;
    active_field_source = state.active_field_source;
    for (let k = 0; k < shape_params.coeff.length; k++)
        cached_coeff[k] = shape_params.coeff[k];
    my_code_mirror.off('beforeChange', before_change_callback);
    try {
        my_code_mirror.setValue(active_field_source === null ? default_text() : 'function field(x, c, size3, n) {\n' + active_field_source + '\n}');
    }
    finally {
        my_code_mirror.on('beforeChange', before_change_callback);
    }
    size_dirty = coords_dirty = scalar_field_dirty = mesh_dirty = false;
    reset_worker(shape_params.resolution);
    if (state.camera_pose) {
        camera.position.fromArray(state.camera_pose.position);
        camera.up.fromArray(state.camera_pose.up);
        controls.target.fromArray(state.camera_pose.target);
        make_camera();
    }
    update_material();
    update_background();
}
var gif_capture_timer = null;
var gif_advance_timer = null;
var frame_number;
var ss_num;
function stop_gif() {
    if (gif_capture_timer !== null)
        clearTimeout(gif_capture_timer);
    if (gif_advance_timer !== null)
        clearTimeout(gif_advance_timer);
    gif_capture_timer = gif_advance_timer = null;
    making_gif = false;
    done_with_gif = true;
    waiting_for_next_frame = false;
    frame_number = undefined;
}
function schedule_gif_capture() {
    if (!making_gif || done_with_gif || waiting_for_next_frame || gif_capture_timer !== null)
        return;
    waiting_for_next_frame = true;
    gif_capture_timer = setTimeout(() => {
        gif_capture_timer = null;
        if (!making_gif || done_with_gif) {
            stop_gif();
            return;
        }
        if (waiting_for_any_web_worker() || pending_worker_stage !== null) {
            waiting_for_next_frame = false;
            return;
        }
        try {
            make_gif();
        }
        catch (error) {
            stop_gif();
            report_worker_error(error instanceof Error ? error.message : String(error));
        }
    }, 2000);
}
function data_url_to_blob(data_url) {
    const marker = ';base64,', encoded = data_url.includes(marker), parts = data_url.split(encoded ? marker : ',');
    const header = parts[0], body = parts[1];
    if (header === undefined || body === undefined)
        throw new Error('Invalid data URL');
    const content_type = header.split(':')[1];
    if (content_type === undefined)
        throw new Error('Invalid data URL type');
    if (!encoded)
        return new Blob([decodeURIComponent(body)], { type: content_type });
    const raw = window.atob(body), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++)
        bytes[i] = raw.charCodeAt(i);
    return new Blob([bytes], { type: content_type });
}
function get_screenshot_number() { ss_num = ss_num === undefined ? 0 : ss_num + 1; return pad_with_zeros(ss_num); }
function pad_with_zeros(s) {
    let out = s.toString();
    if (s < 100000) {
        out = '0' + out;
        if (s < 10000) {
            out = '0' + out;
            if (s < 1000) {
                out = '0' + out;
                if (s < 100) {
                    out = '0' + out;
                    if (s < 10)
                        out = '0' + out;
                }
            }
        }
    }
    return out;
}
function take_screenshot() { saveAs(data_url_to_blob(renderer.domElement.toDataURL('image/png')), 'IsoVis' + get_screenshot_number() + '.png'); }
function make_gif() {
    frame_number = frame_number === undefined ? start_frame : frame_number + 1;
    if (done_with_gif) {
        stop_gif();
        return;
    }
    saveAs(data_url_to_blob(renderer.domElement.toDataURL('image/png')), 'IsoVis_frame' + pad_with_zeros(frame_number) + '.png');
    waiting_for_next_frame = true;
    gif_advance_timer = setTimeout(() => { gif_advance_timer = null; if (!making_gif || done_with_gif) {
        stop_gif();
        return;
    } try {
        do_next_frame();
    }
    catch (error) {
        stop_gif();
        report_worker_error(error instanceof Error ? error.message : String(error));
    } }, 5000);
}
function do_next_frame() { frame(frame_number); if (done_with_gif) {
    stop_gif();
    return;
} talk_to_worker('coords'); waiting_for_next_frame = false; }
function frame(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0)
        throw new Error('Frame must be a nonnegative integer');
    if (value > 360) {
        done_with_gif = true;
        return;
    }
    const first = transforms[0], second = transforms[1];
    if (!first || !second || first.type !== '0' || second.type !== '0')
        throw new Error('GIF sequence requires two rotation transforms');
    if (value <= 90)
        first.degrees = value;
    else if (value <= 180)
        second.degrees = 0.5 * (value - 90);
    else if (value <= 270)
        first.degrees = 90 - (value - 180);
    else
        second.degrees = 0.5 * (value - 270);
}
function start_gif() { stop_gif(); camera.position.x = 13.801932541815242; camera.position.y = 8.67053362580356; camera.position.z = 12.602896281212557; camera_params.speed = 0; camera_params.radius = 0; making_gif = true; done_with_gif = false; }
