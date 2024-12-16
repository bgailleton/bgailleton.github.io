import WasmModule from "/widgets/webscab/wasmloadah.js";
import * as Utils from "/widgets/webscab/utils.js";

let wasmHelper;
let webscab;
let slope = 0.005;
let Qi = 25;
let manning = 0.033;
let width = 5;
let isRunning = false; // Flag to control the updating function
let animationFrameId;  // To manage requestAnimationFrame cancellation
let initFirst  = true;

const plotContainer = document.getElementById("plot-container");
const slopeInput = document.getElementById("slope");
const slopeValue = document.getElementById("slope_value");
const updateBtn = document.getElementById("update-btn");
const QiInput = document.getElementById("Qi");
const QiValue = document.getElementById("Qi-value");
const manningInput = document.getElementById("manning");
const manningValue = document.getElementById("manning-value");
const widthInput = document.getElementById("width");
const widthValue = document.getElementById("width-value");
// Qi
// QiValue

// Function to set up and plot the data
function setupPlot() {
    // Initialize the GF1D data in WebAssembly
    webscab.initGF1D_slope(1000, 2.0, slope, initFirst);
    initFirst = false;

    // Retrieve x and y data
    const x = wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx());
    const z = wasmHelper.getF32Arr(webscab.GF1DGetZs(), webscab.GF1DGetNx());
    const zh = wasmHelper.getF32Arr(webscab.GF1DGetZHs(), webscab.GF1DGetNx());
    const maxz = Utils.findMaxF32A(z);

    // Initial Plot Setup
    Plotly.newPlot(plotContainer, [
        {
            x: x, y: z,
            type: 'scatter',
            mode: 'lines',
            name: 'Bed Surface',
            line: { color: 'black', width: 2 }
        },
        {
            x: x, y: zh,
            type: 'scatter',
            mode: 'lines',
            name: 'Water surface',
            line: { color: 'blue', width: 2 }
        }
    ], {
        title: 'GraphFlood 1D',
        xaxis: { title: 'x (m)' },
        yaxis: { title: 'z (m)', range: [0, maxz + 5] }
    });

    // Restart the updating function
    startUpdatingPlot();
}

// Function to update the plot in a non-blocking loop
function startUpdatingPlot() {
    if (isRunning) {
        cancelAnimationFrame(animationFrameId); // Stop previous loop
    }
    isRunning = true;

    function update() {
        // Run the update function in WebAssembly
        webscab.GF1DRun(10, 1e-3, manning, Qi, width);

        // Retrieve updated y data
        const z = wasmHelper.getF32Arr(webscab.GF1DGetZs(), webscab.GF1DGetNx());
        const zh = wasmHelper.getF32Arr(webscab.GF1DGetZHs(), webscab.GF1DGetNx());
        const maxz = Utils.findMaxF32A(z);

        // Update the plot efficiently using Plotly.react
        Plotly.react(plotContainer, [
            {
                x: wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx()),
                y: z,
                type: 'scatter',
                mode: 'lines',
                name: 'Topo',
                line: { color: 'black', width: 2 }
            },
            {
                x: wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx()),
                y: zh,
                type: 'scatter',
                mode: 'lines',
                name: 'Flow depth',
                line: { color: 'blue', width: 2 }
            }
        ], {
            title: 'GraphFlood 1D',
            xaxis: { title: 'x (m)' },
            yaxis: { title: 'z (m)', range: [0, maxz + 5] }
        });

        // Continue the loop
        if (isRunning) {
            animationFrameId = requestAnimationFrame(update);
        }
    }

    animationFrameId = requestAnimationFrame(update);
}

// Main function that loads WebAssembly
async function main() {
    wasmHelper = new WasmModule("/widgets/webscab/webscab.wasm");
    await wasmHelper.load();
    webscab = wasmHelper.instance;

    // Initial plot setup
    setupPlot();
}

// Event Listeners
slopeInput.addEventListener("input", () => {
    slope = parseFloat(slopeInput.value);
    slopeValue.textContent = slope.toFixed(3);
});

// Event Listeners
QiInput.addEventListener("input", () => {
    Qi = parseFloat(QiInput.value);
    QiValue.textContent = Qi.toFixed(1);
});

// Event Listeners
manningInput.addEventListener("input", () => {
    manning = parseFloat(manningInput.value);
    manningValue.textContent = manning.toFixed(3);
});

// Event Listeners
widthInput.addEventListener("input", () => {
    width = parseFloat(widthInput.value);
    widthValue.textContent = width.toFixed(1);
});

updateBtn.addEventListener("click", () => {
    isRunning = false; // Stop any ongoing updates
    setupPlot();       // Restart with the new slope
});

// Start the script
main();
