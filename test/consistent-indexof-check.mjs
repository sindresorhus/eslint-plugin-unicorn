import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			const index = foo.indexOf('bar');

			if (index === -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (-1 === index) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index !== -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (-1 !== index) {}
		`,
		outdent`
			const index = 0; // index not from indexOf

			if (index < 0) {}
		`,
	],
	invalid: [
		outdent`
			const index = foo.indexOf('bar');

			if (index < 0) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (0 > index) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index >= 0) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (0 <= index) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			function foo () {
				// It will search the scope chain for 'index' and find the 'index' variable declared above.
				if (index < 0) {}
			}
		`,
	],
});
