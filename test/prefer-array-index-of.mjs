import {getTester} from './utils/test.js';
import tests from './shared/simple-array-search-rule-tests.js';

const {test} = getTester(import.meta);

const {snapshot, typescript} = tests({
	method: 'findIndex',
	replacement: 'indexOf'
});

test.snapshot(snapshot);
test.typescript(typescript);
