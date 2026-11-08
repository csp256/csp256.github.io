"use strict";
// Generated browser output: edit src/worker.ts, then run `just build`.
globalThis.field_needs_recovery = false;
function setup(dim, s, octant) {
    globalThis.n = dim;
    globalThis.size = s;
    globalThis.size2 = size * size;
    globalThis.size3 = size * size * size;
    if (typeof points === 'undefined' || points.length < 3 * size3)
        globalThis.points = new Float32Array(3 * size3);
    if (typeof values === 'undefined' || values.length < size3)
        globalThis.values = new Float32Array(size3);
    if (typeof coords === 'undefined' || coords.length < n * size3)
        globalThis.coords = new Float32Array(n * size3);
    if (typeof cube_index_table === 'undefined' || cube_index_table.length < size3)
        globalThis.cube_index_table = new Int16Array(size3);
    const axis_min = -10, axis_max = 10, axis_range = axis_max - axis_min;
    const x_offset = octant & 1 ? axis_min : 0, y_offset = octant & 2 ? axis_min : 0, z_offset = octant & 4 ? axis_min : 0;
    let index = 0;
    const spacing = 0.5 * axis_range / (size - 1);
    for (let k = 0; k < size; k++) {
        const z = z_offset + spacing * k;
        for (let j = 0; j < size; j++) {
            const y = y_offset + spacing * j;
            for (let i = 0; i < size; i++, index += 3) {
                points[index] = x_offset + spacing * i;
                points[index + 1] = y;
                points[index + 2] = z;
            }
        }
    }
}
function update_coords_function(n, s) {
    let a = 'var c_index=0;\nvar p_index=0;\nvar translation=[';
    for (let i = 0; i < n; i++)
        a += 'r[' + i + '][' + n + '],';
    a += '];\nvar c1=[';
    for (let i = 0; i < n; i++)
        a += 'r[' + i + '][0],';
    a += '];\nvar z_translation=[';
    for (let i = 0; i < n; i++)
        a += '0,';
    a += '];\nvar yz_translation=[';
    for (let i = 0; i < n; i++)
        a += '0,';
    a += '];\nfor(var k=0;k<' + s + ';k++){\n';
    for (let i = 0; i < n; i++)
        a += 'z_translation[' + i + ']=r[' + i + '][2]*points[p_index+2]+translation[' + i + '];\n';
    a += 'for(var j=0;j<' + s + ';j++){\n';
    for (let i = 0; i < n; i++)
        a += 'yz_translation[' + i + ']=r[' + i + '][1]*points[p_index+1]+z_translation[' + i + '];\n';
    a += 'for(var i=0;i<' + s + ';i++,c_index+=' + n + ',p_index+=3){\n';
    for (let i = 0; i < n; i++)
        a += 'coords[c_index+' + i + ']=c1[' + i + ']*points[p_index]+yz_translation[' + i + '];\n';
    return a + '}}}';
}
// Supply zero for unset supported slots without changing c.length, iteration,
// or the original array. This private fallback array leaves Array.prototype
// untouched and avoids a Proxy/getter in the per-location hot loop.
const zero_coefficient_defaults = new Array(32).fill(0);
for (let k = 0; k < 32; k++)
    Object.defineProperty(zero_coefficient_defaults, k, { enumerable: false });
function compile_field(source) {
    const compiled = new Function('x', 'c', source);
    return (x, c) => {
        const coefficients = c.slice();
        Object.setPrototypeOf(coefficients, zero_coefficient_defaults);
        compiled(x, coefficients);
    };
}
function default_field() { return compile_field(default_field_body()); }
function update_field_function(data) { if (typeof data.code === 'string')
    globalThis.field = compile_field(data.code); }
function rebuild_scalar_field(c, _num) { if (typeof field === 'undefined')
    globalThis.field = default_field(); field(coords, c); }
function is_number(value) { return (typeof value === 'string' || typeof value === 'number') && !isNaN(parseFloat(String(value))) && Number.isFinite(Number(value)); }
function rebuild_coords_indirectly(r) { rebuild_coords(r); }
globalThis.onmessage = (event) => {
    // A malformed envelope is not evaluated. With no trusted octant/buffer ownership
    // yet, report a transport failure so the main thread replaces this worker.
    const data = read_worker_request(event.data);
    if (data.message_type === 'echo') {
        self.postMessage(data.num);
        return;
    }
    console.time('Worker ' + data.num + ' Task');
    const previous_field = typeof field === 'undefined' ? null : field;
    globalThis.vertex_buffer = data.vertex_buffer;
    globalThis.face_buffer = data.face_buffer;
    globalThis.normal_buffer = data.normal_buffer;
    try {
        const stages = ['init', 'coords', 'code', 'scalar_field', 'geometry'];
        const stage = stages.indexOf(data.message_type);
        if (stage === 0) {
            setup(data.params.dimensions, data.params.resolution, data.num);
            const generated = new Function('r', update_coords_function(data.n, data.params.resolution));
            globalThis.rebuild_coords = (matrix) => { generated(matrix); };
        }
        if (stage <= 1)
            rebuild_coords_indirectly(data.r);
        if (stage <= 2)
            update_field_function(data);
        if (stage <= 3)
            rebuild_scalar_field(data.params.coeff, data.num);
        if (field_needs_recovery)
            rebuild_scalar_field(data.params.coeff, data.num);
        globalThis.field_needs_recovery = false;
        marching_cubes(points, values, data.params.iso, data.params.interpolate, data.calc_normals, data.num, data.params.memory_overuse);
        reply(data.num, data.batch_id);
    }
    catch (error) {
        globalThis.field = previous_field || default_field();
        globalThis.field_needs_recovery = true;
        const returned = [vertex_buffer, face_buffer, normal_buffer];
        const response = { num: data.num, batch_id: data.batch_id, error: error instanceof Error ? error.message || String(error) : String(error), buffers: returned };
        self.postMessage(response, returned);
    }
};
function reply(num, batch_id) {
    const buffers = [vertex_buffer, face_buffer, normal_buffer];
    const response = { num, batch_id, buffers, vertex_count: active_vertex_count, index_count: active_index_count };
    self.postMessage(response, buffers);
}
