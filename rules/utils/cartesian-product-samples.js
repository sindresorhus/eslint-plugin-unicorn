'use strict';

const getTotal = combinations => {
	let total = 1;
	for (const {length} of combinations) {
		total *= length;
	}

	return total;
};

module.exports = (combinations, length = Number.POSITIVE_INFINITY) => {
	const total = getTotal(combinations);

	const samples = Array.from({length: Math.min(total, length)}, (_, sampleIndex) => {
		let indexRemaining = sampleIndex;
		const combination = [];
		for (let combinationIndex = combinations.length - 1; combinationIndex >= 0; combinationIndex--) {
			const items = combinations[combinationIndex];
			const {length} = items;
			const index = indexRemaining % length;
			indexRemaining = (indexRemaining - index) / length;
			combination.unshift(items[index]);
		}

		return combination;
	});

	return {
		total,
		samples
	};
};
