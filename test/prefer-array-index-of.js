import {test} from './utils/test.js';
import tests from './shared/simple-array-search-rule-tests'

const {snapshot, typescript} = tests({
	method: 'findIndex',
	replacement: 'indexOf'
});

test.snapshot(snapshot);
test.typescript(typescript);
