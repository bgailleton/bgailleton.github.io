+++
title = "Tectonic Geomorphology"
date = 2025-02-22
summary = "Unraveling tectonics from the shape of the topography"
tags = ["geomorphology", "tectonics", "field-notes"]
weight = 15
+++

One of my primary research goal is to quantify tectonics from the shape of the topography.

## Fluvial metrics: the many processes hidden in channel steepness

One of the main metrics we use in tectonics geomorphology is the channel steepness:

$$
k_{s} = \frac{\partial z}{\partial x} A^{-\theta}
$$

where $\frac{\partial z}{\partial x}$ is the topographic gradient, $A$ the drainage area, and $\theta$ the concavity index. To compare two $k_s$ values, $\theta$ must be fixed to a reference value $\theta_{ref}$.

Spatial variations of this proxy can reveal changes in fluvial behaviour. It can reflect increases or decreases in erosion rates (if surface uplift is steady), lithologic variations, climatic gradients, or even shifts in erosion/transport regime.

### $k_{sn}$ from topography: implications and quantifications

To calculate $k_{sn}$ from topography, one must consider two aspects: 
- the parametrisation and quantification of $\theta_{ref}$
- the numerical method used to compute $k_{sn}$

During my PhD, the LSD research group and myself published a series of papers on these topics: methods to calculate $\theta_{ref}$ and $k_{sn}$ ([MAM2014](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2013JF002981), [MCG2018](https://esurf.copernicus.org/articles/6/505/2018/), [GMC2019](https://esurf.copernicus.org/articles/7/211/2019/)) and theoretical implications for interpreting poorly constrained topographic analyses at global scale or when coupled with landscape evolution models ([GMF2021](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2020JF006060), [SMG2024](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2023JF007553)).

### Unravelling surface processes from fluvial morphology

I applied these methods to quantify tectonic activity:
- disentangling lithologic contrasts from variations in surface uplift in the Carpathians mountain range ([GSM2021](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2020JF005970)) and in the Pyrenees ([BSG2019](https://www.sciencedirect.com/science/article/abs/pii/S0012821X19302389), [BSG2021](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2020GL092210))
- extracting climatic imprints in the Andes ([HGK2021](https://onlinelibrary.wiley.com/doi/full/10.1002/esp.5075)) and Mongolia ([vNG2020](https://www.sciencedirect.com/science/article/abs/pii/S0169555X20303032))
- investigating post-earthquake landscape response in Nepal ([GSA2024](https://esurf.copernicus.org/articles/12/135/2024/))
- identifying morphological signatures of megathrust locking in subduction zones ([OOJ2024](https://www.science.org/doi/10.1126/sciadv.adl4286))

## Next challenges

I am still working on that subject, for example by comparing $k_{sn}$ values in the Carpathians with Cosmogenic Nuclides data I acquired and processed. But the next challenges lie in moving toward methods adapted to the rise of high-resolution DEMs derived from LiDAR or satellite photogrammetry. The reliance of $k_{sn}$ on drainage area makes it poorly suited to very high resolutions where rivers span multiple pixels and where variations in width, flow depth, and velocity fields matter.

See my research project about [`hydrodynamics and morphodynamics at large scales`]("/my-research/large-scale-hydro-morphodynamics/")!
