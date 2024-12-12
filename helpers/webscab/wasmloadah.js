export default class WasmModule {
    constructor(wasmUrl) {
        this.wasmUrl = wasmUrl;
        this.instance = null;
        this.memory = null;
    }

    // Load the WebAssembly module
    async load() {
        const importObject = {
            env: {
                abort: (msg, file, line, column) =>
                    console.error(`Abort: ${file}:${line}:${column}`),
            },
        };

        const response = await fetch(this.wasmUrl);
        const { instance } = await WebAssembly.instantiateStreaming(response, importObject);

        this.instance = instance.exports;
        this.memory = instance.exports.memory;

        console.log("WebAssembly module loaded successfully!");
    }

    // Get a Float32Array from a pointer and length
    getF32Arr(ptr, length) {
        return new Float32Array(this.memory.buffer, ptr, length);
    }

}
