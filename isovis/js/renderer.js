"use strict";
// Generated browser output: edit src/renderer.ts, then run `just build`.
// Keep the r73 display convention deliberately: do not silently re-grade saved
// scenes while migrating the renderer. A modern color workflow is separate work.
function create_renderer_context() {
    const canvas = document.createElement('canvas');
    const options = { antialias: true, preserveDrawingBuffer: true };
    for (const kind of ['webgl2', 'webgl', 'experimental-webgl']) {
        let context;
        try {
            // DOM's catch-all overload also allows 2D contexts; these three known
            // WebGL identifiers cannot return one. Keep that assertion at the API edge.
            context = canvas.getContext(kind, options);
        }
        catch {
            continue;
        }
        if (context)
            return { canvas, context, webgl2: kind === 'webgl2' };
    }
    throw new Error('WebGL is unavailable (neither WebGL2 nor WebGL1). Enable hardware acceleration or use a browser/device with WebGL support.');
}
function create_renderer(selected = create_renderer_context()) {
    THREE.ColorManagement.enabled = false;
    const result = Object.assign(new THREE.WebGLRenderer({ canvas: selected.canvas, context: selected.context, antialias: true, preserveDrawingBuffer: true }), { supports_uint32_indices: selected.webgl2 });
    result.outputColorSpace = THREE.LinearSRGBColorSpace;
    result.toneMapping = THREE.NoToneMapping;
    result.supports_uint32_indices = selected.webgl2 || result.extensions.has('OES_element_index_uint');
    if (!selected.webgl2) {
        show_compatibility_warning('WebGL2 is unavailable. Using WebGL1 compatibility mode with an older renderer; appearance and performance may differ.' +
            (result.supports_uint32_indices ? '' : ' This device also lacks 32-bit indices: wireframe is disabled and large surfaces use more memory.'));
    }
    return result;
}
function show_compatibility_warning(message) {
    let box = document.getElementById('compatibility_warning');
    if (!box) {
        box = document.createElement('div');
        box.id = 'compatibility_warning';
        box.setAttribute('role', 'status');
        box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#553900;color:white;padding:8px;pointer-events:none';
        document.body.appendChild(box);
    }
    box.textContent = message;
}
function show_startup_error(message) {
    let box = document.getElementById('startup_error');
    if (!box) {
        box = document.createElement('div');
        box.id = 'startup_error';
        box.setAttribute('role', 'alert');
        box.style.cssText = 'position:fixed;top:0;left:0;z-index:10001;background:#500;color:white;padding:16px';
        document.body.appendChild(box);
    }
    box.textContent = 'IsoVis could not start: ' + message;
}
// MeshDepthMaterial changed its display formula since r73. Preserve the saved
// "Depth" view with a tiny application shader, not a patch to upstream Three.js.
function create_depth_display_material() {
    const uniforms = { m_near: { value: 0.1 }, m_far: { value: 20000000 }, alpha: { value: 1 } };
    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float m_near; uniform float m_far; uniform float alpha;\n' +
            'void main() { float depth = gl_FragCoord.z / gl_FragCoord.w;\n' +
            'float color = 1.0 - smoothstep(m_near, m_far, depth); gl_FragColor = vec4(vec3(color), alpha); }'
    });
    material.onBeforeRender = (_renderer, _scene, camera) => {
        if (!(camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera))
            throw new Error('Depth display requires a projection camera');
        uniforms.m_near.value = camera.near;
        uniforms.m_far.value = camera.far;
        uniforms.alpha.value = material.opacity;
        material.uniformsNeedUpdate = true;
    };
    return material;
}
