'use strict';

const getTotal = combinations => {
	let total = 1;
	for (const {length} of combinations) {
		total *= length;
	}

	return total;
};

module.exports = (combinations, length = Infinity) => {
	const total = getTotal(combinations);

	const samples = Array.from({length: Math.min(total, length)}, (_, sampleIndex) => {
		let indexRemaining = sampleIndex;
		let result = [];

		for (const items of combinations) {
			const {length} = items;
			const index = indexRemaining % length;
			indexRemaining = (indexRemaining - index) / length;
			result = [...result, items[index]];
		}

		return result;
	});

	return {
		total,
		samples
	};
};
