import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

ruleTest({
	valid: [],
	invalid: [{
		code: 'const match = "foo".match(/f(o+)/);',
		output: 'const match = /f(o+)/.exec("foo");',
		errors: [{messageId: 'prefer-regexp-exec'}],
	}],
});

ruleTest.snapshot({
	valid: [
		'"foo".match(/foo/g)',
		'"foo".match(/foo/gy)',
		'const regexp = /foo/g; "foo".match(regexp)',
		'"foo".match(new RegExp("foo", "gi"))',
		'const regexp = new RegExp(pattern, "g"); "foo".match(regexp)',
		'"foo".match(regexp)',
		'function run(regexp) { return "foo".match(regexp); }',
		'import regexp from "pattern"; "foo".match(regexp)',
		'"foo".match(new RegExp("foo", flags))',
		'"foo".match(new RegExp(pattern))',
		'"foo".match(new RegExp(pattern, undefined))',
		'"foo".match(new RegExp(pattern, "i"))',
		'"foo".match(condition ? /foo/ : /bar/)',
		'const regexp = /foo/g; "foo".match(new RegExp(regexp))',
		'let regexp = /foo/; regexp = /foo/g; "foo".match(regexp)',
		'let regexp = /foo/; "foo".match(regexp)',
		'unknown.match(/foo/)',
		'function run(text) { return text.match(/foo/); }',
		'const object = {match() {}}; object.match(/foo/)',
		'123..match(/foo/)',
		'"foo".match("foo")',
		'"foo".match(`foo`)',
		'"foo".match()',
		'"foo".match(/foo/, extra)',
		'"foo".match(...patterns)',
		'"foo"[method](/foo/)',
		'"foo"[match](/foo/)',
		'const method = "match"; "foo"[method](/foo/)',
		// eslint-disable-next-line no-template-curly-in-string
		'"foo"[`ma${"tch"}`](/foo/)',
		'"foo"[String.raw`match`](/foo/)',
		'"foo"[Object.freeze("match")](/foo/)',
		'"foo"[""](/foo/)',
		'"foo"?.["match"](/foo/)',
		'"foo"["match"]?.(/foo/)',
		'"foo"["match"](/foo/g)',
		'"foo"["match"](new RegExp("foo", flags))',
		'if ("foo"["match"](/foo/)) {}',
		'class Example { #match() {} method() { return "foo".#match(/foo/); } }',
		'"foo"?.match(/foo/)',
		'"foo".match?.(/foo/)',
		outdent`
			/** @returns {string} */
			function read() {
				return 'foo';
			}
			read?.().trim().match(/foo/);
		`,
		'"foo".matchAll(/foo/g)',
		'/foo/.exec("foo")',
		'if ("foo".match(/foo/)) {}',
		'Boolean("foo".match(/foo/))',
		'!"foo".match(/foo/)',
		'if (condition && "foo".match(/foo/)) {}',
		'"foo".match(new RegExp("(", "i"))',
		'"foo".match(new RegExp("foo", "ii"))',
		'const regexp = /foo/; "foo".match(Object.freeze(regexp))',
		'const regexp = /foo/; "foo".match(new RegExp(Object.freeze(regexp)))',
		'"foo".match(RegExp("foo", "g"))',
		'const regexp = /foo/g; "foo".match(RegExp(regexp))',
		'function run(regexp) { return "foo".match(RegExp(regexp)); }',
		'function run(regexp) { return "foo".match(RegExp(regexp, undefined)); }',
		'"foo".match(RegExp("foo", flags))',
		'"foo".match(RegExp(pattern, "i"))',
		'"foo".match(RegExp?.("foo"))',
		'"foo".match(RegExp(...patterns))',
		'const regexp = /foo/; "foo".match(RegExp(Object.freeze(regexp)))',
		'"foo".match(RegExp("["))',
	],
	invalid: [
		'"foo".match(/foo/)',
		'"foo".match(/foo/i)',
		'"foo".match(/foo/y)',
		'"foo".match(/(?<letter>f)oo/d)',
		'`foo`.match(/foo/)',
		// eslint-disable-next-line no-template-curly-in-string
		'`foo${value}`.match(/foo/)',
		'String(value).match(/foo/)',
		'("foo" + value).match(/foo/)',
		'const text = "foo"; text.match(/foo/)',
		'const text = "foo"; const alias = text; alias.match(/foo/)',
		'"foo".trim().match(/foo/)',
		'"foo".match(new RegExp("foo"))',
		'"foo".match(new RegExp(`foo`, `i`))',
		'"foo".match(new RegExp(/foo/g, "i"))',
		'"foo".match(new RegExp(/foo/))',
		'const flags = "i"; "foo".match(new RegExp("foo", flags))',
		'const regexp = /foo/; "foo".match(regexp)',
		'const regexp = /foo/; const alias = regexp; "foo".match(alias)',
		'const regexp = /foo/; "foo".match(new RegExp(regexp))',
		'"foo".match((/foo/))',
		'"foo".match((0, /foo/))',
		'"foo".match(true ? /foo/ : /bar/)',
		'(("foo")).match((/foo/))',
		'(log(), "foo").match(/foo/)',
		'const match = "foo".match(/foo/) || fallback;',
		'const [match, capture] = "foo".match(/(foo)/);',
		'function run() { return"foo".match(/foo/); }',
		'function run() { throw"foo".match(/foo/); }',
		'function * run() { yield"foo".match(/foo/); }',
		'async function run() { await"foo".match(/foo/); }',
		'const text = "foo"\ntext.match(/foo/)',
		'"foo".match(/* keep */ /foo/)',
		'"foo" /* keep */.match(/foo/)',
		'(/* keep */ "foo").match(/foo/)',
		'"foo".match(new RegExp(/* keep */ "foo"))',
		'("foo" /* keep */ + "bar").match(/foo/)',
		'"foo".match(/foo/).slice(1)',
		outdent`
			/** @param {string} text */
			function run(text) {
				return text.match(/foo/);
			}
		`,
		outdent`
			/** @returns {string} */
			function read() { return source; }
			read().match(/foo/);
		`,
		'function run() {\r\n  return "foo".match(/foo/);\r\n}',
		{code: 'const element = <div>{"foo".match(/foo/)}</div>;', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'"".match(/(?:)/)',
		'"foo".match(new RegExp(""))',
		'String.raw`foo`.match(/foo/)',
		'"foo".match(/foo/)?.at(0)',
		'const text = "foo"\ntext.match((0, /foo/))',
		'for (const character of"foo".match(/foo/)) {}',
		'"foo".match(new RegExp)',
		'const regexp = Object.freeze(/foo/); "foo".match(regexp)',
		'"foo"["match"](/foo/)',
		'"foo"[\'match\'](/foo/)',
		'"foo"[`match`](/foo/)',
		String.raw`"foo"["ma\u0074ch"](/foo/)`,
		'"foo"[/* keep */ ("match")](/foo/)',
		'"foo"["match"](/* keep */ /foo/)',
		'const text = "foo"\ntext["match"](/foo/)',
		'("foo" + value)[`match`](/foo/)',
		'"foo".match(RegExp("foo"))',
		'"foo".match(RegExp(`foo`, `i`))',
		'"foo".match(RegExp(/foo/g, "i"))',
		'"foo".match(RegExp(/foo/))',
		'"foo".match(RegExp())',
		'const regexp = RegExp("foo", "i"); "foo".match(regexp)',
		'"foo"["match"](RegExp("foo", "i"))',
	],
});

ruleTest.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		'function run(text: string, regexp: RegExp) { return text.match(regexp); }',
		'function run(text: string, regexp: RegExp) { return text.match(new RegExp(regexp)); }',
		'function run(text: string, regexp: RegExp) { return text.match(new RegExp(regexp, undefined)); }',
		'function run(text: unknown) { return text.match(/foo/); }',
		'function run(text: any) { return text.match(/foo/); }',
		'function run(text: string | number) { return text.match(/foo/); }',
		'function run(text: string | undefined) { return text!.match(/foo/); }',
		'function run(text: string | undefined) { return text?.match(/foo/); }',
		'function run(object: {text: string} | undefined) { return object?.text!.match(/foo/); }',
		'const regexp = /foo/; function run(text: string) { return text.match((new RegExp(Object.freeze(regexp)) as RegExp)); }',
		'function run(text: string | undefined) { return text?.["match"](/foo/); }',
		'function run(text: string) { return text["match" as const](/foo/); }',
		'function run(text: string) { return text["match" as "match"](/foo/); }',
		'function run(text: string) { return text["match" satisfies "match"](/foo/); }',
		'function run(text: string) { return text.match(/foo/ as RegExp | string); }',
		'const regexp = /foo/ as RegExp | string; "foo".match(regexp)',
		'const regexp = /foo/ as never; "foo".match(regexp)',
		'const regexp = new RegExp(/foo/g) as RegExp; "foo".match(regexp)',
		'const regexp = RegExp(/foo/g) satisfies RegExp; "foo".match(regexp)',
		'const regexp = new RegExp("foo", flags) as RegExp; "foo".match(regexp)',
		'const regexp = RegExp(pattern)!; "foo".match(regexp)',
		'const regexp = new RegExp(Object.freeze(/foo/)) as RegExp; "foo".match(regexp)',
		'const regexp = RegExp(Object.freeze(/foo/)) satisfies RegExp; "foo".match(regexp)',
		'let regexp = RegExp("foo")!; regexp = /foo/g; "foo".match(regexp)',
	],
	invalid: [
		'function run(text: string) { return text.match(/foo/); }',
		'function run() { return (text as string).match(/foo/); }',
		'function run() { return (<string>text).match(/foo/); }',
		'function run(text: string) { return text!.match(/foo/); }',
		'function run(text: string) { return (text satisfies string).match(/foo/); }',
		'declare function getText(): string; getText().match(/foo/)',
		'function run(text: string) { return text.match((/foo/ as RegExp)); }',
		'function run(text: string) { return text.match((/foo/ satisfies RegExp)); }',
		'function run(text: string) { return text.match((new RegExp("foo") as RegExp)); }',
		'function run(text: string) { return text["match"](/foo/)?.[0]; }',
		'function run(text: string) { return text.match((RegExp("foo", "i") as RegExp)); }',
		'const regexp = new RegExp("foo") as RegExp; "foo".match(regexp)',
		'const regexp = RegExp("foo") satisfies RegExp | string; "foo".match(regexp)',
		'const regexp = new RegExp("foo")!; "foo".match(regexp)',
		'const regexp = <RegExp>RegExp("foo"); "foo".match(regexp)',
	],
});

