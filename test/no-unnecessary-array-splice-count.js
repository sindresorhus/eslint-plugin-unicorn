import {getTester} from './utils/test.js';
import {createFixtures} from './shared/no-unnecessary-length-or-infinity-rule-tests.js';

const {test} = getTester(import.meta);

test.snapshot(createFixtures('splice'));
test.snapshot(createFixtures('toSpliced'));
