import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-url-can-parse': rule}}},
	rules: {'unicorn/prefer-url-can-parse': 'error'},
};

nodeTest('URL and base sequences preserve return and assignment validation results', t => {
	for (const [argumentsText, valid] of [
		['("http://[", "https://example.com")', true],
		['("https://example.com", "http://[")', false],
		['"relative", ("invalid", "https://example.com")', true],
		['"relative", ("https://example.com", "invalid")', false],
		['("http://[", "relative"), ("invalid", "https://example.com")', true],
		['("https://example.com", "http://["), ("https://example.com", "invalid")', false],
		['"https://example.com"', true],
		['"http://["', false],
	]) {
		for (const positive of [false, true]) {
			for (const assignment of [false, true]) {
				const code = assignment
					? outdent`
						let valid;
						try { new URL(${argumentsText}); valid = ${positive}; } catch { valid = ${!positive}; }
						valid;
					`
					: outdent`
						function validate() {
							try { new URL(${argumentsText}); return ${positive}; } catch { return ${!positive}; }
						}
						validate();
					`;
				const replacement = `${positive ? '' : '!'}URL.canParse(${argumentsText})`;
				const expectedOutput = assignment
					? outdent`
						let valid;
						valid = ${replacement};
						valid;
					`
					: outdent`
						function validate() {
							return ${replacement};
						}
						validate();
					`;
				const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
				t.assert.strictEqual(runInNewContext(code, {URL}), positive === valid);
				t.assert.strictEqual(output, expectedOutput);
				t.assert.strictEqual(runInNewContext(output, {URL}), positive === valid);
				t.assert.strictEqual(fixed, true);
				t.assert.deepStrictEqual(messages, []);
			}
		}
	}
});

const function_ = code => `function isValidUrl() { ${code} }`;
const asyncFunction = code => `async function isValidUrl() { ${code} }`;
const moduleFunction = code => `import {URL} from 'node:url'; function isValidUrl() { ${code} }`;
const moduleAliasFunction = code => `import {URL as NodeURL} from 'url'; function isValidUrl() { ${code} }`;
const interpolatedTemplateLiteral = ['`$', '{value}`'].join('');

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test({
	valid: [
		function_('try { new URL((read(), value)); return true; } catch { return false; }'),
		function_('try { new URL(value, (readBase(), base)); return true; } catch { return false; }'),
		function_('try { new URL((value++, value)); return true; } catch { return false; }'),
		function_('try { new URL((tag`value`, value)); return true; } catch { return false; }'),
		function_('try { new URL((Symbol.iterator, value)); return true; } catch { return false; }'),
	],
	invalid: [
		{
			code: function_('try { new URL(((invalid, value))); return true; } catch { return false; }'),
			output: function_('return URL.canParse((invalid, value));'),
			errors: [{messageId: 'prefer-url-can-parse'}],
		},
		{
			code: function_('try { new URL((invalid, (unused, value)), (invalidBase, base)); return false; } catch { return true; }'),
			output: function_('return !URL.canParse((invalid, (unused, value)), (invalidBase, base));'),
			errors: [{messageId: 'prefer-url-can-parse'}],
		},
		{
			code: 'let valid; try { new URL(value, ((invalid, base))); valid = false; } catch { valid = true; } consume(valid);',
			output: 'let valid; valid = !URL.canParse(value, (invalid, base)); consume(valid);',
			errors: [{messageId: 'prefer-url-can-parse'}],
		},
		{
			code: moduleAliasFunction('try { new NodeURL((invalid, value), (invalidBase, base)); return true; } catch { return false; }'),
			output: moduleAliasFunction('return NodeURL.canParse((invalid, value), (invalidBase, base));'),
			errors: [{messageId: 'prefer-url-can-parse'}],
		},
		...[
			['((invalid, value) as string)', '(invalid, value) as string'],
			['((invalid, value) satisfies string)', '(invalid, value) satisfies string'],
			['(invalid, value)!', '(invalid, value)!'],
			['(<string>(invalid, value))', '<string>(invalid, value)'],
		].map(([argument, expected]) => ({
			...typescript(function_(`try { new URL(${argument}); return true; } catch { return false; }`)),
			output: function_(`return URL.canParse(${expected});`),
			errors: [{messageId: 'prefer-url-can-parse'}],
		})),
		{
			...typescript('let valid: boolean; try { new URL((invalid, value as string), ((invalidBase, base) satisfies string)); valid = true; } catch { valid = false; }'),
			output: 'let valid: boolean; valid = URL.canParse((invalid, value as string), (invalidBase, base) satisfies string);',
			errors: [{messageId: 'prefer-url-can-parse'}],
		},
		...[
			function_('try { new URL((invalid, /* keep */ value)); return true; } catch { return false; }'),
			function_('try { new URL(value, (invalid, base) /* keep */); return true; } catch { return false; }'),
		].map(code => ({code, errors: [{messageId: 'prefer-url-can-parse'}]})),
	],
});

