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
		'unknown.match(/foo/)',
		'function run(text) { return text.match(/foo/); }',
		'const object = {match() {}}; object.match(/foo/)',
		'123..match(/foo/)',
		'"foo".match("foo")',
		'"foo".match(`foo`)',
		'"foo".match()',
		'"foo".match(/foo/, extra)',
		'"foo".match(...patterns)',
		'"foo"["match"](/foo/)',
		'"foo"[method](/foo/)',
		'"foo"?.match(/foo/)',
		'"foo".match?.(/foo/)',
		'object?.text.toString().match(/foo/)',
		'"foo".matchAll(/foo/g)',
		'/foo/.exec("foo")',
		'if ("foo".match(/foo/)) {}',
		'Boolean("foo".match(/foo/))',
		'!"foo".match(/foo/)',
		'if (condition && "foo".match(/foo/)) {}',
		'"foo".match(new RegExp("(", "i"))',
		'"foo".match(new RegExp("foo", "ii"))',
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
		'let regexp = /foo/; "foo".match(regexp)',
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
	],
});

ruleTest.snapshot({
	valid: [
		typeAware('declare const text: any; text.match(/foo/)'),
		typeAware('declare const text: unknown; text.match(/foo/)'),
		typeAware('declare function getPattern(): RegExp; "foo".match(new RegExp(getPattern()))'),
		typeAware('declare const text: {match(pattern: RegExp): unknown}; text.match(/foo/)'),
	],
	invalid: [
		typeAware('declare const object: {text: string}; object.text.match(/foo/)'),
		typeAware('declare function getText(): string; getText().match(/foo/)'),
		typeAware('function run<Text extends string>(text: Text) { return text.match(/foo/); }'),
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
	for (const argumentsText of ['pattern', 'pattern, undefined']) {
		const code = `const pattern = /a/g; function run(pattern) { return 'aa'.match(new RegExp(${argumentsText})); } JSON.stringify(run(pattern));`;
		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(runInNewContext(result.output), '["a","a"]');
	}
});
