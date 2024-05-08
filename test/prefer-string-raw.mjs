import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		String.raw`a = '\''`,
		// Cannot use `String.raw`
		String.raw`'\\'`,
		String.raw`import foo from "./foo\\bar.js";`,
		String.raw`export {foo} from "./foo\\bar.js";`,
		String.raw`{'\\': ''}`,
	],
	invalid: [
		String.raw`a = '\\'`,
	],
});
