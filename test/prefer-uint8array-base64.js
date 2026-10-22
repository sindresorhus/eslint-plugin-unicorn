import {Buffer} from 'node:buffer';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		'Buffer.from(string, tag`base64`)',
		'Buffer.from(string, `base${encoding}`)', // eslint-disable-line no-template-curly-in-string
		'Buffer.from(string, ``)',
		'bytes.toBase64().replaceAll(tag`=`, ``)',
		'bytes.toBase64().replaceAll(`=`, tag``)',
	],
	invalid: [
		'Buffer.from(base64, `base64`)',
		'Buffer.from(`Zm9v`, `BASE64URL`)',
		'Buffer.from(base64, `base\\u{36}4`)',
		'buffer.toString(`base64url`)',
		'Buffer.from(base64, /* keep */ `base64`)',
		'bytes.toBase64().replaceAll(`+`, `-`).replaceAll("/", `_`).replaceAll(`=`, ``)',
		'bytes.toBase64().replace(/=+$/, ``)',
		{code: '(buffer as Buffer).toString(`base64`)', languageOptions: {parser: parsers.typescript}},
	],
});

test({
	valid: [],
	invalid: [
		['function f() {return(Buffer).from(getText(/* keep */), "base64");}', 'function f() {return Uint8Array.fromBase64(getText(/* keep */));}'],
		['function f() {throw(Buffer).from(getText(/* keep */), "base64");}', 'function f() {throw Uint8Array.fromBase64(getText(/* keep */));}'],
		['typeof(Buffer).from(getText(/* keep */), "base64url");', 'typeof Uint8Array.fromBase64(getText(/* keep */), {alphabet: \'base64url\'});'],
	].map(([code, output]) => ({
		code,
		errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: [{messageId: 'prefer-uint8array-base64/suggestion', output}]}],
	})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'getBytes(/* keep */).toBase64().replaceAll(\'=\', \'\');',
			output: 'getBytes(/* keep */).toBase64({omitPadding: true});',
			errors: [{messageId: 'prefer-uint8array-base64/options'}],
		},
		...[
			['Buffer.from(getText(/* keep */), \'base64\');', 'Uint8Array.fromBase64(getText(/* keep */));'],
			['Buffer.from((/* keep */ text), \'base64url\');', 'Uint8Array.fromBase64((/* keep */ text), {alphabet: \'base64url\'});'],
		].map(([code, output]) => ({code, errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: [{messageId: 'prefer-uint8array-base64/suggestion', output}]}]})),
	],
});

test({
	valid: [],
	invalid: [
		...[
			['bytes.toBase64(\r\n  // keep\r\n).replaceAll(\'=\', \'\');', 'bytes.toBase64(\r\n  // keep\r\n{omitPadding: true});'],
			['(/* keep */ bytes.toBase64()).replaceAll(\'=\', \'\');', '(/* keep */ bytes.toBase64({omitPadding: true}));'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'prefer-uint8array-base64/options'}]})),
		{
			code: '(bytes as /* keep */ Uint8Array).toBase64().replaceAll(\'=\', \'\');',
			output: '(bytes as /* keep */ Uint8Array).toBase64({omitPadding: true});',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'prefer-uint8array-base64/options'}],
		},
		{
			code: 'Buffer.from((text as /* keep */ string), \'base64\');',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'prefer-uint8array-base64/error',
				suggestions: [{messageId: 'prefer-uint8array-base64/suggestion', output: 'Uint8Array.fromBase64((text as /* keep */ string));'}],
			}],
		},
		{
			code: 'Buffer.from(getText(\r\n  // keep\r\n), \'base64url\');',
			errors: [{
				messageId: 'prefer-uint8array-base64/error',
				suggestions: [{messageId: 'prefer-uint8array-base64/suggestion', output: 'Uint8Array.fromBase64(getText(\r\n  // keep\r\n), {alphabet: \'base64url\'});'}],
			}],
		},
		...[
			'Buffer./* keep */from(text, \'base64\');',
			'Buffer.from(text, (/* keep */ \'base64url\'));',
		].map(code => ({code, errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: []}]})),
	],
});

