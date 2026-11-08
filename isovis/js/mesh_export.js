"use strict";
// Generated browser output: edit src/mesh_export.ts, then run `just build`.
const mesh_export_limits = { triangles: 500000, vertices: 500000, file_bytes: 128 * 1024 ** 2, json_bytes: 1024 ** 2 };
function mesh_unit(x, y, z) {
    const length = Math.hypot(x, y, z);
    if (!Number.isFinite(length) || length === 0)
        throw new Error('Invalid mesh normal');
    return [Math.fround(x / length), Math.fround(y / length), Math.fround(z / length)];
}
function mesh_float(value) {
    const result = Math.fround(value);
    if (!Number.isFinite(result))
        throw new Error('Mesh contains non-finite or out-of-range coordinates');
    return result;
}
// Export only rendered surface triangles, never helper axes, lights or buffer capacity.
// Weld exact float32 position+normal pairs across octants; never proximity-weld.
function collect_export_mesh(surfaces) {
    const result = { positions: [], normals: [], indices: [] };
    const vertices = new Map();
    let triangles = 0;
    for (const surface of surfaces) {
        const geometry = surface.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal;
        if (!position || position.itemSize !== 3 || position.normalized || !Number.isInteger(position.count) || position.count < 0 || position.array.length < position.count * 3)
            throw new Error('Unsupported position attribute');
        const index = geometry.index;
        if (index && (index.itemSize !== 1 || index.normalized || !Number.isInteger(index.count) || index.count < 0 || index.array.length < index.count))
            throw new Error('Invalid index attribute');
        if (normal && (normal.itemSize !== 3 || normal.normalized || !Number.isInteger(normal.count) || normal.count < position.count || normal.array.length < position.count * 3))
            throw new Error('Unsupported normal attribute');
        const available = index ? index.count : position.count;
        const { start, count } = geometry.drawRange;
        if (!Number.isInteger(start) || start < 0 || start > available || !(count === Infinity || Number.isInteger(count) && count >= 0))
            throw new Error('Invalid mesh draw range');
        const used = Math.floor(Math.min(count, available - start) / 3) * 3;
        triangles += used / 3;
        if (triangles > mesh_export_limits.triangles)
            throw new Error('Export exceeds 500,000 triangles; reduce resolution');
        if (!used)
            continue;
        surface.updateWorldMatrix(true, false);
        const m = surface.matrixWorld.elements;
        if (m.length !== 16 || !m.every(Number.isFinite) || m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1)
            throw new Error('Invalid mesh world transform');
        const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
        const cofactor = [e * i - f * h, f * g - d * i, d * h - e * g, c * h - b * i, a * i - c * g, b * g - a * h, b * f - c * e, c * d - a * f, a * e - b * d];
        const determinant = a * cofactor[0] + b * cofactor[1] + c * cofactor[2];
        if (!Number.isFinite(determinant) || determinant === 0 || !cofactor.every(Number.isFinite))
            throw new Error('Singular mesh world transform');
        const sign = Math.sign(determinant);
        for (let offset = start; offset < start + used; offset += 3) {
            const corners = [0, determinant < 0 ? 2 : 1, determinant < 0 ? 1 : 2].map(corner => {
                const vertex = index ? index.array[offset + corner] : offset + corner;
                if (!Number.isInteger(vertex) || vertex < 0 || vertex >= position.count)
                    throw new Error('Mesh index is out of range');
                const x = position.array[vertex * 3], y = position.array[vertex * 3 + 1], z = position.array[vertex * 3 + 2];
                return { vertex, point: [mesh_float(m[0] * x + m[4] * y + m[8] * z + m[12]), mesh_float(m[1] * x + m[5] * y + m[9] * z + m[13]), mesh_float(m[2] * x + m[6] * y + m[10] * z + m[14])] };
            });
            const p = corners[0].point, q = corners[1].point, r = corners[2].point;
            const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
            const cross = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
            if (Math.hypot(...cross) === 0)
                continue; // Zero-area triangles have no STL/glTF normal.
            const face = mesh_unit(cross[0], cross[1], cross[2]);
            for (const corner of corners) {
                let direction = face;
                if (normal) {
                    const x = normal.array[corner.vertex * 3], y = normal.array[corner.vertex * 3 + 1], z = normal.array[corner.vertex * 3 + 2];
                    if (![x, y, z].every(Number.isFinite))
                        throw new Error('Mesh contains non-finite normals');
                    if (Math.hypot(x, y, z) > 0)
                        direction = mesh_unit(sign * (cofactor[0] * x + cofactor[1] * y + cofactor[2] * z), sign * (cofactor[3] * x + cofactor[4] * y + cofactor[5] * z), sign * (cofactor[6] * x + cofactor[7] * y + cofactor[8] * z));
                }
                const key = corner.point.concat(direction).join(',');
                let vertex = vertices.get(key);
                if (vertex === undefined) {
                    vertex = result.positions.length / 3;
                    if (vertex >= mesh_export_limits.vertices)
                        throw new Error('Export exceeds 500,000 distinct vertices; reduce resolution');
                    vertices.set(key, vertex);
                    result.positions.push(...corner.point);
                    result.normals.push(...direction);
                }
                result.indices.push(vertex);
            }
        }
    }
    if (!result.indices.length)
        throw new Error('No non-degenerate surface triangles to export');
    return result;
}
function mesh_file_size(bytes) {
    if (bytes > mesh_export_limits.file_bytes)
        throw new Error('Export exceeds 128 MiB; reduce resolution');
}
function mesh_stl(mesh) {
    const count = mesh.indices.length / 3, size = 84 + count * 50;
    mesh_file_size(size);
    const buffer = new ArrayBuffer(size), view = new DataView(buffer);
    new Uint8Array(buffer).set(session_encoder.encode('IsoVis binary STL; units unspecified; no embedded session'));
    view.setUint32(80, count, true);
    let offset = 84;
    for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
        const points = mesh.indices.slice(triangle, triangle + 3).map(index => mesh.positions.slice(index * 3, index * 3 + 3));
        const p = points[0], q = points[1], r = points[2];
        const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
        const face = mesh_unit(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        for (const value of [...face, ...p, ...q, ...r]) {
            view.setFloat32(offset, value, true);
            offset += 4;
        }
        view.setUint16(offset, 0, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'model/stl' });
}
function mesh_obj(mesh, session) {
    const chunks = ['# IsoVis OBJ; units unspecified; Y up\n'];
    if (session) {
        const encoded = session_base64(session_encoder.encode(session_json(session)));
        chunks.push('# isovis_session_v2_begin\n');
        for (let i = 0; i < encoded.length; i += 76)
            chunks.push('# isovis_session_v2 ' + encoded.slice(i, i + 76) + '\n');
        chunks.push('# isovis_session_v2_end\n');
    }
    chunks.push('o IsoVis_surface\n');
    for (let i = 0; i < mesh.positions.length; i += 3)
        chunks.push('v ' + mesh.positions.slice(i, i + 3).join(' ') + '\n');
    for (let i = 0; i < mesh.normals.length; i += 3)
        chunks.push('vn ' + mesh.normals.slice(i, i + 3).join(' ') + '\n');
    for (let i = 0; i < mesh.indices.length; i += 3)
        chunks.push('f ' + mesh.indices.slice(i, i + 3).map(index => (index + 1) + '//' + (index + 1)).join(' ') + '\n');
    const blob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
    mesh_file_size(blob.size);
    return blob;
}
function mesh_glb(mesh, material, session) {
    const count = mesh.positions.length / 3, colored = material.mode === 4;
    const index_bytes = count <= 65535 ? 2 : 4;
    const position_bytes = count * 12, normal_offset = position_bytes, color_offset = position_bytes * 2;
    const index_offset = position_bytes * (colored ? 3 : 2), bin_length = index_offset + mesh.indices.length * index_bytes;
    const padded_bin = (bin_length + 3) & ~3;
    mesh_file_size(padded_bin);
    const buffer = new ArrayBuffer(padded_bin), view = new DataView(buffer);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mesh.positions.length; i++) {
        const position = mesh.positions[i], normal = mesh.normals[i];
        min[i % 3] = Math.min(min[i % 3], position);
        max[i % 3] = Math.max(max[i % 3], position);
        view.setFloat32(i * 4, position, true);
        view.setFloat32(normal_offset + i * 4, normal, true);
        if (colored) {
            const color = normal * 0.5 + 0.5;
            const linear = color <= 0.04045 ? color / 12.92 : ((color + 0.055) / 1.055) ** 2.4;
            view.setFloat32(color_offset + i * 4, linear, true);
        }
    }
    mesh.indices.forEach((index, i) => { if (index_bytes === 2)
        view.setUint16(index_offset + i * 2, index, true);
    else
        view.setUint32(index_offset + i * 4, index, true); });
    const buffer_views = [{ buffer: 0, byteOffset: 0, byteLength: position_bytes, target: 34962 }, { buffer: 0, byteOffset: normal_offset, byteLength: position_bytes, target: 34962 }];
    const accessors = [{ bufferView: 0, componentType: 5126, count, type: 'VEC3', min, max }, { bufferView: 1, componentType: 5126, count, type: 'VEC3' }];
    const attributes = { POSITION: 0, NORMAL: 1 };
    if (colored) {
        buffer_views.push({ buffer: 0, byteOffset: color_offset, byteLength: position_bytes, target: 34962 });
        attributes.COLOR_0 = accessors.length;
        accessors.push({ bufferView: 2, componentType: 5126, count, type: 'VEC3' });
    }
    const index_accessor = accessors.length;
    buffer_views.push({ buffer: 0, byteOffset: index_offset, byteLength: mesh.indices.length * index_bytes, target: 34963 });
    accessors.push({ bufferView: buffer_views.length - 1, componentType: index_bytes === 2 ? 5123 : 5125, count: mesh.indices.length, type: 'SCALAR' });
    const unlit = [0, 1, 4].includes(material.mode);
    const surface = { name: 'IsoVis surface', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, material.opacity], metallicFactor: 0, roughnessFactor: material.mode === 5 ? 0.4 : 1 }, doubleSided: material.double_sided, alphaMode: material.opacity < 1 ? 'BLEND' : 'OPAQUE' };
    if (unlit)
        surface.extensions = { KHR_materials_unlit: {} };
    const document = { asset: { version: '2.0', generator: 'IsoVis' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'IsoVis surface' }],
        meshes: [{ primitives: [{ attributes, indices: index_accessor, material: 0, mode: 4 }] }], materials: [surface], buffers: [{ byteLength: bin_length }], bufferViews: buffer_views, accessors };
    if (unlit)
        document.extensionsUsed = ['KHR_materials_unlit'];
    if (session) {
        session_json(session);
        document.extras = { isovis_session: session };
    }
    const json = session_encoder.encode(JSON.stringify(document)), json_length = (json.length + 3) & ~3;
    if (json_length > mesh_export_limits.json_bytes)
        throw new Error('GLB metadata exceeds 1 MiB');
    const total = 12 + 8 + json_length + 8 + padded_bin;
    mesh_file_size(total);
    const header = new ArrayBuffer(20), head = new DataView(header);
    head.setUint32(0, 0x46546c67, true);
    head.setUint32(4, 2, true);
    head.setUint32(8, total, true);
    head.setUint32(12, json_length, true);
    head.setUint32(16, 0x4e4f534a, true);
    const json_chunk = new Uint8Array(json_length);
    json_chunk.fill(0x20);
    json_chunk.set(json);
    const binary_header = new ArrayBuffer(8), binary_view = new DataView(binary_header);
    binary_view.setUint32(0, padded_bin, true);
    binary_view.setUint32(4, 0x004e4942, true);
    return new Blob([header, json_chunk, binary_header, buffer], { type: 'model/gltf-binary' });
}
function make_mesh_download(format, include_session) {
    assert_session_ready();
    const session = include_session && format !== 'stl' ? capture_session() : undefined;
    const mesh = collect_export_mesh(meshes);
    if (format === 'stl')
        return mesh_stl(mesh);
    if (format === 'obj')
        return mesh_obj(mesh, session);
    if (format === 'glb')
        return mesh_glb(mesh, { mode: session_enum(material_params.material, [0, 1, 3, 4, 5]), opacity: session_number(material_params.opacity, 'opacity', 0, 1), double_sided: session_enum(material_params.side, [0, 1, 2]) !== 0 }, session);
    throw new Error('Unsupported mesh format');
}
