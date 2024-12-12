/** Class representing a (u32, f32) pair */
class Pair {
    key: u32;
    value: f32;

    constructor(key: u32, value: f32) {
        this.key = key;
        this.value = value;
    }
}

/** Priority Queue Implementation for (u32, f32) Pairs */
class PriorityQueue {
    private heap: Array<Pair>; // Internal heap storage
    private size: i32;         // Current size of the heap

    constructor() {
        this.heap = new Array<Pair>();
        this.size = 0;
    }

    /** Add a new (u32, f32) pair into the priority queue */
    push(key: u32, value: f32): void {
        const pair = new Pair(key, value);
        this.heap.push(pair);
        this.size++;
        this.heapifyUp(this.size - 1);
    }

    /** Remove and return the pair with the smallest f32 value */
    pop(): Pair | null {
        if (this.size <= 0) return null;

        const root = this.heap[0];
        this.size--;

        if (this.size > 0) {
            this.heap[0] = this.heap.pop();
            this.heapifyDown(0);
        } else {
            this.heap.pop();
        }

        return root;
    }

    /** Peek at the pair with the smallest f32 value without removing it */
    peek(): Pair | null {
        return this.size > 0 ? this.heap[0] : null;
    }

    /** Get the current size of the priority queue */
    getSize(): i32 {
        return this.size;
    }

    /** Restore heap property upwards */
    private heapifyUp(index: i32): void {
        let current = index;
        while (current > 0) {
            const parent = (current - 1) >> 1; // Parent index
            if (this.heap[current].value >= this.heap[parent].value) break;

            this.swap(current, parent);
            current = parent;
        }
    }

    /** Restore heap property downwards */
    private heapifyDown(index: i32): void {
        let current = index;

        while (true) {
            const left = (current << 1) + 1;
            const right = (current << 1) + 2;
            let smallest = current;

            if (left < this.size && this.heap[left].value < this.heap[smallest].value) {
                smallest = left;
            }
            if (right < this.size && this.heap[right].value < this.heap[smallest].value) {
                smallest = right;
            }
            if (smallest === current) break;

            this.swap(current, smallest);
            current = smallest;
        }
    }

    /** Swap two elements in the heap */
    private swap(i: i32, j: i32): void {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}