test.snapshot({
	valid: [
		'const valid = URL.canParse(value);',
		'const url = new URL(value);',
		'try { new URL(value); } catch {}',
		function_('try { new URL(value); return true; } catch { return true; }'),
		function_('try { new URL(value); return isValid; } catch { return false; }'),
		function_('try { new URL(value); return true; } catch { return isValid; }'),
		function_('try { new URL(value); return true; } catch { log(error); return false; }'),
		function_('try { new URL(value); log(url); return true; } catch { return false; }'),
		'try { new URL(value); valid = true; } catch { other = false; }',
		'try { new URL(value); valid += true; } catch { valid = false; }',
		'try { new URL(value); valid = true; } catch { valid = false; } finally {}',
		function_('try { new URL(...arguments_); return true; } catch { return false; }'),
		function_('try { new URL(value, base, extra); return true; } catch { return false; }'),
		function_('try { new globalThis.URL(value); return true; } catch { return false; }'),
		function_('try { new URL(getValue()); return true; } catch { return false; }'),
		function_('try { new URL(value, getBase()); return true; } catch { return false; }'),
		function_('try { new URL(value++); return true; } catch { return false; }'),
		function_('try { new URL(value + ""); return true; } catch { return false; }'),
		function_('try { new URL({toString() { throw new Error("Invalid URL"); }}); return true; } catch { return false; }'),
		function_('try { new URL(value, {toString() { throw new Error("Invalid base URL"); }}); return true; } catch { return false; }'),
		function_('try { new URL([{toString() { throw new Error("Invalid URL"); }}]); return true; } catch { return false; }'),
		function_('try { new URL(class { static { throw new Error("Invalid URL"); } }); return true; } catch { return false; }'),
		function_(`try { new URL(${interpolatedTemplateLiteral}); return true; } catch { return false; }`),
		function_('try { new URL(tag`value`); return true; } catch { return false; }'),
		asyncFunction('try { new URL(await value); return true; } catch { return false; }'),
		function_('try { new URL(Symbol()); return true; } catch { return false; }'),
		function_('try { new URL(Symbol("url")); return true; } catch { return false; }'),
		function_('try { new URL(Symbol.for("url")); return true; } catch { return false; }'),
		function_('try { new URL(Symbol.iterator); return true; } catch { return false; }'),
		function_('try { new URL(value, Symbol.iterator); return true; } catch { return false; }'),
		function_('try { new URL([Symbol.iterator]); return true; } catch { return false; }'),
		function_('try { new URL(value, [Symbol.iterator]); return true; } catch { return false; }'),
		function_('try { new URL(Symbol["for"]("url")); return true; } catch { return false; }'),
		function_('try { new URL(Symbol["iterator"]); return true; } catch { return false; }'),
		function_('try { new URL(Symbol?.for("url")); return true; } catch { return false; }'),
		function_('try { new URL(Symbol?.iterator); return true; } catch { return false; }'),
		typescript(function_('try { new URL(Symbol.iterator as symbol); return true; } catch { return false; }')),
		typescript(function_('try { new URL(Symbol.for("url")!); return true; } catch { return false; }')),
		typescript(function_('try { new URL((Symbol as any).iterator); return true; } catch { return false; }')),
		typescript(function_('try { new URL((Symbol as any).for("url")); return true; } catch { return false; }')),
		typescript('import type {Symbol} from "symbol"; function isValidUrl() { try { new URL(Symbol.iterator); return true; } catch { return false; } }'),
		typescript('declare const Symbol: SymbolConstructor; function isValidUrl() { try { new URL(Symbol.iterator); return true; } catch { return false; } }'),
		function_('const URL = class {}; try { new URL(value); return true; } catch { return false; }'),
		moduleFunction('{ const URL = class {}; try { new URL(value); return true; } catch { return false; } }'),
		function_('try { new NotURL(value); return true; } catch { return false; }'),
		function_('try { new URL(value); return true; } catch ([error]) { return false; }'),
		function_('try { new URL(value); return true; } catch ({[sideEffect()]: error}) { return false; }'),
		'try { new URL(value); valid = true; } catch ([error]) { valid = false; }',
		'try { new URL(value); valid = true; } catch ({[sideEffect()]: error}) { valid = false; }',
		'try { new URL(value); valid = true; } catch (valid) { valid = false; }',
	],
	invalid: [
		function_('try { new URL(value); return true; } catch { return false; }'),
		`function isValidUrl() {
	try {
		new URL(value, base);
		return true;
	} catch {
		return false;
	}
}`,
		function_('try { new URL(value); return false; } catch { return true; }'),
		function_('try { new URL(value, base); return true; } catch { return false; }'),
		function_('try { new URL((value)); return true; } catch { return false; }'),
		function_('const Symbol = {iterator: value}; try { new URL(Symbol.iterator); return true; } catch { return false; }'),
		'try { new URL(value); valid = true; } catch { valid = false; }',
		'try { new URL(value); valid = false; } catch { valid = true; }',
		'let valid; try { new URL(value); valid = true; } catch { valid = false; }',
		'let valid; try { new URL(value); valid = false; } catch { valid = true; }',
		'let valid; /* comment */ try { new URL(value); valid = true; } catch { valid = false; }',
		'let valid; try { new URL(valid); valid = true; } catch { valid = false; }',
		'let valid; try { new URL(value); valid = true; } catch { valid = false; } valid = maybe;',
		'const value = {toString() { return valid; }}; let valid; try { new URL(value); valid = true; } catch { valid = false; }',
		'try { new URL(value); valid = true; } catch (error) { valid = false; }',
		moduleFunction('try { new URL(value); return true; } catch { return false; }'),
		moduleAliasFunction('try { new NodeURL(value); return true; } catch { return false; }'),
		moduleAliasFunction('try { new NodeURL(value, base); return true; } catch { return false; }'),
		typescript('import type {URL} from "node:url"; function isValidUrl() { try { new URL(value); return true; } catch { return false; } }'),
		typescript('declare const URL: URLConstructor; function isValidUrl() { try { new URL(value); return true; } catch { return false; } }'),
		function_('try { new URL(value); return true; } catch (error) { return false; }'),
		function_('const foo = 1\ntry { new URL(value); return true; } catch { return false; }'),
		typescript(function_('try { new URL(value as string); return true; } catch { return false; }')),
		typescript('let valid: boolean; try { new URL(value); valid = true; } catch { valid = false; }'),
		function_('try { /* comment */ new URL(value); return true; } catch { return false; }'),
		function_('try { new URL(value); /* comment */ return true; } catch { return false; }'),
		function_('try { new URL(value); return true; } catch { /* comment */ return false; }'),
		'try { new URL(value); /* comment */ valid = true; } catch { valid = false; }',
		'try { new URL(value); valid = true; } catch { /* comment */ valid = false; }',
	],
});
