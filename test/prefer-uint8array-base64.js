import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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

		// Not the global `atob`/`btoa`
		'const atob = string => string; atob(\'Zm9v\')',
		'function btoa() {} btoa(\'foo\')',
		'import {atob} from \'foo\'; atob(\'Zm9v\')',
		'foo.atob(\'Zm9v\')',
		'foo.btoa(\'foo\')',

		// Referenced but not called
		'const decode = atob;',
		'foo(btoa)',

		// `Buffer.from` without a base64 encoding
		'Buffer.from(string)',
		'Buffer.from(string, \'utf8\')',
		'Buffer.from(string, \'hex\')',
		'Buffer.from(array)',
		'Buffer.from([1, 2, 3])',
		'Buffer.from(string, encoding)',
		// Extra argument; `Uint8Array.fromBase64`'s second parameter is an options object, so the rewrite would not be equivalent
		'Buffer.from(string, \'base64\', extra)',
		// Wrong case, the encoding match is case-sensitive
		'Buffer.from(string, \'BASE64\')',
		// Not the `Buffer` constructor
		'const Buffer = {from() {}}; Buffer.from(string, \'base64\')',
		'import {Buffer} from \'not-buffer\'; Buffer.from(string, \'base64\')',
		'import {Buffer} from \'node:buffer\'; Buffer.from(string)',
		// Default import is the module namespace, not the `Buffer` constructor
		'import Buffer from \'node:buffer\'; Buffer.from(string, \'base64\')',

		// `toString` that isn't a base64 conversion
		'foo.toString()',
		'foo.toString(2)',
		'(123).toString(2)',
		'date.toString(\'en-US\')',
		'foo.toString(\'utf8\')',
		'foo.toString(\'hex\')',
		'foo[\'toString\'](\'base64\')',

		// With type information, a receiver that is known not to be byte-like is skipped
		typeAware('function foo(value: {toString(encoding: string): string}) { return value.toString(\'base64\'); }'),
		typeAware(outdent`
			interface Buffer extends Uint8Array { toString(encoding: string): string }
			interface Custom { toString(encoding: string): string }
			declare const value: Buffer | Custom;
			value.toString('base64');
		`),
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
		'const decoded = atob(encoded)',

		// `Buffer.from(…, 'base64' | 'base64url')`
		'Buffer.from(string, \'base64\')',
		'Buffer.from(string, \'base64url\')',
		'globalThis.Buffer.from(string, \'base64\')',
		'globalThis.Buffer?.from(string, \'base64\')',
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
		'getBuffer().toString(\'base64\')',
		'buffer.toString(\'base64\', 0, 10)',

		// TypeScript
		{code: '(globalThis as any).atob(string)', languageOptions: {parser: parsers.typescript}},
		// With type information, byte-like receivers are still reported
		typeAware('function foo(value: Uint8Array) { return value.toString(\'base64\'); }'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } declare const value: Buffer | Uint8Array; value.toString(\'base64\')'),
		typeAware('interface Buffer extends Uint8Array { toString(encoding: string): string } declare const value: Buffer | null | undefined; value?.toString(\'base64\')'),
		// `any` cannot be ruled out, so it is still reported
		typeAware('function foo(value: any) { return value.toString(\'base64\'); }'),
	],
});

// Native encoding options.
test.snapshot({
	valid: [
		'bytes.toBase64({omitPadding: true}).replaceAll(\'=\', \'\')',
		'bytes.toBase64(options).replaceAll(\'=\', \'\')',
		'bytes.toBase64(...options).replaceAll(\'=\', \'\')',
		'bytes.toBase64?.().replaceAll(\'=\', \'\')',
		'bytes?.toBase64().replaceAll(\'=\', \'\')',
		'bytes[\'toBase64\']().replaceAll(\'=\', \'\')',
		'bytes.toBase64().replaceAll?.(\'=\', \'\')',
		'bytes.toBase64()?.replaceAll(\'=\', \'\')',
		'bytes.toBase64()[\'replaceAll\'](\'=\', \'\')',
		'bytes.toBase64().replaceAll(\'+\', \'-\')',
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
