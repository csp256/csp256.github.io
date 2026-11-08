"use strict";
// Generated browser output: edit src/runtime.ts, then run `just build`.
// Remaining main-thread startup globals; each other owner declares its own state.
var keyboard = new THREEx.KeyboardState();
var waiting_for_web_worker = make_octants(() => false);
var title = 'IsoVis';
var title_busy = 'IsoVis - Busy';
if (location.protocol === 'file:')
    show_startup_error('Serve this folder over HTTP. Browser ES modules cannot load reliably from file://. See README.md for a one-command local server.');
