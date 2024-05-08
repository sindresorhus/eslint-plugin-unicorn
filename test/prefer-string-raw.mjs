import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		String.raw`a = '\''`,
		// Cannot use `String.raw`
		String.raw`'a\\b'`,
		String.raw`import foo from "./foo\\bar.js";`,
		String.raw`export {foo} from "./foo\\bar.js";`,
		String.raw`a = {'a\\b': ''}`,
	],
	invalid: [
		String.raw`a = 'a\\b'`,
		String.raw`a = {['a\\b']: b}`,
		String.raw`function a() {return'a\\b'}`
	],
});
