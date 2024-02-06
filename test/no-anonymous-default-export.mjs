import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'export default function named() {}',
		'export default class named {}',
		'export default []',
		'export default {}',
		'export default 1',
		'export default false',
		'export default 0n',
		// `ClassExpression`s and `FunctionExpression`s are ignored
		'export default (class {})',
		'export default (function {})',
	],
	invalid: [
		'export default function () {}',
		'export default class () {}',
		'export default () => {}',
	],
});
