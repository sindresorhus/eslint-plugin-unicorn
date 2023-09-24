import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const bar = !re.test(foo)',
		// Not `boolean`
		'const matches = foo.match(re) || []',
		'const matches = foo.match(re)',
		'const matches = re.exec(foo)',
		'while (foo = re.exec(bar)) {}',
		'while ((foo = re.exec(bar))) {}',

		// Method not match
		'if (foo.notMatch(re)) {}',
		'if (re.notExec(foo)) {}',
		// Not `CallExpression`
		'if (foo.match) {}',
		'if (re.exec) {}',
		// Computed
		'if (foo[match](re)) {}',
		'if (re[exec](foo)) {}',
		'if (foo["match"](re)) {}',
		'if (re["exec"](foo)) {}',
		// Not `MemberExpression`
		'if (match(re)) {}',
		'if (exec(foo)) {}',
		// More/Less arguments
		'if (foo.match()) {}',
		'if (re.exec()) {}',
		'if (foo.match(re, another)) {}',
		'if (re.exec(foo, another)) {}',
		'if (foo.match(...[regexp])) {}',
		'if (re.exec(...[string])) {}',
		// Not regex
		'if (foo.match(1)) {}',
		'if (foo.match("1")) {}',
		'if (foo.match(null)) {}',
		'if (foo.match(1n)) {}',
		'if (foo.match(true)) {}',
	],
	invalid: [
		// `String#match()`
		'const re = /a/; const bar = !foo.match(re)',
		'const re = /a/; const bar = Boolean(foo.match(re))',
		'const re = /a/; if (foo.match(re)) {}',
		'const re = /a/; const bar = foo.match(re) ? 1 : 2',
		'const re = /a/; while (foo.match(re)) foo = foo.slice(1);',
		'const re = /a/; do {foo = foo.slice(1)} while (foo.match(re));',
		'const re = /a/; for (; foo.match(re); ) foo = foo.slice(1);',

		// `RegExp#exec()`
		'const re = /a/; const bar = !re.exec(foo)',
		'const re = /a/; const bar = Boolean(re.exec(foo))',
		'const re = /a/; if (re.exec(foo)) {}',
		'const re = /a/; const bar = re.exec(foo) ? 1 : 2',
		'const re = /a/; while (re.exec(foo)) foo = foo.slice(1);',
		'const re = /a/; do {foo = foo.slice(1)} while (re.exec(foo));',
		'const re = /a/; for (; re.exec(foo); ) foo = foo.slice(1);',

		// Parentheses
		'const re = /a/; if ((0, foo).match(re)) {}',
		'const re = /a/; if ((0, foo).match((re))) {}',
		'const re = /a/; if ((foo).match(re)) {}',
		'const re = /a/; if ((foo).match((re))) {}',
		'if (foo.match(/re/)) {}',
		'const re = /a/; if (foo.match(re)) {}',
		'const bar = {bar: /a/}; if (foo.match(bar.baz)) {}',
		'if (foo.match(bar.baz())) {}',
		'if (foo.match(new RegExp("re", "g"))) {}',
		'if (foo.match(new SomeRegExp())) {}',
		'if (foo.match(new SomeRegExp)) {}',
		'if (foo.match(bar?.baz)) {}',
		'if (foo.match(bar?.baz())) {}',
		'if (foo.match(bar || baz)) {}',
		outdent`
			async function a() {
				if (foo.match(await bar())) {}
			}
		`,
		'if ((foo).match(/re/)) {}',
		'if ((foo).match(new SomeRegExp)) {}',
		'if ((foo).match(bar?.baz)) {}',
		'if ((foo).match(bar?.baz())) {}',
		'const bar = false; const baz = /a/; if ((foo).match(bar || baz)) {}',
		outdent`
			async function a() {
				if ((foo).match(await bar())) {}
			}
		`,
		// Should not need handle ASI problem
		'const re = [/a/]; if (foo.match([re][0])) {}',

		// Comments
		outdent`
			async function a() {
				if (
					/* 1 */ foo() /* 2 */
						./* 3 */ match /* 4 */ (
							/* 5 */ await /* 6 */ bar() /* 7 */
							,
							/* 8 */
						)
				) {}
			}
		`,
		// Should not fix, #1150
		outdent`
			const string = '[.!?]\\s*$';
			if (foo.match(string)) {
			}
		`,
		// This will still fix to `.test()`
		outdent`
			const regex = new RegExp('[.!?]\\s*$');
			if (foo.match(regex)) {}
		`,
		'if (foo.match(unknown)) {}',
		// `g` and `y` flags
		'if (foo.match(/a/g));',
		'if (foo.match(/a/y));',
		'if (foo.match(/a/gy));',
		'if (foo.match(/a/ig));',
		'if (foo.match(new RegExp("a", "g")));',
		'if (/a/g.exec(foo));',
		'if (/a/y.exec(foo));',
		'if (/a/gy.exec(foo));',
		'if (/a/yi.exec(foo));',
		'if (new RegExp("a", "g").exec(foo));',
		'if (new RegExp("a", "y").exec(foo));',
		outdent`
			const regex = /weird/g;
			if (foo.match(regex));
		`,
		outdent`
			const regex = /weird/g;
			if (regex.exec(foo));
		`,
		outdent`
			const regex = /weird/y;
			if (regex.exec(foo));
		`,
		outdent`
			const regex = /weird/gyi;
			if (regex.exec(foo));
		`,
		outdent`
			let re = new RegExp('foo', 'g');
			if(str.match(re));
		`,
		'!/a/u.exec(foo)',
		'!/a/v.exec(foo)',
	],
});

test.vue({
	valid: [],
	invalid: [
		{
			code: '<template><div v-if="/re/.exec(string)"></div></template>',
			output: '<template><div v-if="/re/.test(string)"></div></template>',
			errors: 1,
		},
		{
			code: '<template><div v-if="\'string\'.match(/re/)"></div></template>',
			output: '<template><div v-if="/re/.test(\'string\')"></div></template>',
			errors: 1,
		},
		{
			code: '<script>if(/re/.exec(string));</script>',
			output: '<script>if(/re/.test(string));</script>',
			errors: 1,
		},
	],
});

const supportsUnicodeSets = (() => {
	try {
		// eslint-disable-next-line prefer-regex-literals -- Can't test with regex literal
		return new RegExp('.', 'v').unicodeSets;
	} catch {}

	return false;
})();
// These cases can be auto-fixed in environments supports `v` flag (eg, Node.js v20),
// But will use suggestions instead in environments doesn't support `v` flag.
test({
	valid: [],
	invalid: [
		{
			code: 'const re = /a/v; !re.exec(foo)',
			output: 'const re = /a/v; !re.test(foo)',
		},
		{
			code: 'const re = new RegExp("a", "v"); !re.exec(foo)',
			output: 'const re = new RegExp("a", "v"); !re.test(foo)',
		},
	].map(({code, output}) =>
		supportsUnicodeSets
			? {
				code,
				output,
				errors: 1,
			}
			: {
				code,
				errors: [
					{suggestions: [{output}]},
				],
			},
	),
});
