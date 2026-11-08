"use strict";
// Generated browser output: edit src/default_field.ts, then run `just build`.
// The built-in kernel is checked too. Only its erased body becomes editable
// JavaScript; imported/user-written bodies are never translated or rewritten.
function default_field_kernel(x, c, size3, n, values) {
    for (let i = 0, j = 0; i < size3; i++, j += n) {
        const t = Math.sqrt(Math.abs(x[j] * x[j] + x[j + 1] * x[j + 1] - c[0])) - c[1];
        const u = Math.sqrt(Math.abs(x[j + 2] * x[j + 2] + (n > 3 ? x[j + 3] * x[j + 3] : 0) - c[2])) - c[3];
        values[i] = t * t + u * u - (n > 4 ? c[4] * Math.sin(c[5] * x[j + 4]) : 0);
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
