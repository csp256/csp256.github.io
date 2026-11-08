"use strict";
// Generated browser output: edit src/ui.ts, then run `just build`.
var left_gui;
var right_gui;
function gui_folder(gui, name) {
    const folder = gui.__folders[name];
    if (!folder)
        throw new Error('Missing GUI folder: ' + name);
    return folder;
}
// dat.GUI mutates before invoking callbacks: restore invalid edits immediately.
function validated_number_control(folder, object, key, validate, changed, finish = false, bounds = []) {
    var previous = object[key];
    // Set ranges before callbacks: dat.GUI can replace boxes with sliders when
    // bounds are added later, dropping handlers attached to the original box.
    var control = folder.add(object, key, ...bounds);
    var accepted = true;
    control.onChange(function (value) {
        let validated;
        try {
            validated = validate(value);
        }
        catch (error) {
            accepted = false;
            object[key] = previous;
            control.updateDisplay();
            report_worker_error(error instanceof Error ? error.message : String(error));
            return;
        }
        accepted = true;
        previous = validated;
        if (!finish)
            changed();
    });
    if (finish)
        control.onFinishChange(function () { if (accepted)
            changed(); });
    return control;
}
// Keep resize/lifecycle adaptation in application code; the vendor is pristine.
const gui_resize_cleanup = new WeakMap();
// dat.GUI temporarily adds a pixel during construction, then removes it in a
// timer. Preserve user widths separately so synchronous rebuilds do not drift.
const gui_resize_width = new WeakMap();
function install_gui_resize(gui, anchor, width) {
    const handle = document.createElement('div');
    handle.className = 'gui_resize_handle';
    handle.dataset.anchor = anchor;
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', anchor === 'left' ? 'Resize settings menu' : 'Resize transforms menu');
    const direction = anchor === 'left' ? 1 : -1;
    let drag = null;
    function resize(width) {
        const maximum = Math.max(1, window.innerWidth - shape_params.editor_width);
        gui.width = Math.max(Math.min(180, maximum), Math.min(maximum, width));
        gui_resize_width.set(gui, gui.width);
        gui.onResize();
        handle.setAttribute('aria-valuenow', String(gui.width));
    }
    function finish() {
        if (!drag)
            return;
        const pointer = drag.pointer;
        drag = null;
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        window.removeEventListener('blur', finish);
        if (handle.hasPointerCapture(pointer))
            handle.releasePointerCapture(pointer);
    }
    function down(event) {
        if (event.button !== 0 || drag)
            return;
        event.preventDefault();
        event.stopPropagation();
        drag = { pointer: event.pointerId, x: event.clientX, width: gui_resize_width.get(gui) ?? gui.width };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
        window.addEventListener('blur', finish);
        handle.setPointerCapture(event.pointerId);
    }
    function move(event) {
        if (drag && event.pointerId === drag.pointer)
            resize(drag.width + direction * (event.clientX - drag.x));
    }
    function up(event) { if (drag && event.pointerId === drag.pointer)
        finish(); }
    function key(event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
            return;
        event.preventDefault();
        event.stopPropagation();
        resize(gui.width + direction * (event.key === 'ArrowRight' ? 10 : -10));
    }
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('lostpointercapture', finish);
    handle.addEventListener('keydown', key);
    gui.domElement.appendChild(handle);
    gui_resize_width.set(gui, width);
    handle.setAttribute('aria-valuenow', String(width));
    gui_resize_cleanup.set(gui, () => {
        finish();
        handle.removeEventListener('pointerdown', down);
        handle.removeEventListener('lostpointercapture', finish);
        handle.removeEventListener('keydown', key);
        handle.remove();
    });
}
function destroy_gui(gui) {
    gui_resize_cleanup.get(gui)?.();
    gui_resize_cleanup.delete(gui);
    gui_resize_width.delete(gui);
    function stop_listening(folder) {
        folder.__listening.length = 0;
        Object.values(folder.__folders).forEach(stop_listening);
    }
    // End any active numeric/color/panel drag before removing its controls.
    window.dispatchEvent(new MouseEvent('mouseup'));
    stop_listening(gui);
    gui.destroy();
}
function build_left_gui() {
    const width = typeof left_gui === 'undefined' ? 245 : gui_resize_width.get(left_gui) ?? left_gui.width;
    if (typeof left_gui == 'undefined') {
        // Default state.
        var closed_state = { Shape: false, Camera: true, Material: true };
    }
    else {
        var closed_state = { Shape: gui_folder(left_gui, 'Shape').closed, Camera: gui_folder(left_gui, 'Camera').closed, Material: gui_folder(left_gui, 'Material').closed };
        destroy_gui(left_gui);
    }
    left_gui = new dat.GUI({ hideable: false, resizable: false, width });
    left_gui.domElement.id = 'left_gui';
    shape_folder(left_gui);
    gui_folder(left_gui, 'Shape').closed = closed_state.Shape;
    camera_folder(left_gui);
    gui_folder(left_gui, 'Camera').closed = closed_state.Camera;
    material_folder(left_gui);
    gui_folder(left_gui, 'Material').closed = closed_state.Material;
    left_gui.__closeButton.style.position = 'fixed';
    left_gui.__closeButton.style.left = '-10000px';
    install_gui_resize(left_gui, 'left', width);
}
function update_coeff() {
    set_scalar_field_dirty();
    while (shape_params.coeff.length < shape_params.coeff_count) {
        shape_params.coeff.push(cached_coeff[shape_params.coeff.length] ?? 0);
    }
    while (shape_params.coeff_count < shape_params.coeff.length) {
        cached_coeff[shape_params.coeff.length - 1] = shape_params.coeff.pop(); // Loop proves nonempty.
    }
    var c = gui_folder(gui_folder(left_gui, 'Shape'), 'Coefficients').closed;
    gui_folder(gui_folder(left_gui, 'Shape'), 'Coefficients').close();
    gui_folder(left_gui, 'Shape').removeFolder(gui_folder(gui_folder(left_gui, 'Shape'), 'Coefficients'));
    gui_folder(left_gui, 'Shape').onResize();
    var sub_folder = gui_folder(left_gui, 'Shape').addFolder('Coefficients');
    for (var i = 0; i < shape_params.coeff_count; i++) {
        sub_folder.add(shape_params.coeff, i).onChange(set_scalar_field_dirty);
    }
    if (!c || typeof c == 'undefined') {
        sub_folder.open();
    }
    else {
        sub_folder.close();
    }
}
function dimensions_changed() {
    try {
        var next_stack = normalized_transform_stack(transforms, shape_params.dimensions, false);
    }
    catch (error) {
        shape_params.dimensions = n;
        report_worker_error(error instanceof Error ? error.message : String(error));
        build_left_gui();
        return;
    }
    n = shape_params.dimensions;
    transforms = next_stack;
    reset_orientation();
    reset_worker(shape_params.resolution);
}
function shape_folder(g) {
    var folder = g.addFolder('Shape');
    folder.add(shape_params, 'editor_width').min(0).max(window.innerWidth * 0.5 /* - Math.min(245, 2*parseInt(left_gui.domElement.style.width)) */).step(1).onFinishChange(update_editor);
    validated_number_control(folder, shape_params, 'resolution', require_resolution, set_size_dirty, true, [2, 65, 1]);
    folder.add(shape_params, 'reset').name('Abort').onChange(reset_worker10);
    folder.add(shape_params, 'memory_overuse').min(0).max(1).step(0.01);
    folder.add(shape_params, 'interpolate').onChange(set_mesh_dirty);
    folder.add(shape_params, 'iso').onChange(set_mesh_dirty);
    folder.add(shape_params, 'dimensions').min(3).max(32).step(1).onFinishChange(dimensions_changed);
    folder.add(shape_params, 'coeff_count').min(1).max(shape_params.max_coeff_count).step(1).onChange(update_coeff);
    var sub_folder = folder.addFolder('Coefficients');
    for (var i = 0; i < shape_params.coeff_count; i++) {
        sub_folder.add(shape_params.coeff, i).onChange(set_scalar_field_dirty);
    }
    sub_folder.open();
}
function camera_folder(g) {
    var folder = g.addFolder('Camera');
    folder.add(camera_params, 'perspective').onChange(change_camera);
    if (camera_params.perspective) {
        folder.add(camera_params, 'fov').min(0.05).max(179.95).onChange(make_camera);
    }
    else {
        folder.add(camera_params, 'scale').min(0.05).onChange(make_camera);
    }
    folder.add(camera_params, 'radius').min(0).max(10).step(0.01);
    folder.add(camera_params, 'speed').min(0).max(10).step(0.01);
    folder.add(camera_params, 'axes');
    // A native RGB picker avoids the upstream ColorController's retained global
    // mouseup closure while preserving a simple background-color control.
    var background = folder.add(camera_params, 'background').onChange(update_background).listen();
    background.__input.type = 'color';
    background.__input.addEventListener('input', function () { background.setValue(background.__input.value); });
    folder.add(camera_params, 'fps').onChange(update_stats);
}
function toggle_normals() {
    set_mesh_dirty();
    update_material();
}
function material_folder(g) {
    var folder = g.addFolder('Material');
    folder.add(material_params, 'calc_normals').onChange(toggle_normals);
    folder.add(material_params, 'material', { Basic: 0, Depth: 1, /*Face:2,*/ Lambert: 3, Normals: 4, Phong: 5 }).onChange(update_material);
    folder.add(material_params, 'blending', { None: THREE.NoBlending, Standard: THREE.NormalBlending, Additive: THREE.AdditiveBlending, Subtractive: THREE.SubtractiveBlending, Multiplicative: THREE.MultiplyBlending, Custom: THREE.CustomBlending }).onChange(update_material);
    folder.add(material_params, 'side', { Front: THREE.FrontSide, Back: THREE.BackSide, Both: THREE.DoubleSide }).onChange(update_material);
    if (renderer.supports_uint32_indices !== false)
        folder.add(material_params, 'wireframe').onChange(update_material);
    folder.add(material_params, 'opacity').min(0).max(1).step(0.01).onChange(update_material);
    folder.add(material_params, 'depth_test').onChange(update_material);
    folder.add(material_params, 'depth_write').onChange(update_material);
    folder.add(material_params, 'equation', { Add: THREE.AddEquation, Subtract: THREE.SubtractEquation, ReverseSubtract: THREE.ReverseSubtractEquation, Min: THREE.MinEquation, Max: THREE.MaxEquation }).onChange(update_material);
}
// /////////////////////////////
function build_right_gui() {
    const width = typeof right_gui === 'undefined' ? 245 : gui_resize_width.get(right_gui) ?? right_gui.width;
    if (typeof right_gui == 'undefined') {
        var closed_state = { Transforms: true };
    }
    else {
        //for (obj in right_gui.__folders) { ... }
        var closed_state = { Transforms: gui_folder(right_gui, 'Transforms').closed };
        destroy_gui(right_gui);
    }
    right_gui = new dat.GUI({ hideable: false, resizable: false, width });
    right_gui.domElement.id = 'right_gui';
    install_gui_resize(right_gui, 'right', width);
    validated_number_control(right_gui, transform_params, 'zoom', require_zoom, set_coords_dirty, false, [0.000001]);
    transforms_folder(right_gui);
    gui_folder(right_gui, 'Transforms').closed = closed_state.Transforms;
    for (var i = 0; i < transforms.length; i++) {
        const current = transforms[i]; // Loop bounds prove this stack entry exists.
        let folder;
        switch (current.type) {
            case "0": // EULER ROTATION
                folder = right_gui.addFolder((i + 1) + ' Euler Rotation');
                folder.add(current, 'type', { Rotation: 0, Scaling: 1, Translation: 2, Shear: 3 }).onChange(update_transform_type);
                folder.add(current, 'axis1').min(0).max(n - 1).step(1).onChange(set_coords_dirty);
                folder.add(current, 'axis2').min(0).max(n - 1).step(1).onChange(set_coords_dirty);
                folder.add(current, 'degrees').min(-180).max(180).onChange(set_coords_dirty);
                break;
            case "1": // SCALE
                folder = right_gui.addFolder((i + 1) + ' Scale');
                folder.add(current, 'type', { Rotation: 0, Scaling: 1, Translation: 2, Shear: 3 }).onChange(update_transform_type);
                for (var k = 0; k < n; k++)
                    validated_number_control(folder, current.s, k, require_scale, set_coords_dirty, false, [-Infinity]);
                break;
            case "2": // TRANSLATE
                folder = right_gui.addFolder((i + 1) + ' Translation');
                folder.add(current, 'type', { Rotation: 0, Scaling: 1, Translation: 2, Shear: 3 }).onChange(update_transform_type);
                for (var k = 0; k < n; k++)
                    folder.add(current.d, k, current.d[k]).min(-Infinity).name('Dimension ' + (k + 1).toString()).onChange(set_coords_dirty);
                break;
            case "3": // SHEAR
                folder = right_gui.addFolder((i + 1) + ' Shear');
                folder.add(current, 'type', { Rotation: 0, Scaling: 1, Translation: 2, Shear: 3 }).onChange(update_transform_type);
                folder.add(current, 'row').min(0).max(n - 1).step(1).onChange(set_coords_dirty);
                folder.add(current, 'col').min(0).max(n - 1).step(1).onChange(set_coords_dirty);
                folder.add(current, 'shear').onChange(set_coords_dirty);
                break;
            default: // error!
                throw new Error('Invalid transform type');
        }
        if (i == transforms.length - 1) {
            folder.open();
        }
    }
    adjust_right_gui();
}
function transforms_folder(g) {
    var folder = g.addFolder('Transforms');
    folder.add(transform_params, 'invert_order').onChange(invert_order);
    folder.add(transform_params, 'push_transform').onChange(push_transform);
    folder.add(transform_params, 'pop_transform').onChange(pop_transform);
    folder.add(transform_params, 'apply_transforms').onChange(apply_transforms);
    folder.add(transform_params, 'pop_all_on_apply');
    folder.add(transform_params, 'reset_orientation').onChange(reset_orientation);
    folder.add(transform_params, 'pop_all_transforms').onChange(pop_all_transforms);
}
function adjust_right_gui() {
    right_gui.domElement.style.position = 'fixed';
    right_gui.domElement.style.left = 'auto';
    right_gui.domElement.style.right = '0px';
    right_gui.domElement.style.top = '0px';
    right_gui.domElement.style.marginRight = '0px';
    right_gui.domElement.style.height = (window.innerHeight - 50).toString() + 'px';
}
// /////////////////////////////
function build_gui() {
    build_left_gui();
    build_right_gui();
    update_editor();
}