// eslint-disable-next-line node-test/no-skip-test -- Uint8Array#toBase64 is unavailable on older supported Node.js versions.
nodeTest('commented base64 option fixes preserve encoding and evaluate the receiver once', {skip: !('toBase64' in Uint8Array.prototype)}, t => {
	const linter = new Linter();
	for (const [code, expected] of [
		['getBytes(/* keep */).toBase64().replaceAll(\'=\', \'\')', '+/8'],
		['getBytes(/* keep */).toBase64().replaceAll(\'+\', \'-\').replaceAll(\'/\', \'_\').replaceAll(\'=\', \'\')', '-_8'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'prefer-uint8array-base64': rule}}},
			rules: {'unicorn/prefer-uint8array-base64': 'error'},
		});
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		for (const source of [code, output]) {
			let evaluations = 0;
			const result = runInNewContext(source, {
				getBytes() {
					evaluations++;
					return new Uint8Array([251, 255]);
				},
			});
			t.assert.strictEqual(evaluations, 1);
			t.assert.strictEqual(result, expected);
		}
	}
});

// eslint-disable-next-line node-test/no-skip-test -- Uint8Array.fromBase64 is unavailable on older supported Node.js versions.
nodeTest('commented base64 inputs decode once and result type changes remain suggestions', {skip: !('fromBase64' in Uint8Array)}, t => {
	const linter = new Linter();
	for (const [encoding, text, expected] of [['base64', 'Zm9v', [102, 111, 111]], ['base64url', '-_8', [251, 255]]]) {
		const code = `function decode() {return(Buffer).from(getText(/* keep */), '${encoding}');} decode();`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'prefer-uint8array-base64': rule}}},
			rules: {'unicorn/prefer-uint8array-base64': 'error'},
		});
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].suggestions?.length, 1);
		const {fix} = messages[0].suggestions[0];
		const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.ok(suggested.includes('/* keep */'));
		for (const source of [code, suggested]) {
			let evaluations = 0;
			const result = runInNewContext(source, {
				Buffer,
				Uint8Array,
				getText() {
					evaluations++;
					return text;
				},
			});
			t.assert.strictEqual(evaluations, 1);
			t.assert.deepStrictEqual([...result], expected);
			t.assert.strictEqual(Buffer.isBuffer(result), source === code);
		}
	}
});

