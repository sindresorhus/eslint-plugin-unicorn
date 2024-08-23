import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Skip checking if indexOf() method is not a method call from a object
		outdent`
			const index = indexOf('bar');

			if (index > -1) {}
		`,
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
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			let index = foo.indexOf("bar");

			if (index < 0) {}
		`,
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			var index = foo.indexOf("bar");

			if (index < 0) {}
		`,
		// To prevent false positives, it will not check if the index is not declared via const
		outdent`
			let index;

			// do stuff

			index = arr.findLastIndex(element => element > 10);

			if (index > -1) {}

			function test () {
				if (index > -1) {}
			}
		`,
		'const indexOf = "indexOf"; const index = foo[indexOf](foo); index < 0;',
		'const index = foo.indexOf?.(foo); index < 0;',
		'const index = foo?.indexOf(foo); index < 0;',
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
		outdent`
			const index = foo.indexOf('bar');

			if (index < -1) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index >= +0) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index > ~0) {}
		`,
		outdent`
			const index = foo.indexOf('bar');

			if (index > -(+1)) {}
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			if (index > -1) {}
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			index > -1 ? 'exists' : 'not exists';
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			conditionLeft && index > -1 ? 'exists' : 'not exists';
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			index > -1 && conditionRight ? 'exists' : 'not exists';
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			(conditionLeft || index > -1) ? 'exists' : 'not exists';
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			(conditionLeft ?? index > -1) ? 'exists' : 'not exists';
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			while (index > -1) {
				// Do something
			}
		`,
		outdent`
			const index = foo.lastIndexOf('bar');

			for (;index > -1;) {
				// Do something
			}
		`,
		'const index = foo.lastIndexOf("bar", 1); index > -1',
		'const index = foo.lastIndexOf(...bar); index > -1',
		outdent`
			const arr = [5, 12, 8, 130, 44];
			const index = arr.findIndex(element => element > 10);

			if (index > -1) {}
		`,
		outdent`
			const arr = [5, 12, 8, 130, 44];
			const index = arr.findLastIndex(element => element > 10);

			if (index > -1) {}
		`,
		outdent`
			const arr = [5, 12, 8, 130, 44];
			const index = arr.findLastIndex(element => element > 10);

			if (index > -1) {}

			function test () {
				if (index > -1) {}
			}
		`,
	],
});
