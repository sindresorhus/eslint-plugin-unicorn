import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
		function_('try { /* comment */ new URL(value); return true; } catch { return false; }'),
		function_('try { new URL(value); /* comment */ return true; } catch { return false; }'),
		function_('try { new URL(value); return true; } catch { /* comment */ return false; }'),
		function_('try { new URL(value); return true; } catch ([error]) { return false; }'),
		function_('try { new URL(value); return true; } catch ({[sideEffect()]: error}) { return false; }'),
		'try { new URL(value); valid = true; } catch ([error]) { valid = false; }',
		'try { new URL(value); valid = true; } catch ({[sideEffect()]: error}) { valid = false; }',
		'try { new URL(value); /* comment */ valid = true; } catch { valid = false; }',
		'try { new URL(value); valid = true; } catch { /* comment */ valid = false; }',
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
	],
});
