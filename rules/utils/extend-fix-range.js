'use strict';

/**
Extend fix range to prevent changes from other rules
https://github.com/eslint/eslint/pull/13748/files#diff-c692f3fde09eda7c89f1802c908511a3fb59f5d207fe95eb009cb52e46a99e84R348
*/
function * extendFixRange(range = []) {
	const [start = 0, end = Infinity] = range;
	yield {range: [start, start], text: ''};
	yield {range: [end, end], text: ''};
}

module.exports = extendFixRange;
