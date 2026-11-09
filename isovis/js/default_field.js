"use strict";
// Generated browser output: edit src/default_field.ts, then run `just build`.
// The built-in kernel is checked too. Only its erased body becomes editable
// JavaScript; imported/user-written bodies are never translated or rewritten.
function default_field_kernel(x, c, size3, n, values) {
    for (let i = 0, j = 0; i < size3; i++, j += n) {
        const a = x[j];
        const b = x[j + 1];
        const z = x[j + 2];
        const w = n > 3 ? x[j + 3] : 0;
        const radius_ab = Math.sqrt(Math.abs(a * a + b * b - c[0]));
        const radius_zw = Math.sqrt(Math.abs(z * z + w * w - c[2]));
        const t = radius_ab - c[1];
        const u = radius_zw - c[3];
        const wave = n > 4
            ? c[4] * Math.sin(c[5] * x[j + 4])
            : 0;
        values[i] = t * t + u * u - wave;
    }
}
function default_field_body() {
    const source = default_field_kernel.toString();
    // TypeScript emits four-space indentation. Reformat only this generated
    // default, never user/imported code, to the editor's two-space convention.
    return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'))
        .split('\n').slice(1, -1)
        .map(line => line.replace(/^(?: {4})+/g, indent => ' '.repeat(indent.length / 2)))
        .join('\n');
}
