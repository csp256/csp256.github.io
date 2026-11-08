"use strict";
// Generated browser output: edit src/isovis.ts, then run `just build`.
var renderer;
var container;
var worker_source_string;
var vertex_buffer, face_buffer, normal_buffer;
var meshes;
var my_material;
var lights;
var scene_positions;
var quadrances, rendered, render_order;
var scene;
var scenes;
var transforms;
var base_orientation;
var size_dirty = false, coords_dirty = false, scalar_field_dirty = false, mesh_dirty = false;
var waiting_for_next_frame = false, making_gif = false, done_with_gif = true;
var start_frame = 0;
function init(renderer_context, initial_resolution) {
    renderer = create_renderer(renderer_context);
    worker_source_string = gather_worker_resource('default_field_source') + gather_worker_resource('worker_protocol') + gather_worker_resource('worker') + gather_worker_resource('marching_cubes');
    vertex_buffer = make_octants(() => new ArrayBuffer(4));
    face_buffer = make_octants(() => new ArrayBuffer(4));
    normal_buffer = make_octants(() => new ArrayBuffer(4));
    meshes = make_octants(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(0), 1));
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(0), 3));
        return new THREE.Mesh(geometry);
    });
    update_material();
    init_editor();
    init_workers();
    renderer.autoClear = false;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container = require_html_element('three_js');
    container.appendChild(renderer.domElement);
    waiting_for_next_frame = making_gif = false;
    done_with_gif = true;
    start_frame = 0;
    const light_colors = [0xff0000, 0x00ff00, 0x0000ff, 0xff0000, 0x00ff00, 0x0000ff, 0xaaaaaa, 0xaaaaaa];
    const positions = [[15, 0, 0], [0, 15, 0], [0, 0, 15], [-15, 0, 0], [0, -15, 0], [0, 0, -15], [0, 0, 0], [0, 0, 0]];
    lights = make_octants(octant => {
        const light = new THREE.PointLight(light_colors[octant]);
        light.position.set(...positions[octant]);
        // Legacy constant-distance lighting; compensate the modern BRDF.
        light.decay = 0;
        light.intensity = Math.PI;
        return light;
    });
    scene_positions = make_octants(octant => new THREE.Vector3(octant & 1 ? -5 : 5, octant & 2 ? -5 : 5, octant & 4 ? -5 : 5));
    quadrances = make_octants(() => 0);
    rendered = make_octants(() => false);
    render_order = make_octants(octant => octant);
    scene = new THREE.Scene();
    scene.add(new THREE.AxesHelper(10));
    const initial_transform = plain_transform();
    initial_transform.axis2 = 3;
    initial_transform.degrees = 24;
    transforms = [initial_transform];
    base_orientation = numeric.identity(n + 1);
    size_dirty = coords_dirty = scalar_field_dirty = mesh_dirty = false;
    reset_scenes();
    reset_worker(initial_resolution === undefined ? get_url_resolution(shape_params.resolution) : initial_resolution);
    update_stats();
    update_background();
}
function set_size_dirty(_value) { size_dirty = true; }
function set_coords_dirty(_value) { coords_dirty = true; }
function set_scalar_field_dirty(_value) { scalar_field_dirty = true; }
function set_mesh_dirty(_value) { mesh_dirty = true; }
function update_transform_type(_value) { coords_dirty = true; build_gui(); }
function reset_scenes() {
    if (typeof scenes !== 'undefined' && scenes.length === 8)
        return;
    scenes = make_octants(octant => {
        const target = new THREE.Scene();
        for (const light of lights)
            target.add(light.clone());
        target.add(meshes[octant]);
        return target;
    });
}
function update_scene_mesh(octant, mesh) {
    const target = scenes[octant];
    // Lights are permanent; only the previous surface belongs to this slot.
    for (const child of [...target.children])
        if (child instanceof THREE.Mesh)
            target.remove(child);
    target.add(mesh);
}
function renderer_enum(value, allowed) {
    const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    const accepted = allowed.find(item => item === number);
    if (accepted === undefined)
        throw new Error('Invalid material setting');
    return accepted;
}
function update_material() {
    const old_material = typeof my_material === 'undefined' ? null : my_material;
    switch (renderer_enum(material_params.material, [0, 1, 3, 4, 5])) {
        case 0:
            my_material = new THREE.MeshBasicMaterial();
            break;
        case 1:
            my_material = create_depth_display_material();
            break;
        case 3:
            my_material = new THREE.MeshLambertMaterial();
            break;
        case 4:
            my_material = new THREE.MeshNormalMaterial();
            break;
        case 5:
            my_material = new THREE.MeshPhongMaterial();
            break;
    }
    my_material.transparent = true;
    my_material.side = renderer_enum(material_params.side, [THREE.FrontSide, THREE.BackSide, THREE.DoubleSide]);
    my_material.opacity = material_params.opacity;
    my_material.wireframe = material_params.wireframe;
    if (typeof renderer !== 'undefined' && renderer.supports_uint32_indices === false)
        my_material.wireframe = material_params.wireframe = false;
    my_material.blending = renderer_enum(material_params.blending, [THREE.NoBlending, THREE.NormalBlending, THREE.AdditiveBlending, THREE.SubtractiveBlending, THREE.MultiplyBlending, THREE.CustomBlending]);
    // Legacy 0 means AddEquation, as in the existing session validator. Do not
    // pass an invalid GL equation (or dat.GUI's string enums) to the renderer.
    my_material.blendEquation = renderer_enum(Number(material_params.equation) === 0 ? THREE.AddEquation : material_params.equation, [THREE.AddEquation, THREE.SubtractEquation, THREE.ReverseSubtractEquation, THREE.MinEquation, THREE.MaxEquation]);
    my_material.depthTest = material_params.depth_test;
    my_material.depthWrite = material_params.depth_write;
    for (const mesh of meshes)
        mesh.material = my_material;
    old_material?.dispose();
}
function animate() {
    camera_wobble();
    render();
    if (making_gif && done_with_gif)
        stop_gif();
    else if (making_gif && !waiting_for_any_web_worker())
        schedule_gif_capture();
    camera_unwobble();
    update();
    requestAnimationFrame(animate);
}
function update() {
    controls.update();
    stats.update();
    if (!making_gif) {
        const request = size_dirty ? 'init' : coords_dirty ? 'coords' : scalar_field_dirty ? 'scalar_field' : mesh_dirty ? 'geometry' : null;
        if (request && talk_to_worker(request))
            size_dirty = coords_dirty = scalar_field_dirty = mesh_dirty = false;
    }
}
function render() {
    renderer.clear();
    for (const octant of octant_indices) {
        quadrances[octant] = camera.position.distanceToSquared(scene_positions[octant]);
        rendered[octant] = false;
    }
    for (const slot of octant_indices) {
        let max_quadrance = Number.NEGATIVE_INFINITY;
        let furthest_octant = null;
        for (const candidate of octant_indices) {
            if (!rendered[candidate] && quadrances[candidate] > max_quadrance) {
                max_quadrance = quadrances[candidate];
                furthest_octant = candidate;
            }
        }
        if (furthest_octant === null)
            throw new Error('Invalid camera/render distances');
        rendered[furthest_octant] = true;
        render_order[slot] = furthest_octant;
    }
    for (const octant of render_order)
        renderer.render(scenes[octant], camera);
    renderer.clearDepth();
    if (camera_params.axes)
        renderer.render(scene, camera);
}