ruleTest.snapshot({
	valid: [
		typeAware('declare const text: any; text.match(/foo/)'),
		typeAware('declare const text: unknown; text.match(/foo/)'),
		typeAware('declare function getPattern(): RegExp; "foo".match(new RegExp(getPattern()))'),
		typeAware('declare const text: {match(pattern: RegExp): unknown}; text.match(/foo/)'),
		typeAware('const regexp = new RegExp("foo") as RegExp | string; "foo".match(regexp)'),
		typeAware('const regexp = Object.freeze(/foo/); "foo".match(regexp)'),
		typeAware('type Options = {pattern: RegExp | string}; "foo".match(/foo/ as Options["pattern"])'),
		typeAware('type Options = {pattern: RegExp | "foo"}; "foo".match(/foo/ as Options["pattern"])'),
	],
	invalid: [
		typeAware('declare const object: {text: string}; object.text.match(/foo/)'),
		typeAware('declare function getText(): string; getText().match(/foo/)'),
		typeAware('function run<Text extends string>(text: Text) { return text.match(/foo/); }'),
		typeAware('type Options = {pattern: RegExp}; "foo".match(/foo/ as Options["pattern"])'),
	],
});

ruleTest.svelte({
	valid: [],
	invalid: [{
		code: '<p>{"foo".match(/foo/)}</p>',
		output: '<p>{(/foo/).exec("foo")}</p>',
		errors: [{messageId: 'prefer-regexp-exec'}],
	}],
});

