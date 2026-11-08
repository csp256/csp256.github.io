"use strict";
// Generated browser output: edit src/worker_interface.ts, then run `just build`.
var successful_calculation_signature = null;
var calculation_failed = false;
var workers_need_init = false;
var worker_batch_id = 0;
var active_worker_batch = null;
var publishing_worker_batch = false;
var active_field_source = null;
var worker_generation = 0;
var pending_worker_stage = null;
var pending_worker_code = null;
var worker_stages = ['init', 'coords', 'code', 'scalar_field', 'geometry'];
function clear_worker_error() { const box = document.getElementById('worker_error'); if (box) {
    box.textContent = '';
    box.hidden = true;
} }
function report_worker_error(message) {
    let box = document.getElementById('worker_error');
    if (!box) {
        box = document.createElement('div');
        box.id = 'worker_error';
        box.setAttribute('role', 'alert');
        box.style.cssText = 'position:fixed;bottom:0;left:0;z-index:10000;background:#500;color:white;padding:8px';
        document.body.appendChild(box);
    }
    box.hidden = false;
    box.textContent = 'Calculation failed: ' + message + '. The last successful surface is retained. Edit the function and click Update to retry.';
}
function bind_worker_events(worker, octant) {
    const generation = worker_generation;
    worker.onmessage = (event) => {
        if (generation !== worker_generation || workers[octant] !== worker)
            return;
        try {
            handle_worker_message({ data: read_worker_reply(event.data) });
        }
        catch (error) {
            failed(error instanceof Error ? error.message : String(error));
        }
    };
    function failed(message) {
        if (generation !== worker_generation || workers[octant] !== worker)
            return;
        worker.terminate();
        workers[octant] = make_worker(worker_source_string);
        bind_worker_events(workers[octant], octant);
        vertex_buffer[octant] = new ArrayBuffer(4);
        face_buffer[octant] = new ArrayBuffer(4);
        normal_buffer[octant] = new ArrayBuffer(4);
        waiting_for_web_worker[octant] = false;
        workers_need_init = true;
        if (active_worker_batch) {
            receive_batch_reply({ num: octant, batch_id: active_worker_batch.id, error: message, buffers: [vertex_buffer[octant], face_buffer[octant], normal_buffer[octant]] });
            return;
        }
        report_worker_error(message);
        if (!waiting_for_any_web_worker())
            document.title = title;
        dispatch_pending_work();
    }
    worker.onerror = event => { event.preventDefault?.(); failed(event.message || 'Worker communication error'); };
    worker.onmessageerror = event => { event.preventDefault?.(); failed('Worker communication error'); };
}
function calculation_signature() {
    return JSON.stringify({ shape: typeof shape_params === 'undefined' ? null : { dimensions: shape_params.dimensions, resolution: shape_params.resolution, iso: shape_params.iso, coeff: shape_params.coeff, interpolate: shape_params.interpolate }, matrix: typeof compute_full_transform === 'undefined' ? null : compute_full_transform(), source: active_field_source, normals: typeof material_params === 'undefined' ? null : material_params.calc_normals });
}
function receive_batch_reply(data) {
    const batch = active_worker_batch;
    if (!batch || data.batch_id !== batch.id || batch.replies[data.num])
        return;
    batch.replies[data.num] = data;
    batch.remaining--;
    waiting_for_web_worker[data.num] = false;
    if (data.error !== undefined) {
        batch.failed = true;
        report_worker_error(data.error);
    }
    if (batch.remaining)
        return;
    active_worker_batch = null;
    calculation_failed = batch.failed;
    const replies = make_octants(octant => { const reply = batch.replies[octant]; if (!reply)
        throw new Error('Incomplete worker batch'); return reply; });
    if (batch.failed) {
        for (const octant of octant_indices) {
            const buffers = replies[octant].buffers;
            vertex_buffer[octant] = buffers[0];
            face_buffer[octant] = buffers[1];
            normal_buffer[octant] = buffers[2];
        }
    }
    else {
        successful_calculation_signature = batch.signature || null;
        clear_worker_error();
        publishing_worker_batch = true;
        try {
            for (const reply of replies)
                publish_worker_result({ data: reply });
        }
        finally {
            publishing_worker_batch = false;
        }
    }
    document.title = title;
    dispatch_pending_work();
    if (typeof autosave_worker_completed === 'function')
        autosave_worker_completed();
}
function surface_geometry(data) {
    let geometry = new THREE.BufferGeometry();
    const indices = new Uint32Array(data.buffers[1], 0, data.index_count);
    geometry.setIndex(new THREE.BufferAttribute(data.vertex_count <= 65535 ? new Uint16Array(indices) : indices, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.buffers[0], 0, data.vertex_count * 3), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.buffers[2], 0, data.vertex_count * 3), 3));
    if (typeof renderer !== 'undefined' && renderer.supports_uint32_indices === false && data.vertex_count > 65535) {
        const expanded = geometry.toNonIndexed();
        geometry.dispose();
        geometry = expanded;
    }
    geometry.setDrawRange(0, data.index_count);
    geometry.computeBoundingSphere();
    return geometry;
}
function talk_to_worker(message) {
    const stage = worker_stages.indexOf(message);
    if (stage < 0)
        return false;
    if (message === 'code')
        active_field_source = pending_worker_code = my_code_mirror.getRange({ line: 1, ch: 0 }, { line: my_code_mirror.lineCount() - 2, ch: Infinity });
    if (pending_worker_stage === null || stage < pending_worker_stage)
        pending_worker_stage = stage;
    dispatch_pending_work();
    return true;
}
function dispatch_pending_work() {
    if (publishing_worker_batch || pending_worker_stage === null || waiting_for_any_web_worker())
        return;
    const stage = workers_need_init ? 0 : pending_worker_stage;
    let r;
    try {
        r = compute_full_transform();
    }
    catch (error) {
        pending_worker_stage = pending_worker_code = null;
        report_worker_error(error instanceof Error ? error.message : String(error));
        return;
    }
    const message_type = worker_stages[stage];
    if (!message_type)
        throw new Error('Invalid pending worker stage');
    workers_need_init = false;
    const batch_id = ++worker_batch_id;
    document.title = title_busy;
    console.time('All Workers');
    pending_worker_stage = null;
    pending_worker_code = null;
    active_worker_batch = { id: batch_id, replies: make_octants(() => null), remaining: 8, failed: false, signature: calculation_signature() };
    for (const octant of octant_indices)
        waiting_for_web_worker[octant] = true;
    for (const octant of octant_indices) {
        const outgoing = { num: octant, batch_id, message_type, r, n, params: shape_params, calc_normals: material_params.calc_normals,
            vertex_buffer: vertex_buffer[octant], face_buffer: face_buffer[octant], normal_buffer: normal_buffer[octant] };
        if (active_field_source !== null)
            outgoing.code = active_field_source;
        try {
            workers[octant].postMessage(outgoing, [vertex_buffer[octant], face_buffer[octant], normal_buffer[octant]]);
        }
        catch (error) {
            const event = new ErrorEvent('error', { message: error instanceof Error ? error.message : String(error), cancelable: true });
            workers[octant].dispatchEvent(event);
        }
    }
}
function waiting_for_any_web_worker() { return waiting_for_web_worker.some(value => value === true); }
function handle_worker_message(event) {
    if (active_worker_batch) {
        receive_batch_reply(event.data);
        return;
    }
    if (event.data.batch_id !== undefined)
        return;
    publish_worker_result(event);
}
function geometry_transfer_buffer(attribute) {
    if (!attribute || !is_transfer_buffer(attribute.array.buffer))
        throw new Error('Invalid geometry transfer attribute');
    return attribute.array.buffer;
}
function publish_worker_result(event) {
    const data = event.data, octant = data.num;
    if (data.error !== undefined) {
        vertex_buffer[octant] = data.buffers[0];
        face_buffer[octant] = data.buffers[1];
        normal_buffer[octant] = data.buffers[2];
        waiting_for_web_worker[octant] = false;
        report_worker_error(data.error);
        if (!waiting_for_any_web_worker())
            document.title = title;
        dispatch_pending_work();
        return;
    }
    vertex_buffer[octant] = geometry_transfer_buffer(meshes[octant].geometry.attributes.position);
    const recycled = meshes[octant].userData.face_buffer;
    face_buffer[octant] = is_transfer_buffer(recycled) ? recycled : new ArrayBuffer(4);
    normal_buffer[octant] = geometry_transfer_buffer(meshes[octant].geometry.attributes.normal);
    const old_geometry = meshes[octant].geometry, buff_geom = surface_geometry(data), mesh = new THREE.Mesh(buff_geom, my_material);
    mesh.userData.face_buffer = data.buffers[1];
    meshes[octant] = mesh;
    old_geometry.dispose();
    waiting_for_web_worker[octant] = false;
    if (!waiting_for_any_web_worker()) {
        document.title = title;
        console.timeEnd('All Workers');
    }
    update_scene_mesh(octant, mesh);
    dispatch_pending_work();
}
function init_workers() { globalThis.workers = make_octants(() => make_worker('worker.js')); }
function install_worker_handlers(worker, octant, _generation) { bind_worker_events(worker, octant); }
function reset_worker(resolution) {
    successful_calculation_signature = null;
    calculation_failed = false;
    active_worker_batch = null;
    worker_generation++;
    shape_params.reset = false;
    shape_params.resolution = resolution;
    document.title = title;
    for (const octant of octant_indices) {
        waiting_for_web_worker[octant] = false;
        workers[octant].terminate();
        vertex_buffer[octant] = new ArrayBuffer(4);
        face_buffer[octant] = new ArrayBuffer(4);
        normal_buffer[octant] = new ArrayBuffer(4);
    }
    for (const octant of octant_indices) {
        workers[octant] = make_worker(worker_source_string);
        install_worker_handlers(workers[octant], octant, worker_generation);
    }
    talk_to_worker('init');
    build_gui();
}
function reset_worker10() { reset_worker(10); }
function make_worker(script) {
    const url = window.URL || window.webkitURL;
    const Blob = window.Blob, Worker = window.Worker;
    if (!url || !window.Blob || !window.Worker || !script)
        throw new Error('Web Workers are unavailable');
    const script_url = url.createObjectURL(new Blob([script]));
    try {
        return new Worker(script_url);
    }
    finally {
        url.revokeObjectURL(script_url);
    }
}
function gather_worker_resource(name) {
    const element = document.getElementById(name);
    if (!element || !('text' in element) || typeof element.text !== 'string')
        throw new Error('Missing worker resource: ' + name);
    return '//' + name + '\n' + element.text + '\n';
}
