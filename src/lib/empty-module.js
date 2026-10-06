// Empty stand-in for Node built-ins (fs, path) in browser bundles.
// @whereby.com/camera-effects ships Emscripten code with a Node-only branch
// (require("fs")) that never runs in the browser but still has to resolve.
module.exports = {}
