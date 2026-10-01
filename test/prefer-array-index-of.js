import {getTester} from './utils/test.js';
import createSimpleArraySearchRuleTestFixtures from './shared/simple-array-search-rule-tests.js';

const {test} = getTester(import.meta);

const indexOfOverFindIndexFixtures = createSimpleArraySearchRuleTestFixtures({
	method: 'findIndex',
	replacement: 'indexOf',
});

test.snapshot(indexOfOverFindIndexFixtures.snapshot);
test.typescript(indexOfOverFindIndexFixtures.typescript);

const lastIndexOfOverFindLastIndexFixtures = createSimpleArraySearchRuleTestFixtures({
	method: 'findLastIndex',
	replacement: 'lastIndexOf',
});

test.snapshot(lastIndexOfOverFindLastIndexFixtures.snapshot);
test.typescript(lastIndexOfOverFindLastIndexFixtures.typescript);

// Unlike `some()` and `includes()`, both sides use `===`, so a `NaN` search value finds nothing either way
test({
	valid: [],
	invalid: [
		{
			code: 'foo.findIndex(element => element === NaN);',
			output: 'foo.indexOf(NaN);',
			errors: 1,
		},
		{
			code: 'foo.findLastIndex(element => element === NaN);',
			output: 'foo.lastIndexOf(NaN);',
			errors: 1,
		},
	],
});
