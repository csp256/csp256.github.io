"use strict";
// Generated browser output: edit src/session_ui.ts, then run `just build`.
let close_session_preview = null;
let session_link_generation = 0;
function session_dialog(title, message, contents, accept_label) {
    close_session_preview?.();
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.style.cssText = 'max-width:720px;width:calc(100vw - 48px);max-height:85vh;box-sizing:border-box;background:#18212b;color:white;padding:20px;border:1px solid #aaa';
        const heading = document.createElement('h2');
        heading.id = 'session_dialog_title';
        dialog.setAttribute('aria-labelledby', heading.id);
        heading.textContent = title;
        const text = document.createElement('p');
        text.textContent = message;
        const preview = document.createElement('textarea');
        preview.readOnly = true;
        preview.value = contents;
        preview.setAttribute('aria-label', title);
        preview.style.cssText = 'display:block;box-sizing:border-box;width:100%;height:220px;margin-bottom:16px';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        const accept = document.createElement('button');
        accept.type = 'button';
        accept.textContent = accept_label;
        let finished = false;
        function finish(value) {
            if (finished)
                return;
            finished = true;
            if (close_session_preview === dismiss)
                close_session_preview = null;
            dialog.close();
            dialog.remove();
            resolve(value);
        }
        function dismiss() { finish(false); }
        cancel.addEventListener('click', dismiss);
        accept.addEventListener('click', () => finish(true));
        dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
        dialog.append(heading, text, preview, cancel, accept);
        document.body.appendChild(dialog);
        close_session_preview = dismiss;
        dialog.showModal();
        cancel.focus(); // Enter/Escape must not silently authorize shared code.
    });
}
async function share_session() {
    try {
        const link = await make_session_link(capture_session(), location.href);
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
        const accept = await session_dialog('Share scene', 'This link contains readable settings and submitted JavaScript, not an encrypted or private upload. Anyone with it can read the scene.' +
            (local ? ' This is a local-server address: recipients must run IsoVis locally on the same port and path.' : ''), link, 'Copy link');
        if (!accept)
            return;
        try {
            if (!navigator.clipboard)
                throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(link);
        }
        catch {
            // Also works on plain HTTP and when clipboard permission is denied.
            window.prompt('Copy this share link:', link);
        }
    }
    catch (error) {
        window.alert(error instanceof Error ? error.message : String(error));
    }
}
async function offer_shared_session() {
    const generation = ++session_link_generation;
    close_session_preview?.();
    if (!location.hash.startsWith('#session='))
        return;
    try {
        const session = await read_session_link(location.hash);
        if (generation !== session_link_generation)
            return;
        const summary = `${session.shape.dimensions} dimensions, resolution ${session.shape.resolution}, ${session.transform.stack.length} transforms.\n\n`;
        const accepted = await session_dialog('Load shared scene?', 'This will replace the current scene and run JavaScript in workers. Only load code you trust: it can use the network and consume CPU/memory. Cancel leaves the current scene unchanged.', summary + (session.field_source ?? default_field_body()), 'Load and run');
        if (accepted && generation === session_link_generation)
            import_settings(session_json(session));
    }
    catch (error) {
        if (generation === session_link_generation)
            window.alert('Could not load shared scene: ' + (error instanceof Error ? error.message : String(error)));
    }
}
function start_session_links() {
    window.addEventListener('hashchange', () => { void offer_shared_session(); });
    void offer_shared_session();
}
