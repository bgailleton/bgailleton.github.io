export function findMaxF32A(arr){
	let max = -Infinity;
	for (let i = 0; i < arr.length; i++) {
	    if (arr[i] > max) max = arr[i];
	}
	return max;
}