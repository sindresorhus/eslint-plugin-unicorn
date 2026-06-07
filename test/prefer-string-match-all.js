import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// No previous declaration
		'while ((match = regexp.exec(string)) !== null) {}',

		// Not `let match;`
		outdent`
			var match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			let match = undefined;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			let match, other;
			while ((match = regexp.exec(string)) !== null) {}
		`,

		// Non-global or unknown regexp
		outdent`
			const regexp = /foo/;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/y;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = new RegExp('foo', flags);
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /(?:)/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /^/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = new RegExp('', 'g');
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /(?=foo)/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /(?<=foo)/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /[\\q{}]/gv;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /[\\q{a|}]/gv;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /[\\q{a}]/gv;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /[[\\q{}]--[a]]/gv;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';

			function run() {
				let match;
				while ((match = regexp.exec(string)) !== null) {
					return match.index;
				}
			}
		`,
		outdent`
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			let match;
			while ((match = /foo/g.exec(string)) !== null) {
				console.log(match);
			}
		`,

		// Unsupported `exec()` shapes
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp?.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp[exec](string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(...[string])) !== null) {}
		`,

		// Behavior-sensitive cases
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
			console.log(match);
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				match = nextMatch;
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				callbacks.push(() => match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(regexp);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {}
			console.log(regexp);
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(regexp.lastIndex);
			}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(getString())) !== null) {}
		`,
		outdent`
			const regexp = getRegexp();
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const alias = /foo/g;
			const regexp = alias;
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(alias.lastIndex);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			const alias = regexp;
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(foo || bar)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(object.string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(object?.string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			let string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				string = '';
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				callbacks.push(class {
					value = match.index;
				});
			}
		`,
		outdent`
			const regexp = /foo/g;
			const value = 123_123;
			let match;
			while ((match = regexp.exec(value)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			const string = maybeNumber();
			let match;
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			var regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(globalThis.regexp.lastIndex);
			}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(123_123)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec('foofoo')) !== null) {
				console.log(match);
			}
		`,
		outdent`
			const string = 'foofoo';
			const match = string.match(/foo/g);
		`,

		// Comments in replaced ranges
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match; // Keep this
			while ((match = regexp.exec(string)) !== null) {}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== /* keep */ null) {}
		`,

		// Not a matching condition
		outdent`
			const regexp = /foo/g;
			let match;
			while ((match = regexp.exec(string)) === null) {}
		`,
	],
	invalid: [
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while (null !== (match = regexp.exec(string))) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) != null) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while (null != (match = regexp.exec(string))) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /foo/g;
			const string = 'foofoo';
			let match;
			while (match = regexp.exec(string)) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = new RegExp('foo', 'g');
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = new RegExp('foo', 'gi');
			const string = 'foofoo';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(match);
			}
		`,
		outdent`
			const regexp = /(a+)+b/g;
			const string = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
			let match;
			while ((match = regexp.exec(string)) !== null) {
				console.log(match);
			}
		`,
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: outdent`
				const regexp = /foo/g;
				const string = 'foofoo';
				let match: RegExpExecArray | null;
				while ((match = regexp.exec(string)) !== null) {
					console.log(match);
				}
			`,
			output: outdent`
				const regexp = /foo/g;
				const string = 'foofoo';
				for (const match of string.matchAll(regexp)) {
					console.log(match);
				}
			`,
			errors: [
				{
					message: 'Prefer `String#matchAll()` over a `RegExp#exec()` loop.',
				},
			],
		},
	],
});
