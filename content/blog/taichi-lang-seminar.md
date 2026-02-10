+++
title = "Taichi Lang Seminar"
date = 2026-02-09T10:00:00-05:00
summary = "I gave a seminar (in French) about Taichi Lang, a Python JIT for versatile GPU computing."
tags = ["taichi", "seminar", "hpc", "scientific-computing"]
draft = false
+++

I gave this seminar for the [GDR Calcul](https://groupe-calcul.cnrs.fr/). You can find the talk, in French, on [Canal U](https://www.canal-u.tv/chaines/groupecalcul/cafe-taichi-lang). It covers the basics and main use cases of Taichi Lang, as well as an application from my own research: accelerating hydrodynamic simulations using GPU processing.

## Taichi Lang in Brief

Created by Yuanming Hu (now CEO of Meshy AI), MIT-licensed, and maintained by both a core team and a growing community of developers, Taichi Lang fills a gap in the GPU programming ecosystem. It provides CUDA/Vulkan-like flexibility when writing GPU kernels, while remaining portable and backend-agnostic, similar to PyTorch or JAX.

Taichi Lang allows you to JIT-compile Python functions into massively parallel kernels and to seamlessly create sparse, SoA/AoS, and CM/RM data structures without modifying the computational kernels.

The documentation is clear and easy to follow. Below is a minimal example:

```python
import taichi as ti

# Setting the backend
ti.init(ti.gpu)  # or cuda, vulkan, metal, cpu

@ti.kernel
def add_weighted_B_to_A(A: ti.template(), B: ti.template(), weights: ti.template()):
    """
    Simple weighted addition of 2D arrays
    """
    for i, j in A:
        A[i, j] = A[i, j] * (1 - weights[i, j]) + B[i, j] * weights[i, j]


import numpy as np

nrows, ncols = 512, 1024
cpu_A = np.random.rand(nrows, ncols).astype(np.float32)
cpu_B = np.random.rand(nrows, ncols).astype(np.float32)
cpu_weights = np.random.rand(nrows, ncols).astype(np.float32)

A = ti.field(ti.f32, shape=(nrows, ncols))
A.from_numpy(cpu_A)

B = ti.field(ti.f32, shape=(nrows, ncols))
B.from_numpy(cpu_B)

weights = ti.field(ti.f32, shape=(nrows, ncols))
weights.from_numpy(cpu_weights)

# First call triggers compilation
add_weighted_B_to_A(A, B, weights)

res = A.to_numpy()
```

{{< polarity-pair >}}
{{< strengths >}}
- Portable
- Much more flexible than PyTorch / TensorFlow / JAX / CuPy (kernel-based vs vector-only)
- Python-based (with limitations)
- Extensive math library
- Very flexible data structures
- Advanced sparse data management
{{< /strengths >}}

{{< weaknesses >}}
- Heavy for large-scale projects
- Implicit memory management (deallocation can be tricky; constant handling can be obscure)
- Reductions are hard to optimize (no explicit control over shared memory)
- Not as fine-grained as CUDA (e.g. persistent kernels are not possible)
{{< /weaknesses >}}
{{< /polarity-pair >}}

## pyfastflow

Taichi Lang is the main engine behind pyfastflow, my GPU toolbox for flow processing. More information is available [here](https://bgailleton.github.io/research-softwares/pyfastflow/).

To use Taichi as a full-fledged framework, I implemented a pool system to handle allocation and deallocation:

```python
Q = pf.pool.taipool.get_tpfield(
    dtype=cte.FLOAT_TYPE_TI,
    shape=(self.nx * self.ny)
)
...
Q.release()
```

See the [implementation !](https://github.com/TopoToolbox/pyfastflow/blob/main/pyfastflow/pool/pool.py)

## Resources

- Taichi Documentation: https://docs.taichi-lang.org/
- Taichi GitHub: https://github.com/taichi-dev/taichi
