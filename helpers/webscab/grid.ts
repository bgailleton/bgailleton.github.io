/** Helper class for (row, col) representation */
class RowCol {
    row: u32;
    col: u32;

    constructor(row: u32, col: u32) {
        this.row = row;
        this.col = col;
    }
}

// Define a geometry class for handling the grid
class GridGeo {
    nx: u32; // Number of columns
    ny: u32; // Number of rows
    dx: f32; // Cell size

    constructor(nx: u32, ny: u32, dx: f32) {
        this.nx = nx;
        this.ny = ny;
        this.dx = dx;
    }

    /** Convert (row, col) to 1D index */
    toIndex(row: u32, col: u32): u32 {
        return row * this.nx + col;
    }

    /** Convert 1D index to (row, col) */
    toRowCol(index: u32): RowCol {
        const row = index / this.nx;
        const col = index % this.nx;
        return new RowCol(row as u32, col as u32);
    }

    /** Get neighbours in 1D without boundary checks */
    getD81DNeighbours(index: u32): u32[] {
        const rowCol = this.toRowCol(index);
        return [
            this.toIndex(rowCol.row - 1, rowCol.col - 1), // Top-left
            this.toIndex(rowCol.row - 1, rowCol.col),     // Top
            this.toIndex(rowCol.row - 1, rowCol.col + 1), // Top-right
            this.toIndex(rowCol.row, rowCol.col - 1),     // Left
            this.toIndex(rowCol.row, rowCol.col + 1),     // Right
            this.toIndex(rowCol.row + 1, rowCol.col - 1), // Bottom-left
            this.toIndex(rowCol.row + 1, rowCol.col),     // Bottom
            this.toIndex(rowCol.row + 1, rowCol.col + 1), // Bottom-right
        ];
    }

    /** Get neighbours in 2D without boundary checks */
    getD82DNeighbours(index: u32): RowCol[] {
        const rowCol = this.toRowCol(index);
        return [
            new RowCol(rowCol.row - 1, rowCol.col - 1), // Top-left
            new RowCol(rowCol.row - 1, rowCol.col),     // Top
            new RowCol(rowCol.row - 1, rowCol.col + 1), // Top-right
            new RowCol(rowCol.row, rowCol.col - 1),     // Left
            new RowCol(rowCol.row, rowCol.col + 1),     // Right
            new RowCol(rowCol.row + 1, rowCol.col - 1), // Bottom-left
            new RowCol(rowCol.row + 1, rowCol.col),     // Bottom
            new RowCol(rowCol.row + 1, rowCol.col + 1), // Bottom-right
        ];
    }
}


/** Helper class to represent the result of generateRandomGrid */
class RandomGrid {
    grid: Float32Array;
    geo: GridGeo;

    constructor(grid: Float32Array, geo: GridGeo) {
        this.grid = grid;
        this.geo = geo;
    }
}

// Function to generate a random flattened grid and associated GridGeo
function generateRandomGrid(nx: u32, ny: u32, dx: f32): RandomGrid {
    // Create the GridGeo object
    const geo = new GridGeo(nx, ny, dx);

    // Create a flattened 1D array to represent the grid
    const grid = new Float32Array(nx * ny);

    // Fill the array with random values
    for (let i: u32 = 0; i < u32(grid.length); i++) {
        grid[i] = <f32>Math.random(); // Explicit cast to f32 for AssemblyScript
    }

    // Return the grid and its associated geometry object
    return new RandomGrid(grid, geo);
}

// Copying the array X
const nx:u32 = 1000;
const X = new Float32Array(1000);

export function getLength(): u32{
    return nx;
}

export function setX(dx:f32): void{
    for(let i:u32 = 1; i<nx; i++){
        X[i] = X[i-1]+dx;
    }
}

export function getX(): usize{
    return changetype<usize>(X.buffer);
}


export function sinX(mag : f32) : usize{

    
    const Y = X.slice();

    for (let i:u32 = 0; i<nx; i++){
        Y[i] = Mathf.sin(X[i]/ mag)  ;
    }

    return changetype<usize>(Y.buffer);;

}

