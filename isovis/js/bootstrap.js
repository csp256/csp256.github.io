"use strict";
// Generated browser output: edit src/bootstrap.ts, then run `just build`.
// A narrow bridge lets the existing plain scripts remain unchanged. Upstream
// modules are pristine. Committed browser output needs no install or build.
async function start_iso_vis() {
    try {
        const renderer_context = create_renderer_context();
        const legacy = !renderer_context.webgl2;
        const three = await import(legacy ? '../lib/three-r162/three.module.js' : 'three');
        const { OrbitControls } = await import(legacy ? '../lib/three-r162/OrbitControls.js' : '../lib/three-r187/OrbitControls.js');
        window.THREE = { ...three, OrbitControls };
        init_params();
        // Recovery/shared links must not silently lower the default resolution.
        init(renderer_context);
        animate();
        start_session_links();
        start_autosave();
    }
    catch (error) {
        if (typeof dispose_editor_divider === 'function')
            dispose_editor_divider();
        if (typeof workers !== 'undefined')
            workers.forEach(worker => worker.terminate());
        if (typeof controls !== 'undefined')
            controls.dispose();
        if (typeof window_resize !== 'undefined' && window_resize)
            window_resize.stop();
        if (typeof renderer !== 'undefined' && renderer)
            renderer.dispose();
        if (typeof keyboard !== 'undefined')
            keyboard.destroy();
        show_startup_error(error instanceof Error ? error.message : String(error));
        console.error(error);
    }
}
start_iso_vis();
