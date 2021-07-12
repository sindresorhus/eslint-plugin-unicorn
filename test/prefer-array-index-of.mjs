import {getTester} from './utils/test.mjs';
import tests from './shared/simple-array-search-rule-tests.mjs';

const {test} = getTester(import.meta);

const {snapshot, typescript} = tests({
	method: 'findIndex',
	replacement: 'indexOf',
});

test.snapshot(snapshot);
test.typescript(typescript);
