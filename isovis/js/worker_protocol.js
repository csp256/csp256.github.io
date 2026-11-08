"use strict";
// Generated browser output: edit src/worker_protocol.ts, then run `just build`.
const octant_indices = [0, 1, 2, 3, 4, 5, 6, 7];
function make_octants(create) {
    return [create(0), create(1), create(2), create(3), create(4), create(5), create(6), create(7)];
}
function protocol_record(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Invalid worker message');
    return value;
}
function protocol_number(value, min, max, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
        throw new Error('Invalid worker number');
    return value;
}
function protocol_octant(value) {
    const number = protocol_number(value, 0, 7, true);
    // The checked integer range is exactly the eight octant literals.
    return number;
}
function protocol_boolean(value) { if (typeof value !== 'boolean')
    throw new Error('Invalid worker boolean'); return value; }
function is_transfer_buffer(value) {
    // Native brand check also accepts genuine cross-realm buffers in VM fixtures;
    // unlike toStringTag, it cannot be forged by an ordinary object.
    try {
        return typeof Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')?.get?.call(value) === 'number';
    }
    catch {
        return false;
    }
}
function protocol_buffer(value) { if (!is_transfer_buffer(value) || value.byteLength % 4 !== 0)
    throw new Error('Invalid worker transfer buffer'); return value; }
function protocol_batch(value) { return value === undefined ? undefined : protocol_number(value, 0, Number.MAX_SAFE_INTEGER, true); }
function read_worker_request(value) {
    const record = protocol_record(value), num = protocol_octant(record.num);
    if (record.message_type === 'echo')
        return { message_type: 'echo', num };
    const stage = record.message_type;
    if (stage !== 'init' && stage !== 'coords' && stage !== 'code' && stage !== 'scalar_field' && stage !== 'geometry')
        throw new Error('Invalid worker stage');
    const shape = protocol_record(record.params), dimensions = protocol_number(shape.dimensions, 3, 32, true), resolution = protocol_number(shape.resolution, 2, 65, true);
    if (record.n !== dimensions || 8 * resolution ** 3 * (dimensions + 4) * 4 > 128 * 1024 ** 2)
        throw new Error('Invalid worker grid');
    if (!Array.isArray(shape.coeff) || shape.coeff.length > 32)
        throw new Error('Invalid worker coefficients');
    const coeff = Array.from(shape.coeff, (item) => protocol_number(item, -Number.MAX_VALUE, Number.MAX_VALUE));
    if (!Array.isArray(record.r) || record.r.length !== dimensions + 1)
        throw new Error('Invalid worker matrix');
    const r = Array.from(record.r, (row) => {
        if (!Array.isArray(row) || row.length !== dimensions + 1)
            throw new Error('Invalid worker matrix row');
        return Array.from(row, (item) => protocol_number(item, -Number.MAX_VALUE, Number.MAX_VALUE));
    });
    if (record.code !== undefined && typeof record.code !== 'string')
        throw new Error('Invalid worker source');
    // Validate the legacy field without allowing it to change fixed 1.5x capacity.
    protocol_number(shape.memory_overuse, 0, 1);
    return { num, batch_id: protocol_batch(record.batch_id), message_type: stage, r, n: dimensions,
        params: { dimensions, resolution, coeff, iso: protocol_number(shape.iso, -Number.MAX_VALUE, Number.MAX_VALUE), interpolate: protocol_boolean(shape.interpolate), memory_overuse: 0.5 },
        calc_normals: protocol_boolean(record.calc_normals), code: record.code,
        vertex_buffer: protocol_buffer(record.vertex_buffer), face_buffer: protocol_buffer(record.face_buffer), normal_buffer: protocol_buffer(record.normal_buffer) };
}
function read_worker_reply(value) {
    const record = protocol_record(value), num = protocol_octant(record.num), batch_id = protocol_batch(record.batch_id);
    if (!Array.isArray(record.buffers) || record.buffers.length !== 3)
        throw new Error('Invalid worker buffers');
    const buffers = [protocol_buffer(record.buffers[0]), protocol_buffer(record.buffers[1]), protocol_buffer(record.buffers[2])];
    if (record.error !== undefined) {
        if (typeof record.error !== 'string' || !record.error)
            throw new Error('Invalid worker error');
        return { num, batch_id, buffers, error: record.error };
    }
    const vertex_count = protocol_number(record.vertex_count, 0, Math.min(buffers[0].byteLength, buffers[2].byteLength) / 12, true);
    const index_count = protocol_number(record.index_count, 0, buffers[1].byteLength / 4, true);
    if (index_count % 3 !== 0 || (index_count > 0 && vertex_count === 0))
        throw new Error('Invalid worker triangle counts');
    return { num, batch_id, buffers, vertex_count, index_count };
}
