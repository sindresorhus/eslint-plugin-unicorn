import {getTester} from './utils/test.mjs';
import createSimpleArraySearchRuleTestFixtures from './shared/simple-array-search-rule-tests.mjs';

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
