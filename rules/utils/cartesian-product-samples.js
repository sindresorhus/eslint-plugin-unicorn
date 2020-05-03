'use strict';

module.exports = (combinations, length = Infinity) => {
	const total = combinations.reduce((total, {length}) => total * length, 1); // eslint-disable-line unicorn/no-reduce

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
