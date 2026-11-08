# WebGL1 compatibility renderer: Three.js r162

r162 is the last upstream release supporting WebGL1. It is an older, unsupported
compatibility dependency, not the primary renderer. Normal startup uses r187.
This build and its matching controls are loaded only when WebGL2 is unavailable.

Pinned commit: `ef80ac74e6716a50104a57d8add6c8a950bff8d7` (release r162).
The module, OrbitControls and MIT license are byte-for-byte upstream files.
`upstream.json` records immutable source URLs and SHA-256 hashes, checked offline.
Git attributes preserve their bytes on Windows and fold the vendored JS diff.

The import-map scope in `isovis.html` makes these controls use this exact engine,
not the default r187 engine. No upstream sources are patched. App adaptations,
capability checks and the warning banner are in first-party code.
See `docs/webgl_fallback.md` for limitations and verification.