// Restricting `toString('base64')` by receiver type needs type information. Use the raw TypeScript parser with `projectService` (the shared `parsers.typescript` injects `project: []`, which conflicts with `projectService`).
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// Recommended replacements
		'Uint8Array.fromBase64(string)',
		'Uint8Array.fromBase64(string, {alphabet: \'base64url\'})',
		'bytes.toBase64()',
		'bytes.toBase64({alphabet: \'base64url\'})',
		'bytes.toBase64().toString(\'base64\')',
		'bytes.toBase64().trim().slice(1).toString(\'base64\')',
		'bytes.toBase64().replaceAll(\'x\', \'\').toString(\'base64\')',
		'bytes[\'toBase64\']().toString(\'base64\')',
		'(bytes?.toBase64()).toString(\'base64\')',
		'(await bytes.toBase64().trim()).toString(\'base64\')',
		{code: '(bytes.toBase64() as unknown).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(await (value satisfies string)).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},

		// Not the global `atob`/`btoa`
		'const atob = string => string; atob(\'Zm9v\')',
		'function btoa() {} btoa(\'foo\')',
		'import {atob} from \'foo\'; atob(\'Zm9v\')',
		'foo.atob(\'Zm9v\')',
		'foo.btoa(\'foo\')',
		'const global = {atob() {}}; global.atob(\'Zm9v\')',

		// Referenced but not called
		'const decode = atob;',
		'foo(btoa)',

		// `Buffer.from` calls that are not base64 string decoding
		'Buffer.from(string)',
		'Buffer.from(string, \'utf8\')',
		'Buffer.from(string, \'hex\')',
		'Buffer.from(array)',
		'Buffer.from([1, 2, 3])',
		'Buffer.from([value], \'base64\')',
		'Buffer.from({length: 1, 0: 65}, \'base64\')',
		'Buffer.from(123, \'base64\')',
		'Buffer.from(null, \'base64\')',
		'Buffer.from(void 0, \'base64\')',
		'Buffer.from(1 + 2, \'base64\')',
		'Buffer.from(left - right, \'base64\')',
		'Buffer.from(input ?? new Uint8Array([1]), \'base64\')',
		'Buffer.from(new Uint8Array([1]), \'base64\')',
		'Buffer.from(new ArrayBuffer(8), \'base64\')',
		'const input = new Uint8Array(); Buffer.from(input, \'base64\')',
		'const input = []; Buffer.from(input, \'base64\')',
		'const input = {}; Buffer.from(input, \'base64\')',
		'const input = Buffer.from(data); Buffer.from(input, \'base64\')',
		'Buffer.from(bytes?.toBase64(), \'base64\')',
		'Buffer.from(bytes.toBase64?.(), \'base64\')',
		'Buffer.from(bytes.toBase64().split(\'\'), \'base64\')',
		'Buffer.from(condition ? new Uint8Array() : Buffer.from(data), \'base64\')',
		'Buffer.from(condition ? bytes.toBase64() : new Uint8Array(), \'base64\')',
		'const array = []; Buffer.from(array || string, \'base64\')',
		{code: 'Buffer.from((new Uint8Array()) as Uint8Array, \'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: 'Buffer.from(value as Uint8Array, \'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: 'Buffer.from(([value] satisfies unknown[]), \'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: 'Buffer.from((bytes.toBase64().split(\'\') as string[]), \'base64\')', languageOptions: {parser: parsers.typescript}},
		typeAware('function foo(value: Uint8Array) { return Buffer.from(value, \'base64\'); }'),
		'Buffer.from(string, encoding)',
		'Buffer.from(...inputs, \'base64\')',
		// Extra argument; `Uint8Array.fromBase64`'s second parameter is an options object, so the rewrite would not be equivalent
		'Buffer.from(string, \'base64\', extra)',
		// Not the `Buffer` constructor
		'const Buffer = {from() {}}; Buffer.from(string, \'base64\')',
		'import {Buffer} from \'not-buffer\'; Buffer.from(string, \'base64\')',
		'import {Buffer} from \'node:buffer\'; Buffer.from(string)',
		// Default import is the module namespace, not the `Buffer` constructor
		'import Buffer from \'node:buffer\'; Buffer.from(string, \'base64\')',
		{code: 'import Buffer = require(\'node:buffer\'); Buffer.from(string, \'base64\')', languageOptions: {parser: parsers.typescript}},

		// `toString` that isn't a base64 conversion
		'foo.toString()',
		'foo.toString(2)',
		'(123).toString(2)',
		'date.toString(\'en-US\')',
		'foo.toString(\'utf8\')',
		'foo.toString(\'hex\')',
		'foo[\'toString\'](\'base64\')',
		'buffer.toString(\'base64\', 0, 10)',
		'Buffer.toString(\'base64\')',
		'import {Buffer as B} from \'node:buffer\'; B.toString(\'base64\')',
		'\'foo\'.toString(\'base64\')',
		'`foo`.toString(\'base64\')',
		'String(value).toString(\'base64\')',
		'(\'prefix\' + value).toString(\'base64\')',
		'(123).toString(\'base64\')',
		'Math.PI.toString(\'base64\')',
		'(String(input) || \'\').toString(\'base64\')',
		'const value = null; value?.toString(\'base64\')',
		'const value = void 0; value?.toString(\'base64\')',
		'[1, 2].toString(\'base64\')',
		'({toString() { return \'custom\'; }}).toString(\'base64\')',
		'(() => {}).toString(\'base64\')',
		'(class {}).toString(\'base64\')',
		'/x/.toString(\'base64\')',
		'new Uint8Array().toString(\'base64\')',
		'new Date().toString(\'base64\')',
		'const bytes = new Uint8Array(); bytes.toString(\'base64\')',
		'const values = []; values.toString(\'base64\')',
		{code: '(value as string).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(<string>value).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(value satisfies string).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(value as number).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(<number>value).toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const bytes: Uint8Array; bytes.toString(\'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: 'import * as buffer from \'node:buffer\'; declare const input: buffer.Buffer; Buffer.from(input, \'base64\')', languageOptions: {parser: parsers.typescript}},

		// With type information, a receiver that is known not to be a `Buffer` is skipped
		typeAware('function foo(value: Uint8Array) { return value.toString(\'base64\'); }'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } declare const value: Buffer | Uint8Array; value.toString(\'base64\')'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } function foo<T extends Buffer | Uint8Array>(value: T) { return value.toString(\'base64\'); }'),
		typeAware('function foo(value: {toString(encoding: string): string}) { return value.toString(\'base64\'); }'),
		typeAware(outdent`
			interface Buffer extends Uint8Array { toString(encoding: string): string }
			interface Custom { toString(encoding: string): string }
			declare const value: Buffer | Custom;
			value.toString('base64');
		`),
		// `Buffer` on an object that is not a global object
		'this.Buffer.from(string, \'base64\')',
		// A `Buffer` input is copied and the encoding is ignored
		{code: 'Buffer.from(value as Buffer, \'base64\')', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		// `atob`/`btoa`
		'atob(string)',
		'btoa(string)',
		'window.atob(string)',
		'window.btoa(string)',
		'globalThis.atob(string)',
		'globalThis.btoa(string)',
		'self.atob(string)',
		'global.atob(string)',
		'const decoded = atob(encoded)',

		// `Buffer.from(…, 'base64' | 'base64url')`
		'Buffer.from(string, \'base64\')',
		'Buffer.from(\'Zm9v\', \'base64\')',
		'const input = \'Zm9v\'; Buffer.from(input, \'base64\')',
		'Buffer.from(left + right, \'base64\')',
		'Buffer.from(string, \'base64url\')',
		'Buffer.from(string, \'BASE64\')',
		'Buffer.from(string, \'BaSe64UrL\')',
		'globalThis.Buffer.from(string, \'base64\')',
		'globalThis.Buffer?.from(string, \'base64\')',
		'Buffer.from?.(string, \'base64\')',
		'Buffer.from(string, \'base64\').toString()',
		'(Buffer.from?.(string, \'base64\')).toString()',
		{code: '(Buffer.from(string, \'base64\') as Buffer).toString()', languageOptions: {parser: parsers.typescript}},
		{code: 'Buffer.from(string, \'base64\')!.toString()', languageOptions: {parser: parsers.typescript}},
		{code: '(Buffer.from(string, \'base64\') satisfies Buffer).toString()', languageOptions: {parser: parsers.typescript}},
		{code: '(<Buffer>Buffer.from(string, \'base64\')).toString()', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.Buffer?.from(string, \'base64\') as Buffer).toString()', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis as any).Buffer.from(string, \'base64\')', languageOptions: {parser: parsers.typescript}},
		{code: '(globalThis.Buffer as typeof Buffer).from(string, \'base64\')', languageOptions: {parser: parsers.typescript}},
		// Imported `Buffer`
		'import {Buffer} from \'node:buffer\'; Buffer.from(string, \'base64\')',
		'import {Buffer} from \'buffer\'; Buffer.from(string, \'base64\')',
		'import {Buffer as B} from \'node:buffer\'; B.from(string, \'base64url\')',
		'import * as buffer from \'node:buffer\'; buffer.Buffer.from(string, \'base64\')',
		'import buffer from \'node:buffer\'; buffer.Buffer.from(string, \'base64\')',
		{code: 'import {Buffer as B} from \'node:buffer\'; (B as typeof Buffer).from(string, \'base64\')', languageOptions: {parser: parsers.typescript}},
		// Suggestion withheld because of the comment
		'Buffer.from(string, /* keep me */ \'base64\')',
		outdent`
			Buffer.from(
				string,
				'base64url',
			)
		`,

		// `toString('base64' | 'base64url')`
		'buffer.toString(\'base64\')',
		'buffer.toString(\'base64url\')',
		'buffer.toString(\'BASE64\')',
		'buffer.toString(\'BaSe64UrL\')',
		'getBuffer().toString(\'base64\')',
		'new Buffer(0).toString(\'base64\')',
		'const buffer = Buffer.from(data); buffer.toString(\'base64\')',
		'const buffer = condition ? Buffer.from(data) : null; buffer?.toString(\'base64\')',
		'const buffer = condition ? Buffer.from(data) : void 0; buffer?.toString(\'base64\')',
		'import {Buffer as B} from \'node:buffer\'; new B(0).toString(\'base64\')',

		// TypeScript
		{code: '(globalThis as any).atob(string)', languageOptions: {parser: parsers.typescript}},
		// With type information, `Buffer` receivers are still reported
		typeAware('import {Buffer} from \'node:buffer\'; declare const value: Buffer; value.toString(\'base64\')'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } declare const value: Buffer | undefined; value?.toString(\'base64\')'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } declare const value: Buffer & {readonly extra: true}; value.toString(\'base64\')'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } function foo<T extends Buffer>(value: T) { return value.toString(\'base64\'); }'),
		// `any` cannot be ruled out, so it is still reported
		typeAware('function foo(value: any) { return value.toString(\'base64\'); }'),
		'Buffer.from(await value, \'base64\')',
		'Buffer.from(foo?.bar, \'base64\')',
		{code: 'Buffer.from(value as unknown, \'base64\')', languageOptions: {parser: parsers.typescript}},
		'(condition ? value : Buffer.from(string, \'base64\')).toString()',
		'Buffer.from(string, \'base64\') ? foo : bar',
		'foo.Array.toString(\'base64\')',
		'const globalThis = {}; globalThis.Array.toString(\'base64\')',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '(await Buffer.from(string, \'base64\')).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: '(condition ? Buffer.from(string, \'base64\') : fallback).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: '(fallback ?? Buffer.from(string, \'base64\')).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: '(fallback, Buffer.from(string, \'base64\')).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: '(buffer = Buffer.from(string, \'base64\')).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: '(buffer ??= Buffer.from(string, \'base64\')).toString()',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 0}],
		},
		{
			code: 'bytes.toBase64().replaceAll(\'=\', \'\').toString(\'base64\')',
			output: 'bytes.toBase64({omitPadding: true}).toString(\'base64\')',
			errors: [{messageId: 'prefer-uint8array-base64/options'}],
		},
		{
			code: 'Buffer.from(input || \'\', \'base64\')',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 1}],
		},
		{
			code: 'Buffer.from(condition ? input : \'\', \'base64\')',
			errors: [{messageId: 'prefer-uint8array-base64/error', suggestions: 1}],
		},
	],
});

// Native encoding options.
test.snapshot({
	valid: [
		// A single substitution is not what the `base64url` alphabet does
		'bytes.toBase64().replaceAll(\'+\', \'-\')',
		'bytes.toBase64().replaceAll(\'/\', \'_\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\').replaceAll(\'=\', \'\')',
		'bytes.toBase64({omitPadding: true}).replaceAll(\'=\', \'\')',
		'bytes.toBase64(options).replaceAll(\'=\', \'\')',
		'bytes.toBase64(...options).replaceAll(\'=\', \'\')',
		'bytes.toBase64?.().replaceAll(\'=\', \'\')',
		'bytes?.toBase64().replaceAll(\'=\', \'\')',
		'bytes[\'toBase64\']().replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll?.(\'=\', \'\')',
		'bytes.toBase64()?.replaceAll(\'=\', \'\')',
		'bytes.toBase64()[\'replaceAll\'](\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'/\', \'_\').replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'=\', \'\').replaceAll(\'+\', \'-\')',
		'bytes.toBase64().replaceAll(\'=\', \'\').replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\').replaceAll(\'/\', \'_\').replaceAll(\'+\', \'-\')',
		'bytes.toBase64().replace(\'+\', \'-\').replaceAll(\'/\', \'_\')',
		String.raw`bytes.toBase64().replace(/\+/, '-').replaceAll('/', '_')`,
		String.raw`bytes.toBase64().replace(/\+/gy, '-').replaceAll('/', '_')`,
		'bytes.toBase64().replace(/=+$/y, \'\')',
		'bytes.toBase64().replace(/=$/, \'\')',
		'bytes.toBase64().replaceAll(/=+$/, \'\')',
		'bytes.toBase64().replaceAll(\'=\', replacement)',
		'bytes.toBase64().replaceAll(pattern, \'\')',
		'bytes.toBase64().replaceAll(\'=\', \'padding\')',
		'bytes.toBase64().replaceAll(\'+\', \'_\').replaceAll(\'/\', \'-\')',
		'bytes.toBase64().replaceAll(\'x\', \'\')',
		'bytes.toBase64().replace(\'=\', \'\')',
		'bytes.toBase64().replaceAll(...arguments)',
		'bytes.toBase64().replaceAll(\'=\', \'\', extra)',
		'bytes.toBase64().trim().replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\').trim().replaceAll(\'/\', \'_\')',
	],
	invalid: [
		'bytes.toBase64().replaceAll(\'+\', \'-\').replaceAll(\'/\', \'_\').replace(/=+$/, \'\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\').replaceAll(\'/\', \'_\')',
		'bytes.toBase64().replaceAll(\'/\', \'_\').replaceAll(\'+\', \'-\')',
		String.raw`bytes.toBase64().replace(/\+/g, '-').replace(/\//g, '_')`,
		String.raw`bytes.toBase64().replaceAll(/\+/g, '-').replaceAll(/\//g, '_')`,
		String.raw`bytes.toBase64().replaceAll('/', '_').replace(/\+/g, '-')`,
		String.raw`bytes.toBase64().replace(/\+/gu, '-').replace(/\//gd, '_')`,
		'bytes.toBase64().replace(/=+$/, \'\')',
		'bytes.toBase64().replace(/=+$/g, \'\')',
		'bytes.toBase64().replace(/=+$/u, \'\')',
		'bytes.toBase64().replaceAll(/=+$/g, \'\')',
		'bytes.toBase64().replaceAll(/=+$/gs, \'\')',
		'bytes.toBase64().replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'=\', \'\').replaceAll(\'/\', \'_\').replaceAll(\'+\', \'-\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\').replaceAll(\'=\', \'\').replaceAll(\'/\', \'_\')',
		'getBytes().toBase64().replaceAll(\'=\', \'\').slice(1)',
		'((bytes.toBase64())).replaceAll(\'=\', \'\')',
		'((bytes.toBase64().replaceAll))(\'=\', \'\')',
		'(((((bytes.toBase64))()).replaceAll)(\'+\', \'-\').replaceAll)(\'/\', \'_\').replace(/=+$/, \'\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\') /* keep */.replaceAll(\'/\', \'_\').replace(/=+$/, \'\')',
		'bytes.toBase64(/* keep */).replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll(/* keep */ \'=\', \'\')',
		'bytes.toBase64() /* keep */.replaceAll(\'=\', \'\')',
		{code: '(bytes as Uint8Array).toBase64().replaceAll(\'=\', \'\')', languageOptions: {parser: parsers.typescript}},
		{code: 'bytes!.toBase64().replaceAll(\'=\', \'\')', languageOptions: {parser: parsers.typescript}},
		{code: '(bytes satisfies Uint8Array).toBase64().replaceAll(\'=\', \'\')', languageOptions: {parser: parsers.typescript}},
	],
});
