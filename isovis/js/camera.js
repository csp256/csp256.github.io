"use strict";
// Generated browser output: edit src/camera.ts, then run `just build`.
var camera;
var controls;
var original_camera_position;
var previous_camera_versor;
var previous_camera_normal;
var previous_time;
var wobble_time;
var window_resize = null;
var stats;
function camera_wobble() {
    if (camera_params.wobble) {
        var t = new Date().getTime();
        wobble_time = wobble_time + (t - previous_time) * camera_params.speed / 2000;
        previous_time = t;
        var l = camera.position.length();
        var r = camera_params.radius * l * 0.05;
        var s = Math.sin(wobble_time) * r;
        var c = Math.cos(wobble_time) * r;
        var camera_versor = camera.position.clone().normalize();
        var quaternion = new THREE.Quaternion().setFromUnitVectors(camera_versor, previous_camera_versor.normalize());
        var matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
        previous_camera_normal.applyMatrix4(matrix);
        original_camera_position.copy(camera.position.clone());
        var a = previous_camera_normal.clone().sub(camera_versor.multiplyScalar(previous_camera_normal.dot(camera_versor))).normalize(); // Gram-Schmidt
        previous_camera_normal = a.clone();
        var b = a.clone();
        b.cross(camera.position).normalize();
        camera.position.addScaledVector(a, s).addScaledVector(b, c).normalize().multiplyScalar(l);
        camera.lookAt(new THREE.Vector3());
    }
}
function camera_unwobble() {
    if (camera_params.wobble) {
        camera.position.copy(original_camera_position);
    }
    previous_camera_versor.copy(camera.position);
}
function make_camera() {
    var target = typeof controls === 'undefined' ? new THREE.Vector3() : controls.target.clone();
    var up = typeof camera === 'undefined' ? new THREE.Vector3(0, 1, 0) : camera.up.clone();
    if (typeof camera == 'undefined') {
        var pos = new THREE.Vector3(15, 15, 15);
        original_camera_position = pos.clone();
        previous_camera_versor = pos.clone().normalize();
        previous_camera_normal = pos.clone();
        previous_camera_normal.y = -previous_camera_normal.y;
        previous_camera_normal.normalize();
        previous_time = new Date().getTime();
        wobble_time = 0;
        window_resize = null;
    }
    else {
        window_resize?.stop();
        var pos = camera.position.clone();
    }
    var screen_width = Math.max(1, window.innerWidth - shape_params.editor_width), screen_height = Math.max(1, window.innerHeight);
    var aspect = screen_width / screen_height, near = 0.1, far = 20000000;
    if (camera_params.perspective) {
        camera = new THREE.PerspectiveCamera(camera_params.fov, aspect, near, far);
    }
    else {
        var s = Math.min(screen_width, screen_height) * camera_params.scale / 10;
        camera = new THREE.OrthographicCamera(screen_width / -s, screen_width / s, screen_height / s, screen_height / -s, -500, 1000);
    }
    camera.position.copy(pos);
    camera.up.copy(up);
    camera.lookAt(target);
    if (typeof controls != 'undefined')
        controls.dispose();
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.update();
    controls.listenToKeyEvents(window);
    // Application-owned adapter: the copied helper still calls legacy updateEditor.
    window.addEventListener('resize', update_editor, false);
    window_resize = { stop: function () { window.removeEventListener('resize', update_editor, false); } };
    if (typeof bind_autosave_controls === 'function')
        bind_autosave_controls();
}
function change_camera() {
    make_camera();
    build_left_gui();
    update_editor();
}
function update_background() {
    renderer.setClearColor(camera_params.background, 1);
    // Preserve the historical expando rather than changing page styling here.
    const legacy_document = document;
    legacy_document.bgcolor = camera_params.background;
}
function update_stats() {
    if (typeof stats == 'undefined') {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        stats.domElement.style.right = '0px';
        stats.domElement.style.zIndex = '0';
        stats.domElement.id = "stats";
        container.appendChild(stats.domElement);
    }
    if (camera_params.fps) {
        stats.domElement.style.zIndex = '0';
    }
    else {
        stats.domElement.style.zIndex = '-10';
    }
}
