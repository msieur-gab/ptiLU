/* Turns a sentence into a vector, off the main thread, for the engine's "by meaning" step.
   transformers.js 2.17.2 and all-MiniLM-L6-v2 (8-bit), both served from this site, never from a CDN.
   The pattern of my-agent's nlu.worker.js and brainboard's embed.worker.js.
     { id, type: 'load' }        → { id, ok }
     { id, type: 'embed', text } → { id, ok, vec: Float32Array(384), ms }   (on failure: { id, ok: false, error }) */
let pipe = null, loading = null;
function load() {
  if (pipe) return Promise.resolve(pipe);
  if (!loading) loading = (async () => {
    const lib = await import(new URL('vendor/transformers.min.js', self.location.href).href);
    lib.env.allowRemoteModels = false;
    lib.env.allowLocalModels = true;
    lib.env.localModelPath = new URL('models/', self.location.href).href;
    lib.env.backends.onnx.wasm.wasmPaths = new URL('vendor/', self.location.href).href;
    lib.env.backends.onnx.wasm.numThreads = 1;
    pipe = await lib.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    return pipe;
  })();
  return loading;
}
self.onmessage = async e => {
  const { id, type, text } = e.data;
  try {
    const p = await load();
    if (type === 'load') return self.postMessage({ id, ok: true });
    const t0 = performance.now();
    const out = await p([text], { pooling: 'mean', normalize: true });
    self.postMessage({ id, ok: true, vec: out.data.slice(0, out.dims[1]), ms: Math.round(performance.now() - t0) });
  } catch (err) { self.postMessage({ id, ok: false, error: String((err && err.message) || err) }); }
};
