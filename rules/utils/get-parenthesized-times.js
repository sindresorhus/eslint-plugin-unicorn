'use strict';
const {isParenthesized} = require('eslint-utils');

const getParenthesizedTimes = (node, sourceCode) => {
	let times = 0;
	while (isParenthesized(times + 1, node, sourceCode)) {
		times++;
	}

	return times;
};

module.exports = getParenthesizedTimes;
