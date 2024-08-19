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
		// Variable index is not from indexOf
		outdent`
			const index = 0;

			if (index < 0) {}
		`,
		// If index is not declared via VariableDeclarator, it will not be check here.
		outdent`
			function foo (index) {
				if (index < 0) {}
			}
		`,
		// Since the variable is references from function parameter, it will not be checked here
		outdent`
			const index = foo.indexOf('bar');

			function foo (index) {
				if (index < 0) {}
			}
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
		// It will search the scope chain for 'index' and find the 'index' variable declared above.
		outdent`
			const index = foo.indexOf('bar');

			function foo () {
				if (index < 0) {}
			}
		`,
		'if (foo.indexOf(\'bar\') < 0) {}',
		'if (foo.indexOf(\'bar\') > -1) {}',
		'if (0 > foo.indexOf(\'bar\')) {}',
		'if (-1 < foo.indexOf(\'bar\')) {}',
		outdent`
			const index = foo.indexOf('bar');

			if (index < -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index >= +0) {}
		`,
	],
});
