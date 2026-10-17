import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {ScriptTarget, transpileModule} from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test.snapshot({
	valid: [
		'"🦄".codePointAt(0)',
		'foo.charCodeAt',
		'new foo.charCodeAt',
		'charCodeAt(0)',
		'foo.charCodeAt?.(0)',
		'foo[charCodeAt](0)',
		'foo["charCodeAt"](0)',
		'foo.notCharCodeAt(0)',

		'String.fromCodePoint(0x1f984)',
		'String.fromCodePoint',
		'new String.fromCodePoint',
		'fromCodePoint(foo)',
		'String.fromCodePoint?.(foo)',
		'String?.fromCodePoint(foo)',
		'window.String.fromCodePoint(foo)',
		'String[fromCodePoint](foo)',
		'String["fromCodePoint"](foo)',
		'String.notFromCodePoint(foo)',
		'NotString.fromCodePoint(foo)',
	],
	invalid: [
		'string.charCodeAt(index)',
		'string?.charCodeAt(index)',
		'(( (( string )).charCodeAt( ((index)), )))',
		// Result used as a number: reported, but no suggestion offered
		'hash = (((hash * 31) | 0) + string.charCodeAt(offset)) | 0',
		'string.charCodeAt(index) + 1',
		'string.charCodeAt(index) * 31',
		'string.charCodeAt(index) - 48',
		'(string.charCodeAt(index) | 0)',
		'string.charCodeAt(index) ^ hash',
		'(hash << 5) - hash + string.charCodeAt(index)',
		'sum += string.charCodeAt(index)',
		'sum += condition ? string.charCodeAt(index) : 0',
		'sum += string.charCodeAt(index) || 0',
		'string?.charCodeAt(index) + 1',
		'~string.charCodeAt(index)',
		'-string.charCodeAt(index)',
		// Result not used as a number: suggestion retained
		'string.charCodeAt(index).toString(16)',
		'string.charCodeAt(index) > 127',
		'foo(string.charCodeAt(index))',
		'const x = string.charCodeAt(index)',
		'string.charCodeAt(index) === 65',
		'string.charCodeAt(index) || 0',
		'!string.charCodeAt(index)',
		'String.fromCharCode( code )',
		'(( (( String )).fromCharCode( ((code)), ) ))',
		'String.fromCharCode.bind(String)',
		'const x = String.fromCharCode',
		// Multiple arguments
		'String.fromCharCode(65, 66, 67)',
		// TypeScript wrappers on the receiver
		{code: 'foo!.charCodeAt(0)', languageOptions: {parser: parsers.typescript}},
		{code: '(str as string).charCodeAt(0)', languageOptions: {parser: parsers.typescript}},
		'sum += condition ? 0 : string.charCodeAt(index)',
		'sum += string.charCodeAt(index) ? 1 : 0',
	],
});

// Type wrappers do not make numeric use safe for codePointAt.
test({
	valid: [],
	invalid: [
		'text.charCodeAt(0)! ^ 0;',
		'(text.charCodeAt(0) as number) ^ 0;',
		'(text.charCodeAt(0) satisfies number) ^ 0;',
	].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'error/charCodeAt', suggestions: []}]})),
});

test({
	valid: [],
	invalid: [
		...[
			'(<number>text.charCodeAt(0)) ^ 0;',
			'sum += (text?.charCodeAt(0)! || 0) as number;',
			'sum += ready ? (text.charCodeAt(0) as number) : 0;',
			'-(text.charCodeAt(0) as number);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'error/charCodeAt', suggestions: []}]})),
		{
			code: 'const value = text.charCodeAt(0)!;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'error/charCodeAt', suggestions: [{messageId: 'suggestion/codePointAt', output: 'const value = text.codePointAt(0)!;'}]}],
		},
	],
});

nodeTest('type wrappers do not enable suggestions that change string hashes', t => {
	const linter = new Linter();
	const code = 'const text = "𝌆"; text.charCodeAt(0)! ^ 0;';
	const config = {languageOptions: {parser: typescriptEslintParser}, plugins: {unicorn: {rules: {'prefer-code-point': rule}}}, rules: {'unicorn/prefer-code-point': 'error'}};
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	const {outputText, diagnostics} = transpileModule(output, {compilerOptions: {target: ScriptTarget.ESNext}, reportDiagnostics: true});
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages[0].suggestions, undefined);
	t.assert.deepStrictEqual(diagnostics, []);
	t.assert.strictEqual(runInNewContext(outputText), 55_348);
});
