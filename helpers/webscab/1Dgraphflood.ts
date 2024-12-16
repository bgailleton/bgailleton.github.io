
const ALPHA : f32 = 5./3.;


class GF1D{
	// ########## scalar args
	nx :      u32;
	dx :      f32;
	S0 :      f32;
	// ########## Arrays
	xs :      Float32Array;
	zs :      Float32Array;
	hs :      Float32Array;
	// ##########

	constructor(){
		this.nx = 0;
		this.dx = 0.;
		this.xs = new Float32Array(1);
		this.zs = new Float32Array(1);
		this.hs = new Float32Array(1);
	}
}

var gf1d = new GF1D();


export function GF1DGetNx():u32{
	return gf1d.nx;
}

export function GF1DGetXs():usize{
	return changetype<usize>(gf1d.xs.buffer);
}

export function GF1DGetZs():usize{
	return changetype<usize>(gf1d.zs.buffer);
}

export function GF1DGetHs():usize{
	return changetype<usize>(gf1d.hs.buffer);
}

export function GF1DGetZHs():usize{

	const ZHs: Float32Array =  new Float32Array(gf1d.nx);
	for(let i:u32 = 0; i<gf1d.nx; i++){
		ZHs[i] = gf1d.hs[i] + gf1d.zs[i];
	}

	return changetype<usize>(ZHs.buffer);
}



export function initGF1D_slope(nx : u32, dx : f32, slope : f32, init_hw : bool) : void{

	gf1d.nx = nx;
	gf1d.dx = dx;
	gf1d.xs = new Float32Array(nx);
	gf1d.zs = new Float32Array(nx);
	if(init_hw){
		gf1d.hs = new Float32Array(nx);
	}
	gf1d.S0 = slope;
	gf1d.xs[0] = 0;
	gf1d.zs[0] = 0;
	gf1d.hs[0] = 0;

	for(let i:u32 = 1; i<gf1d.nx; i++){
		gf1d.xs[i] = gf1d.xs[i-1] + dx;
		gf1d.zs[i] = gf1d.zs[i-1] + dx*slope;
		if(init_hw){
			gf1d.hs[i] = 0;
		}
	}

	gf1d.zs = gf1d.zs.reverse();
	// const temp = gf1d.zs.reverse();
	// for(let i:u32 = 0; i<gf1d.nx; i++){
	// 	gf1d.zs[i] = temp[gf1d.nx - i - 1];
	// }
}

export function GF1DRun(ndt:u32, dt:f32, manning:f32, Qi:f32, W:f32):void{

	for(let tdt:u32 = 0; tdt < ndt; tdt++){

		// First I check the local minima
		for(let i:u32 = gf1d.nx - 1; i>0; i--){

			if(gf1d.zs[i]+ gf1d.hs[i] >= gf1d.zs[i-1] + gf1d.hs[i-1]){

				gf1d.hs[i-1] = (gf1d.zs[i] + gf1d.hs[i] + 1e-3 - gf1d.zs[i-1]);

			}
		}

		var tS:f32 = 0.;
		var Qo:f32 = 0.;

		// Then I run gf
		for(let i:u32 = 0; i<gf1d.nx - 1; i++){
			// get the hydraulic slope
			tS = (gf1d.zs[i]+ gf1d.hs[i] - gf1d.zs[i+1] - gf1d.hs[i+1])/gf1d.dx;
			Qo = W/manning * Mathf.pow(gf1d.hs[i], ALPHA) * Mathf.sqrt(tS);
			gf1d.hs[i] = Mathf.max(gf1d.hs[i] + dt*(Qi - Qo)/(gf1d.dx * W), 0.);
		}

		// get the hydraulic slope
		tS = gf1d.S0;
		Qo = W/manning * Mathf.pow(gf1d.hs[gf1d.nx-1], ALPHA) * Mathf.sqrt(tS);
		gf1d.hs[gf1d.nx-1] = Mathf.max(gf1d.hs[gf1d.nx-1] + dt*(Qi - Qo)/(gf1d.dx * W), 0.);

	}
}