test('delegates truthiness checks to prefer-regexp-test', t => {
	const code = outdent`
		const text = 'foo';
		const match = text.match(/(?<letter>f)(oo)/);
		const exists = Boolean(text.match(/foo/));
		JSON.stringify({match: {...match}, exists});
	`;
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-regexp-exec': 'error', 'unicorn/prefer-regexp-test': 'error'},
	};
	t.assert.deepStrictEqual(linter.verify(code, config).map(({ruleId}) => ruleId), ['unicorn/prefer-regexp-exec', 'unicorn/prefer-regexp-test']);
	const result = linter.verifyAndFix(code, config);
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, outdent`
		const text = 'foo';
		const match = /(?<letter>f)(oo)/.exec(text);
		const exists = Boolean(/foo/.test(text));
		JSON.stringify({match: {...match}, exists});
	`);
	t.assert.strictEqual(runInNewContext(result.output), runInNewContext(code));
	t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
});

test('fixes preserve division before a regexp literal', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}};
	for (const [code, output] of [
		['6/"2".match(/2/)', '6/ /2/.exec("2")'],
		['6/ "2".match(/2/)', '6/ /2/.exec("2")'],
		['6/\n"2".match(/2/)', '6/\n/2/.exec("2")'],
		['6/ /* keep */"2".match(/2/)', '6/ /* keep *//2/.exec("2")'],
		['6/("2").match(/2/)', '6/(/2/).exec("2")'],
		['6/"2"["match"](/2/)', '6/ /2/["exec"]("2")'],
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, output);
		t.assert.strictEqual(runInNewContext(result.output), runInNewContext(code));
		t.assert.strictEqual(runInNewContext(result.output), 3);
	}
});

