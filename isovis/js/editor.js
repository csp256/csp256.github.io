"use strict";
// Generated browser output: edit src/editor.ts, then run `just build`.
var code_mirror_div;
var editor_toolbar;
var my_code_mirror;
function require_html_element(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error('Missing application element: ' + id);
    return element;
}
function default_text() {
    return 'function field(x, c, size3, n) {\n' + default_field_body() + '\n}';
}
function before_change_callback(cm, change) {
    if (change.from.line == 0 || change.to.line == cm.lineCount() - 1) {
        change.cancel();
    }
}
function init_editor() {
    code_mirror_div = require_html_element("codemirror");
    const options = {
        value: default_text(),
        mode: "javascript",
        lineNumbers: true,
        matchBrackets: true,
        indentWithTabs: false,
        tabSize: 2,
        indentUnit: 2,
        extraKeys: {
            Tab(cm) { if (cm.somethingSelected())
                cm.indentSelection('add');
            else
                cm.execCommand('insertSoftTab'); },
            'Shift-Tab': 'indentLess',
        },
        lineWrapping: true,
        viewportMargin: Infinity,
    };
    my_code_mirror = CodeMirror(code_mirror_div, options);
    my_code_mirror.on("beforeChange", before_change_callback);
    my_code_mirror.on("blur", function () { ; ; ; }); // For future use..?
    my_code_mirror.setOption("theme", 'pastel-on-dark');
    editor_toolbar = require_html_element('toolbar');
    editor_toolbar.className = 'toolbar';
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    var button_run = document.createElement('button');
    button_run.className = 'button';
    button_run.textContent = 'Update';
    button_run.addEventListener('click', function () {
        talk_to_worker('code');
    }, false);
    editor_toolbar.appendChild(button_run);
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    var button_reset = document.createElement('button');
    button_reset.className = 'button';
    button_reset.textContent = 'Reset';
    button_reset.addEventListener('click', function () {
        my_code_mirror.off("beforeChange", before_change_callback);
        my_code_mirror.setValue(default_text());
        my_code_mirror.refresh();
        talk_to_worker('code');
        my_code_mirror.on("beforeChange", before_change_callback);
    }, false);
    editor_toolbar.appendChild(button_reset);
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    var button_export = document.createElement('button');
    button_export.className = 'button';
    button_export.textContent = 'Export';
    button_export.addEventListener('click', export_session, false);
    editor_toolbar.appendChild(button_export);
    var button_share = document.createElement('button');
    button_share.className = 'button';
    button_share.textContent = 'Share';
    button_share.addEventListener('click', function () { share_session(); });
    editor_toolbar.appendChild(button_share);
    var button_mesh = document.createElement('button');
    button_mesh.className = 'button';
    button_mesh.textContent = 'Mesh';
    button_mesh.addEventListener('click', open_mesh_export);
    editor_toolbar.appendChild(button_mesh);
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    var button = document.createElement('button');
    button.className = 'button';
    button.textContent = 'Import';
    button.addEventListener('click', import_from_json, false);
    editor_toolbar.appendChild(button);
    var button_file = document.createElement('button');
    button_file.className = 'button';
    button_file.textContent = 'Import file';
    button_file.addEventListener('click', choose_mesh_session_file);
    editor_toolbar.appendChild(button_file);
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    var button = document.createElement('button');
    button.className = 'button';
    button.textContent = 'Screenshot';
    button.addEventListener("click", take_screenshot, false);
    editor_toolbar.appendChild(button);
    var button_recovery = document.createElement('button');
    button_recovery.className = 'button';
    button_recovery.textContent = 'Recovery';
    button_recovery.addEventListener('click', open_recovery);
    editor_toolbar.appendChild(button_recovery);
    var autosave_status = document.createElement('span');
    autosave_status.id = 'autosave_status';
    autosave_status.setAttribute('role', 'status');
    autosave_status.style.cssText = 'display:block;height:16px;line-height:16px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    editor_toolbar.appendChild(autosave_status);
    var div = document.createElement('div');
    div.className = 'divider';
    editor_toolbar.appendChild(div);
    // var button = document.createElement('button');
    // button.className = 'button';
    // button.textContent = 'GIF';
    // button.addEventListener("click", start_gif, false);
    // editor_toolbar.appendChild( button );
    init_editor_divider();
}
function update_editor() {
    var width_string = shape_params.editor_width.toString() + 'px';
    editor_toolbar.style.display = code_mirror_div.style.display = shape_params.editor_width === 0 ? 'none' : '';
    editor_toolbar.style.width = width_string;
    code_mirror_div.style.width = width_string;
    code_mirror_div.style.left = '0px';
    code_mirror_div.style.top = ( /*document.getElementById("toolbar").offsetHeight +*/editor_toolbar.getBoundingClientRect().bottom).toString() + 'px';
    // A resize changes projection bounds, not camera pose or control identity.
    if (typeof camera === 'undefined' || camera_params.perspective !== (camera instanceof THREE.PerspectiveCamera))
        make_camera();
    container.style.left = width_string;
    left_gui.domElement.style.left = width_string;
    renderer.domElement.style.width = Math.max(1, window.innerWidth - shape_params.editor_width).toString() + 'px';
    my_code_mirror.setSize(shape_params.editor_width, Math.max(1, window.innerHeight - editor_toolbar.getBoundingClientRect().bottom));
    my_code_mirror.refresh();
    adjust_right_gui();
    const width = Math.max(1, window.innerWidth - shape_params.editor_width), height = Math.max(1, window.innerHeight);
    renderer.setSize(width, height);
    if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.fov = camera_params.fov;
    }
    else {
        const scale = Math.min(width, height) * camera_params.scale / 10;
        camera.left = width / -scale;
        camera.right = width / scale;
        camera.top = height / scale;
        camera.bottom = height / -scale;
    }
    camera.updateProjectionMatrix();
    update_editor_divider();
}
