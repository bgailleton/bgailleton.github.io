import WasmModule from "/widgets/webscab/wasmloadah.js";

let wasmHelper;
let webscab;
let slope = 0.005;
let Qi = 25;
let isRunning = false; // Flag to control the updating function
let animationFrameId;  // To manage requestAnimationFrame cancellation

const plotContainer = document.getElementById("plot-container");
const slopeInput = document.getElementById("slope");
const slopeValue = document.getElementById("slope_value");
const updateBtn = document.getElementById("update-btn");
const QiInput = document.getElementById("Qi");
const QiValue = document.getElementById("Qi-value");
// Qi
// QiValue

// Function to set up and plot the data
function setupPlot() {
    // Initialize the GF1D data in WebAssembly
    webscab.initGF1D_slope(200, 2.0, slope);

    // Retrieve x and y data
    const x = wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx());
    const z = wasmHelper.getF32Arr(webscab.GF1DGetZs(), webscab.GF1DGetNx());
    const zh = wasmHelper.getF32Arr(webscab.GF1DGetZHs(), webscab.GF1DGetNx());

    // Initial Plot Setup
    Plotly.newPlot(plotContainer, [
        {
            x: x, y: z,
            type: 'scatter',
            mode: 'lines',
            name: 'Plot 1',
            line: { color: 'black', width: 2 }
        },
        {
            x: x, y: zh,
            type: 'scatter',
            mode: 'lines',
            name: 'Plot 2',
            line: { color: 'blue', width: 2 }
        }
    ], {
        title: 'GraphFlood 1D',
        xaxis: { title: 'x (m)' },
        yaxis: { title: 'z (m)' }
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
        webscab.GF1DRun(10, 1e-3,0.033, Qi, 3);

        // Retrieve updated y data
        const z = wasmHelper.getF32Arr(webscab.GF1DGetZs(), webscab.GF1DGetNx());
        const zh = wasmHelper.getF32Arr(webscab.GF1DGetZHs(), webscab.GF1DGetNx());

        // Update the plot efficiently using Plotly.react
        Plotly.react(plotContainer, [
            {
                x: wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx()),
                y: z,
                type: 'scatter',
                mode: 'lines',
                name: 'Plot 1',
                line: { color: 'black', width: 2 }
            },
            {
                x: wasmHelper.getF32Arr(webscab.GF1DGetXs(), webscab.GF1DGetNx()),
                y: zh,
                type: 'scatter',
                mode: 'lines',
                name: 'Plot 2',
                line: { color: 'blue', width: 2 }
            }
        ], {
            title: 'GraphFlood 1D',
            xaxis: { title: 'x (m)' },
            yaxis: { title: 'z (m)' }
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

updateBtn.addEventListener("click", () => {
    isRunning = false; // Stop any ongoing updates
    setupPlot();       // Restart with the new slope
});

// Start the script
main();
