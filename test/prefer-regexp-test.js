import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const fixtureDirectory = fileURLToPath(new URL('fixtures/prefer-regexp-test/', import.meta.url));

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fixtureDirectory,
			projectService: {
				allowDefaultProject: ['*.ts'],
				defaultProject: 'tsconfig.json',
			},
		},
	},
});

ruleTest.snapshot({
	valid: [
		'const bar = !re.test(foo)',
		// Not `boolean`
		'const matches = foo.match(re) || []',
		'const matches = foo.match(re)',
		'const matches = re.exec(foo)',
		'string.search(regex)',
		'const index = string.search(regex)',
		'if (string.search(regex)) {}',
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
		'if (foo.search() !== -1) {}',
		'if (foo.match(re, another)) {}',
		'if (re.exec(foo, another)) {}',
		'if (foo.search(re, another) !== -1) {}',
		'if (foo.match(...[regexp])) {}',
		'if (re.exec(...[string])) {}',
		'if (foo.search(...[regexp]) !== -1) {}',
		// Not regex
		'if (foo.match(1)) {}',
		'if (foo.match("1")) {}',
		'if (foo.match(null)) {}',
		'if (foo.match(undefined)) {}',
		'if (foo.match(void 0)) {}',
		'if (foo.match(1n)) {}',
		'if (foo.match(true)) {}',
		'if (foo.search(undefined) !== -1) {}',
		'if (foo.search(void 0) !== -1) {}',
		'if (foo.search("1") !== -1) {}',
		'if (foo.search(`1`) !== -1) {}',
		outdent`
			if (foo.search(\`\${pattern}\`) !== -1) {}
		`,
		'const pattern = "1"; if (foo.search(pattern) !== -1) {}',
		'const pattern = `1`; if (foo.search(pattern) !== -1) {}',
		outdent`
			const pattern = \`\${value}\`;
			if (foo.search(pattern) !== -1) {}
		`,
		'const pattern = 1; if (foo.search(pattern) !== -1) {}',
		'if (foo.search(1 + 2) !== -1) {}',

		// Unsupported `String#search()` comparisons
		'if (foo.search(/re/) <= -1) {}',
		'if (-1 !== foo.search(/re/)) {}',
		'if (-1 === foo.search(/re/)) {}',
		'if (0 <= foo.search(/re/)) {}',
		'if (0 > foo.search(/re/)) {}',

		// Known non-string receivers
		'if (({}).match(action)) {}',
		'if ((() => {}).match(action)) {}',
		'if (/string/.match(/regexp/)) {}',
		'if (/string/.search(/regexp/) !== -1) {}',
		'const actionCreator = {}; if (actionCreator.match(action)) {}',
		'const actionCreator = () => {}; if (actionCreator.match(action)) {}',

		// Known non-RegExp arguments
		'const pattern = "1"; if (foo.match(pattern)) {}',
		'const pattern = `1`; if (foo.match(pattern)) {}',
		outdent`
			const pattern = \`\${value}\`;
			if (foo.match(pattern)) {}
		`,
		'const pattern = {}; if (foo.match(pattern)) {}',
		'const pattern = () => {}; if (foo.match(pattern)) {}',
		'const pattern = 1 + 2; if (foo.match(pattern)) {}',

		// Known non-RegExp receivers
		'if ("regexp".exec(foo)) {}',
		'const regexp = "regexp"; if (regexp.exec(foo)) {}',
		'const regexp = {}; if (regexp.exec(foo)) {}',
		'const regexp = () => {}; if (regexp.exec(foo)) {}',

		// Known non-string arguments
		'if (regexp.exec({})) {}',
		'if (regexp.exec(/string/)) {}',
		'if (regexp.exec(undefined)) {}',
		'if (regexp.exec(void 0)) {}',
		'const value = {}; if (regexp.exec(value)) {}',
		'const value = () => {}; if (regexp.exec(value)) {}',

		// Unsupported length checks
		'if (uri.match(/unicorn/).length >= 1) {}',
		'if (uri.match(/unicorn/).length === 0) {}',
		'if (0 < uri.match(/unicorn/).length) {}',
		'if (uri.match?.(/unicorn/)?.length) {}',
		'if (!uri.match(/unicorn/).length) {}',
		'if (!uri.match(/unicorn/)?.length) {}',
		'if (!uri.match(/unicorn/).length > 0) {}',
		'if (!(uri.match(/unicorn/).length > 0)) {}',
		'if (!(foo || uri.match(/unicorn/).length)) {}',
		'if (!(foo || uri.match(/unicorn/).length > 0)) {}',
		'if (!Boolean(uri.match(/unicorn/).length)) {}',
		'if (!Boolean(uri.match(/unicorn/).length > 0)) {}',
		'if (!Boolean(foo || uri.match(/unicorn/).length)) {}',
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
		'if (object.match(/regexp/)) {}',
		'const pattern = /regexp/; if (object.match(pattern)) {}',
		'const pattern = /regexp/g; if (object.match(pattern)) {}',
		'if (uri.match(/unicorn/).length) {}',
		'if (uri.match(/unicorn/).length > 0) {}',
		'if (uri.match(/unicorn/)?.length) {}',
		'if (uri.match(/unicorn/)?.length > 0) {}',
		'if (uri.match(/unicorn/).length /* keep */ > 0) {}',
		outdent`
			if (
				uri.match(/unicorn/).length ||
				uri.match(/unicorn/).length > 0 ||
				uri.match(/unicorn/)?.length ||
				uri.match(/unicorn/)?.length > 0
			) {}
		`,

		// `String#search()`
		'const re = /a/; const bar = foo.search(re) !== -1',
		'const re = /a/; const bar = foo.search(re) != -1',
		'const re = /a/; const bar = foo.search(re) > -1',
		'const re = /a/; const bar = foo.search(re) >= 0',
		'const re = /a/; const bar = foo.search(re) === -1',
		'const re = /a/; const bar = foo.search(re) == -1',
		'const re = /a/; const bar = foo.search(re) < 0',
		'if (foo.search(/re/) !== -1) {}',
		'if ((foo).search(/re/) !== -1) {}',
		'if ((foo.search(/re/)) === -1) {}',
		'if (foo.search(bar.baz()) !== -1) {}',
		'if (foo.search(new RegExp("re", "g")) !== -1) {}',
		'if (foo.search(unknown) !== -1) {}',
		'if (foo.search(/re/) /* keep */ !== -1) {}',
		'if (foo.search(/re/) /* keep */ === -1) {}',
		outdent`
			const regex = /weird/g;
			if (foo.search(regex) !== -1);
		`,
		outdent`
			const regex = /weird/g;
			if (foo.search(regex) === -1);
		`,
		outdent`
			const re = /a/y;
			if (foo.search(re) !== -1);
		`,

		// `RegExp#exec()`
		'const re = /a/; const bar = !re.exec(foo)',
		'const re = /a/; const bar = Boolean(re.exec(foo))',
		'const re = /a/; if (re.exec(foo)) {}',
		'const re = /a/; const bar = re.exec(foo) ? 1 : 2',
		'const re = /a/; while (re.exec(foo)) foo = foo.slice(1);',
		'const re = /a/; do {foo = foo.slice(1)} while (re.exec(foo));',
		'const re = /a/; for (; re.exec(foo); ) foo = foo.slice(1);',
		'if (/unicorn/.exec(uri).length) {}',
		'if (/unicorn/.exec(uri)?.length > 0) {}',

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

ruleTest.vue({
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
			code: '<template><div v-if="\'string\'.search(/re/) !== -1"></div></template>',
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

ruleTest.typescript({
	valid: [
		outdent`
			function stringSearchPattern(pattern: string) {
				if ("string".search(pattern) !== -1) {}
			}

			function stringMatchPattern(pattern: string) {
				if ("string".match(pattern)) {}
			}

			function stringSearchAssertionPattern(pattern: string) {
				if ("string".search((\`\${pattern}\` as string)) !== -1) {}
			}

			function stringMatchAssertionPattern(pattern: string) {
				if ("string".match((\`\${pattern}\` as string))) {}
			}

			function actionCreatorMatcher(actionCreator: {match(action: unknown): boolean}, action: unknown) {
				if (actionCreator.match(action)) {}
			}

			function functionActionCreatorMatcher(actionCreator: (() => void) & {match(action: unknown): boolean}, action: unknown) {
				if (actionCreator.match(action)) {}
			}

			function stringExecReceiver(regexp: string, value: string) {
				if (regexp.exec(value)) {}
			}

			function stringOrObjectExecReceiver(regexp: string | object, value: string) {
				if (regexp.exec(value)) {}
			}

			function objectExecReceiver(regexp: {exec(value: string): unknown}, value: string) {
				if (regexp.exec(value)) {}
			}

			function objectExecArgument(regexp: RegExp, value: object) {
				if (regexp.exec(value)) {}
			}

			function regexpOrObjectExecArgument(regexp: RegExp, value: RegExp | object) {
				if (regexp.exec(value)) {}
			}

			function objectMatchReceiver(value: object, pattern: RegExp) {
				if (value.match(pattern)) {}
			}

			function stringOrNumberMatchPattern(pattern: string | number) {
				if ("string".match(pattern)) {}
			}

			function stringOrUndefinedSearchPattern(pattern: string | undefined) {
				if ("string".search(pattern) !== -1) {}
			}

			function arrayMatchPattern(pattern: string[]) {
				if ("string".match(pattern)) {}
			}

			function tupleSearchPattern(pattern: [string]) {
				if ("string".search(pattern) !== -1) {}
			}

			function genericArrayMatchPattern(pattern: Array<string>) {
				if ("string".match(pattern)) {}
			}

			function genericReadonlyArraySearchPattern(pattern: ReadonlyArray<string>) {
				if ("string".search(pattern) !== -1) {}
			}
		`,
	],
	invalid: [
		{
			code: 'function foo(pattern: string | RegExp) { if ("string".match(pattern)) {} }',
			errors: [
				{
					message: 'Prefer `RegExp#test(…)` over `String#match(…)`.',
					suggestions: [
						{
							desc: 'Switch to `RegExp#test(…)`.',
							output: 'function foo(pattern: string | RegExp) { if (pattern.test("string")) {} }',
						},
					],
				},
			],
		},
	],
});

ruleTest({
	valid: [
		typeAware(outdent`
			type UnknownAction = {
				type: string;
			};

			type ActionCreatorWithMatcher<Type extends string> = (() => {type: Type}) & {
				match(action: UnknownAction): action is {type: Type};
			};

			declare function createAction<Type extends string>(type: Type): ActionCreatorWithMatcher<Type>;

			const increment = createAction('counter/increment');
			declare const action: UnknownAction;

			if (increment.match(action)) {}
		`),
	],
	invalid: [],
});

const supportsUnicodeSets = (() => {
	try {
		// eslint-disable-next-line prefer-regex-literals -- Can't test with regex literal
		const regexp = new RegExp('.', 'v');
		return regexp.unicodeSets;
	} catch {
		return false;
	}
})();
// These cases can be auto-fixed in environments supports `v` flag (eg, Node.js v20),
// But will use suggestions instead in environments doesn't support `v` flag.
ruleTest({
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
					{
						message: 'Prefer `.test(…)` over `.exec(…)`.',
						suggestions: [
							{
								desc: 'Switch to `RegExp#test(…)`.',
								output,
							},
						],
					},
				],
			}),
});
