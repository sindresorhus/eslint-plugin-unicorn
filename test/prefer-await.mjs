import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'promise.then',
		'promise.catch',
		'then(() => {})',

		// Not checking
		'promise["catch"](() => {})',
	],
	invalid: [
		'promise.then(() => {})',
		'promise.then(foo)',
		'promise.then(null, () => {})',
		'promise.then(null, foo)',
		'promise.catch(() => {})',
		'promise.catch(foo)',
		'promise.finally(() => {})',
		'promise.finally(foo)',
	],
});
