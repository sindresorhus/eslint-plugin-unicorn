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
		return combinations.reduceRight((combination, items) => {
			const {length} = items;
			const index = indexRemaining % length;
			indexRemaining = (indexRemaining - index) / length;
			return [items[index], ...combination];
		}, []);
	});

	return {
		total,
		samples
	};
};