test('hoisted regexp bindings retain their runtime values', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}};
	for (const [code, expected] of [
		['const match = "foo".match(regexp); var regexp = /foo/; JSON.stringify(match);', '[""]'],
		['const match = run(); var regexp = /foo/; function run() { return "foo".match(regexp); } JSON.stringify(match);', '[""]'],
		['const regexp = new RegExp(/foo/g, flags); var flags = "i"; JSON.stringify("foofoo".match(regexp));', '["foo","foo"]'],
	]) {
		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(runInNewContext(result.output), runInNewContext(code));
		t.assert.strictEqual(runInNewContext(result.output), expected);
	}
});

test('fixes preserve match results and lastIndex for non-global regexps', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}};
	for (const [flags, text] of [['', 'ab ab'], ['i', 'AB'], ['dy', 'ab'], ['dy', 'none']]) {
		const code = outdent`
			const regexp = new RegExp('(?<letter>a)(b)', '${flags}');
			const text = '${text}';
			const match = text.match(regexp);
			JSON.stringify({match: match && {...match}, lastIndex: regexp.lastIndex});
		`;
		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(runInNewContext(result.output), runInNewContext(code));
	}
});

test('fixes preserve repeated sticky matches and lastIndex reset', t => {
	const code = outdent`
		const regexp = /(?<letter>a)(b)/dy;
		const text = 'abab';
		const matches = [];
		for (let index = 0; index < 3; index++) {
			const match = text.match(regexp);
			matches.push({match: match && {...match}, lastIndex: regexp.lastIndex});
		}
		JSON.stringify(matches);
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}});
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, true);
	const actual = runInNewContext(result.output);
	t.assert.strictEqual(actual, runInNewContext(code));
	t.assert.deepStrictEqual(JSON.parse(actual).map(({lastIndex}) => lastIndex), [2, 4, 0]);
});

test('fixes evaluate a known string receiver exactly once', t => {
	const code = outdent`
		let calls = 0;
		/** @returns {string} */
		function read() {
			calls++;
			return 'foo';
		}
		const match = read().match(/f(o+)/);
		JSON.stringify({match: {...match}, calls});
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}});
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, true);
	const actual = runInNewContext(result.output);
	t.assert.strictEqual(actual, runInNewContext(code));
	t.assert.strictEqual(JSON.parse(actual).calls, 1);
});

test('nested fixes converge across multiple passes', t => {
	const {code, filename, languageOptions} = typeAware('const text = "foo"; text.match(/f/)[0].match(/f/);');
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		files: ['**/*.ts'],
		languageOptions,
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-regexp-exec': 'error'},
	}, {filename});
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, 'const text = "foo"; /f/.exec(/f/.exec(text)[0]);');
});

test('global regexp copies remain unchanged', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}};
	for (const expression of ['new RegExp(pattern)', 'new RegExp(pattern, undefined)', 'RegExp(pattern)', 'RegExp(pattern, undefined)']) {
		const code = `const pattern = /a/g; function run(pattern) { return 'aa'.match(${expression}); } JSON.stringify(run(pattern));`;
		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(runInNewContext(result.output), '["a","a"]');
	}
});

test('regexp calls preserve the existing regexp and evaluate the receiver once', t => {
	const code = outdent`
		const regexp = /(f)(oo)/y;
		let calls = 0;
		/** @returns {string} */
		function read() {
			calls++;
			return 'foo';
		}
		const match = read().match(RegExp(regexp));
		JSON.stringify({match: {...match}, calls, lastIndex: regexp.lastIndex});
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}});
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, true);
	const actual = runInNewContext(result.output);
	t.assert.strictEqual(actual, runInNewContext(code));
	const {calls, lastIndex} = JSON.parse(actual);
	t.assert.strictEqual(calls, 1);
	t.assert.strictEqual(lastIndex, 3);
});

test('regexp arguments with side effects retain evaluation order', t => {
	const code = outdent`
		const regexp = /unfrozen/;
		/** @returns {string} */
		function read() {
			return Object.isFrozen(regexp) ? 'frozen' : 'unfrozen';
		}
		JSON.stringify(read().match(Object.freeze(regexp)));
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {plugins: {unicorn: plugin}, rules: {'unicorn/prefer-regexp-exec': 'error'}});
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(runInNewContext(result.output), '["unfrozen"]');
});
