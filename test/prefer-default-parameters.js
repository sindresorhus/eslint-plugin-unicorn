import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const fn = a => [a, a ?? 3];',
		'const fn = a => [a ?? 3, a ?? 4];',
		'const fn = a => [a ?? 3, a || 3];',
		'const fn = a => [a ?? 3, a ?? "3"];',
		'const fn = a => 3 ?? a;',
		'const fn = a => a && 3;',
		'const fn = a => a?.value ?? 3;',
		'const fn = a => a ?? getDefault();',
		'const fn = a => a ?? DEFAULT;',
		'const fn = a => a ?? {};',
		'const fn = a => a ?? /pattern/;',
		'const fn = a => a ?? -3;',
		'const fn = a => 3;',
		'const fn = (a = 1) => a ?? 3;',
		'const fn = ({a = 1}) => a ?? 3;',
		'const fn = ([a = 1]) => a ?? 3;',
		'const fn = (a, b) => a ?? 3;',
		'const fn = (...a) => a ?? 3;',
		'const fn = ({...a}) => a ?? 3;',
		'const fn = ([...a]) => a ?? 3;',
		'const fn = a => { a = undefined; return a ?? 3; };',
		'const fn = a => { a++; return a ?? 3; };',
		'const fn = a => { function reset() { a = undefined; } return a ?? 3; };',
		'const fn = a => { function read() { return a; } return a ?? 3; };',
		'const fn = a => { var a; return a ?? 3; };',
		'function fn(a) { "use strict"; return a ?? 3; }',
		'const a = undefined; console.log(a ?? 3);',
		'const {a} = options; console.log(a, a ?? 3);',
		'let [a] = arr; a = undefined; console.log(a ?? 3);',
		'const [a = 1] = arr; console.log(a ?? 3);',
		'const {...a} = options; console.log(a ?? 3);',
		'var [a] = arr; var a; console.log(a ?? 3);',
		'var [a] = arr; console.log(a ?? 3);',
		'console.log(a ?? 3); var [a] = [undefined];',
		'if (false) { var {a} = options; } console.log(a ?? 3);',
		'for (var [a] of []) {} console.log(a ?? 3);',
		'const fn = a => { { const a = 1; console.log(a ?? 3); } return a; };',
		'const {a} = options; export {a}; console.log(a ?? 3);',
		'export const {a} = options; console.log(a ?? 3);',
		'export let [a] = arr; console.log(a ?? 3);',
		{
			code: 'function fn(a, a) { return a ?? 3; }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'const fn = (a: number | undefined) => (a as number) ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'class Class { constructor(public a?: number) { console.log(a ?? 3); } }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a: bigint | undefined) => [a ?? 3n, a ?? 4n];',
			languageOptions: {parser: parsers.typescript},
		},
		'let {a, b = (a = 4)} = options; console.log(a ?? 3);',
		'const fn = (repo, name) => repo ?? name;',
		'const fn = ({repo, name}) => repo ?? name;',
		'const [second, first] = array; console.log(second ?? first);',
		'const fn = (name, repo) => repo ?? repo;',
		'function fn(name, repo) { repo ||= repo; }',
		'const name = "default"; const fn = repo => repo ?? name;',
		'const {name} = options; const {repo} = options; console.log(repo ?? name);',
		'const {name} = options, {repo} = options; console.log(repo ?? name);',
		'const fn = (name, repo) => { name = "changed"; return repo ?? name; };',
		'const fn = (name, repo) => { const result = repo ?? name; name = "changed"; return result; };',
		'const fn = (name, repo) => { function reset() { name = "changed"; } return repo ?? name; };',
		'const fn = (name, repo) => { name++; return repo ?? name; };',
		'let [name, repo] = array; name = "changed"; console.log(repo ?? name);',
		'let {name, repo, other = (name = "changed")} = options; console.log(repo ?? name);',
		'const fn = (name, repo) => { var name; return repo ?? name; };',
		'const fn = (name, repo) => { { const name = "shadow"; return repo ?? name; } };',
		'const fn = (name, repo) => { function read(name) { return repo ?? name; } return repo ?? name; };',
		'const fn = (name, other, repo) => [repo ?? name, repo ?? other];',
		'const fn = (name, repo) => [repo ?? name, repo || name];',
		'const fn = (name, repo) => [repo ?? name, repo ?? undefined];',
		'const fn = (name, repo) => [repo ?? name, repo ?? "default"];',
		'const fn = (name, repo) => repo ?? name();',
		'const fn = (name, repo) => repo ?? name.value;',
		'function fn(name, repo) { name = "changed"; repo ||= name; }',
		'function fn(name, repo) { repo ??= name; name = "changed"; }',
		'function fn(name, repo) { function reset() { name = "changed"; } repo = repo || name; }',
		'function fn(name, repo) { sideEffect(); repo ||= name; }',
		'function fn(repo, name) { repo ||= name; }',
		'const fn = (name, repo, other) => repo ?? name;',
		'function fn(name, repo) { "use strict"; repo ??= name; }',
		'function fallback(repo) { return repo ?? fallback; }',
		'const fn = function fallback(repo) { return repo ?? fallback; };',
		'function fallback(repo) { repo ||= fallback; }',
		'function fallback(repo) { const result = repo ?? fallback; console.log(result); }',
	],
	invalid: [
		'const fn = a => [a ?? 3, a ?? 3];',
		'const fn = a => [a || 3, a || 3];',
		'const fn = a => [a ?? 3, a ?? 0x3];',
		'const fn = a => [a ?? 3n, a ?? 0x3n];',
		String.raw`const fn = a => [a ?? "default", a ?? "\u0064efault"];`,
		'const fn = a => a || false;',
		'const fn = a => a ?? null;',
		'const fn = (b, a) => a ?? 3;',
		'const fn = (a,) => a ?? 3;',
		'const fn = (a) => (a) ?? (3);',
		'const fn = a => ((a ?? 3));',
		'const fn = a => ({[a ?? 3]: a ?? 3});',
		'const fn = a => { function read() { return a ?? 3; } return a ?? 3; };',
		'const fn = a => { { const a = 1; console.log(a ?? 4); } return a ?? 3; };',
		'const fn = a => b => a ?? 3;',
		'const fn = function(a) { return a ?? 3; };',
		'async function fn(a) { return a ?? 3; }',
		'function * fn(a) { yield a ?? 3; }',
		'const object = { fn(a) { return a ?? 3; } };',
		'class Class { fn(a) { return a ?? 3; } }',
		'const fn = ({a}, b) => a ?? 3;',
		'const fn = ([a]) => a ?? 3;',
		'const fn = ({property: a}) => a ?? 3;',
		'const fn = ({nested: {a}}) => a ?? 3;',
		'const fn = ([[a]]) => a ?? 3;',
		'const fn = ({a} = {}) => a ?? 3;',
		'const fn = ({a, b = a ?? 3}) => b;',
		'const fn = ({a, b}) => [a ?? 3, b || 4];',
		'const {property: a} = options; console.log(a ?? 3);',
		'const {nested: [a]} = options; console.log(a ?? 3);',
		'const [a] = arr; console.log(a ?? 3, a ?? 3);',
		'let {a} = options; console.log(a ?? 3);',
		'for (const [a] of arrays) { console.log(a ?? 3); }',
		'const {a} = options; const fn = () => a ?? 3;',
		'const {a} = options, [b] = arr; console.log(a ?? 3, b ?? 4);',
		'const fn = (a /* Keep comment. */) => (/* Keep comment. */ a ?? 3);',
		'const fn = ({a /* Keep comment. */}) => a ?? 3;',
		'const fn = a => a /* Keep comment. */ ?? 3;',
		'const fn = a => a ?? /* Keep comment. */ 3;',
		'const fn = a => [a ?? 3, a ?? /* Keep comment. */ 3];',
		'const [a] = arr; console.log(a ?? // Keep comment.\n3);',
		'function fn(a) {\r\n  return a ?? 3;\r\n}',
		outdent`
			function abc(foo) {
				const {bar} = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo || 'bar', keep = sideEffect();
			}
		`,
		outdent`
			function abc(bar, foo) {
				var bar = foo || 'bar';
			}
		`,
		outdent`
			function abc({bar}, foo) {
				var bar = foo || 'bar';
			}
		`,
		{
			code: 'const fn = (a?: number) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a?: number,) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a: number | undefined) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = ({a}: {a?: number}) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const [a]: [number?] = arr; console.log(a ?? 3);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = (a /* Keep comment. */: number | undefined) => a ?? 3;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = <Value,>(a: number | undefined) => <span>{a ?? 3}</span>;',
			languageOptions: {parser: parsers.typescript, parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'const fn = a => a ?? (3 /* Keep comment. */);',
		'const fn = async a => a ?? 3;',
		{
			code: 'const fn = (a: bigint | undefined) => [a ?? 3n, a ?? 0x3n];',
			languageOptions: {parser: parsers.typescript},
		},
		'const fn = ({[key]: a}) => a ?? 3;',
		'const fn = (name, repo) => repo || name;',
		'const fn = (name, repo) => [repo ?? name, repo ?? name];',
		'const fn = (name, repo) => [repo || name, repo || name];',
		'const fn = (name, repo) => { function read() { return repo ?? name; } return repo ?? name; };',
		'const fn = ({name, property: repo}) => repo ?? name;',
		'const fn = ({nested: {name, repo}}) => repo ?? name;',
		'const fn = ({nested: {name}, repo}) => repo ?? name;',
		'const fn = ([[name, repo]]) => repo ?? name;',
		'const fn = ({name, repo} = {}) => repo ?? name;',
		'const fn = (name = "default", repo) => repo ?? name;',
		'const fn = ({name = "default", repo}) => repo ?? name;',
		'const fn = ({name}, repo) => repo ?? name;',
		'const {name, repo} = options; console.log(repo || name);',
		'let [name, repo] = array; console.log(repo ?? name);',
		'const {name, nested: {repo}} = options; console.log(repo ?? name);',
		'for (const [name, repo] of arrays) { console.log(repo ?? name); }',
		'const fn = (name, repo) => (repo) ?? (name);',
		'const fn = (name, repo) => repo ?? /* Keep comment. */ name;',
		'const fn = ({name, repo /* Keep comment. */}) => repo ?? name;',
		'function fn(name, repo) { repo ||= /* Keep comment. */ name; }',
		'function fn(name, repo) {\r\n  repo ??= name;\r\n}',
		{
			code: 'const fn = (name: string, repo?: string) => repo ?? name;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const fn = ({name, repo}: {name: string; repo?: string}) => repo ?? name;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function fn(name: string, repo?: string) { repo ??= name; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function fn(name: string, repo?: string) { const result: string = repo ?? name; console.log(result); }',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			function install(packages) {
				return packages.map(({name, versionRange}) => \`\${name}@\${versionRange || 'latest'}\`);
			}

			console.log(install([{name: 'eslint', versionRange: ''}]));
		`,
		'function abc(foo) { foo = foo || \'bar\'; }',
	],
});

test.snapshot({
	valid: [
		...[
			'const fn = a => a || 3;',
			'const fn = a => a ?? 3;',
			'const fn = ({a}) => a || 3;',
			'const fn = ([a]) => a ?? 3;',
			'const {a} = options; console.log(a || 3);',
			'let [a] = arr; console.log(a ?? 3);',
		].map(code => ({code, options: [{checkFallbackExpressions: false}]})),
		{
			code: outdent`
				function install(packages) {
					return packages.map(({name, versionRange}) => \`\${name}@\${versionRange || 'latest'}\`);
				}

				console.log(install([{name: 'eslint', versionRange: ''}]));
			`,
			options: [{checkFallbackExpressions: false}],
		},
	],
	invalid: [
		{code: 'const fn = a => a || 3;', options: [{checkFallbackExpressions: true}]},
		{code: 'const fn = ({a}) => a ?? 3;', options: [{}]},
		...[
			'function fn(a) { a = a || 3; }',
			'function fn(a) { a = a ?? 3; }',
			'function fn(a) { a ||= 3; }',
			'function fn(a) { a ??= 3; }',
			'function fn(a) { const b = a || 3; console.log(b); }',
			'function outer(a) { function inner(b) { b ??= 3; } return a || 3; }',
		].map(code => ({code, options: [{checkFallbackExpressions: false}]})),
	],
});

test({
	valid: [
		'const fn = ({repo}, name) => repo ?? name;',
	],
	invalid: [
		{
			code: 'const fn = (name, repo) => repo ?? name;',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = (name, repo = name) => repo;'}],
			}],
		},
		{
			code: 'const fn = ({name, repo}) => repo ?? name;',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({name, repo = name}) => repo;'}],
			}],
		},
		{
			code: 'const fn = (name, {repo}) => repo ?? name;',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = (name, {repo = name}) => repo;'}],
			}],
		},
		{
			code: 'const fn = ({name: fallback}, repo) => repo ?? fallback;',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({name: fallback}, repo = fallback) => repo;'}],
			}],
		},
		{
			code: 'const [first, second] = array; console.log(second ?? first);',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const [first, second = first] = array; console.log(second);'}],
			}],
		},
		{
			code: 'function abc(foo, bar) { bar = bar || foo; }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function abc(foo, bar = foo) { }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { repo ||= name; }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name, repo = name) { }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { repo ??= name; }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name, repo = name) { }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { const result = repo ?? name; console.log(result); }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name, result = name) { console.log(result); }'}],
			}],
		},
		{
			code: 'const result = "outer"; function fn(name = result, repo) { const result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const result = "outer"; function fn(name = result, repo = name) { const result = repo; return result; }'}],
			}],
		},
		{
			code: 'const result = "outer"; function fn(name = () => result, repo) { const result = repo ?? name; return result(); }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const result = "outer"; function fn(name = () => result, repo = name) { const result = repo; return result(); }'}],
			}],
		},
		{
			code: 'const result = "outer"; function fn({name = result}, repo) { const result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const result = "outer"; function fn({name = result}, repo = name) { const result = repo; return result; }'}],
			}],
		},
		{
			code: 'const result = "outer"; function fn(name = () => result, repo) { const result = repo ?? 3; return [name(), result]; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const result = "outer"; function fn(name = () => result, repo = 3) { const result = repo; return [name(), result]; }'}],
			}],
		},
		{
			code: 'function fn(name = {result: "outer"}, repo) { const result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name = {result: "outer"}, result = name) { return result; }'}],
			}],
		},
		{
			code: 'const fn = a => a ?? 3;',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{
					desc: 'Move the default value to the declaration. This changes fallback behavior to apply only to undefined.',
					output: 'const fn = (a = 3) => a;',
				}],
			}],
		},
		{
			code: 'const fn = ({ a }) => a ?? 3;',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({ a = 3 }) => a;'}],
			}],
		},
		{
			code: 'const [a] = arr; console.log(a ?? 3);',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const [a = 3] = arr; console.log(a);'}],
			}],
		},
	],
});

test({
	valid: [
		/* eslint-disable no-template-curly-in-string */
		'const fn = a => a ?? `foo${bar}`;',
		'const fn = a => a ?? `foo${"bar"}`;',
		'const fn = a => a ?? tag`foo`;',
		'const fn = a => [a ?? `foo`, a ?? `bar`];',
		'const fn = a => [a ?? ``, a ?? `foo`];',
		'const fn = a => [a ?? `foo`, a ?? "bar"];',
		'const fn = a => [a ?? `foo`, a || `foo`];',
		'const fn = a => [a ?? `3`, a ?? 3];',
		'const fn = a => [a ?? `foo`, a ?? /foo/];',
		'function fn(a) { a = a ?? `foo${bar}`; }',
		'function fn(a) { a ||= `foo${bar}`; }',
		'function fn(a) { a ??= tag`foo`; }',
		'function fn(a) { const b = a || `foo${bar}`; }',
		/* eslint-enable no-template-curly-in-string */
	],
	invalid: [
		['const fn = a => a ?? `foo`;', 'const fn = (a = `foo`) => a;'],
		['const fn = a => a || `foo`;', 'const fn = (a = `foo`) => a;'],
		['const fn = ({a}) => a || `foo`;', 'const fn = ({a = `foo`}) => a;', 'preferDestructuringDefaultOverFallback'],
		['const fn = ([a]) => a ?? `foo`;', 'const fn = ([a = `foo`]) => a;', 'preferDestructuringDefaultOverFallback'],
		['const [a] = array; console.log(a ?? `foo`);', 'const [a = `foo`] = array; console.log(a);', 'preferDestructuringDefaultOverFallback'],
		['const {a} = object; console.log(a || `foo`);', 'const {a = `foo`} = object; console.log(a);', 'preferDestructuringDefaultOverFallback'],
		['const fn = a => [a ?? `foo`, a ?? `foo`];', 'const fn = (a = `foo`) => [a, a];'],
		['const fn = a => [a ?? `foo`, a ?? "foo"];', 'const fn = (a = `foo`) => [a, a];'],
		['const fn = a => [a ?? "foo", a ?? `foo`];', 'const fn = (a = "foo") => [a, a];'],
		['const fn = a => [a ?? `foo`, a ?? `\\u0066oo`];', 'const fn = (a = `foo`) => [a, a];'],
		['const fn = a => [a ?? `\\u0066oo`, a ?? "foo"];', 'const fn = (a = `\\u0066oo`) => [a, a];'],
		['const fn = a => [a ?? `\\${foo}`, a ?? "${foo}"];', 'const fn = (a = `\\${foo}`) => [a, a];'], // eslint-disable-line no-template-curly-in-string
		['const fn = a => a ?? ``;', 'const fn = (a = ``) => a;'],
		['const fn = a => [a || ``, a || ""];', 'const fn = (a = ``) => [a, a];'],
		['const fn = (a) => (a) ?? (`foo`);', 'const fn = (a = `foo`) => a;'],
		['const fn = a => a ?? `foo\n  bar`;', 'const fn = (a = `foo\n  bar`) => a;'],
		['function fn(a) {\r\n  return a ?? `foo\r\nbar`;\r\n}', 'function fn(a = `foo\r\nbar`) {\r\n  return a;\r\n}'],
		['const fn = a => [a ?? `foo\r\nbar`, a ?? "foo\\nbar"];', 'const fn = (a = `foo\r\nbar`) => [a, a];'],
	].map(([code, output, messageId = 'preferDefaultParameterOverFallback']) => ({
		code,
		errors: [{
			messageId,
			suggestions: [{messageId: 'moveDefaultToDeclaration', output}],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'const fn = (a?: string) => a ?? `foo`;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = (a: string = `foo`) => a;'}],
			}],
		},
		{
			code: 'const fn = ({a}: {a?: string}) => a ?? `foo`;',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({a = `foo`}: {a?: string}) => a;'}],
			}],
		},
		{
			code: 'const fn = a => a ?? /* Keep comment. */ `foo`;',
			errors: [{messageId: 'preferDefaultParameterOverFallback', suggestions: []}],
		},
		{
			code: 'const fn = a => [a ?? `foo`, a ?? /* Keep comment. */ `foo`];',
			errors: [{messageId: 'preferDefaultParameterOverFallback', suggestions: []}],
		},
	],
});

const invalidTestCase = ({code, suggestions}) => {
	if (!suggestions) {
		return {
			code,
			errors: [{
				messageId: 'preferDefaultParameters',
			}],
		};
	}

	return {
		code,
		errors: suggestions.map(suggestion => ({
			messageId: 'preferDefaultParameters',
			suggestions: [{
				messageId: 'preferDefaultParametersSuggest',
				output: suggestion,
			}],
		})),
	};
};

test({
	valid: [],
	invalid: [
		['function fn(a) { a = a || `foo`; }', 'function fn(a = `foo`) { }'],
		['function fn(a) { a = a ?? `foo`; }', 'function fn(a = `foo`) { }'],
		['function fn(a) { a ||= `foo`; }', 'function fn(a = `foo`) { }'],
		['function fn(a) { a ??= `foo`; }', 'function fn(a = `foo`) { }'],
		['function fn(a) { const b = a || `foo`; }', 'function fn(b = `foo`) { }'],
		['const fn = a => { a ??= ``; };', 'const fn = (a = ``) => { };'],
		['function fn(a) { a ||= `\\u0066oo`; }', 'function fn(a = `\\u0066oo`) { }'],
		['function fn(a) { a ??= `foo\\`bar`; }', 'function fn(a = `foo\\`bar`) { }'],
		['function fn(a) {\n  a ??= `foo\nbar`;\n}', 'function fn(a = `foo\nbar`) {\n  \n}'],
		['function fn(a) {\n  a ??= `foo\nx`;return a;\n}', 'function fn(a = `foo\nx`) {\n  return a;\n}'],
		['function fn(a) {\r\n  a ??= `foo\r\nx`;return a;\r\n}', 'function fn(a = `foo\r\nx`) {\r\n  return a;\r\n}'],
		['function fn(a) {\n  a ??= `foo\nx`; return a;\n}', 'function fn(a = `foo\nx`) {\n  return a;\n}'],
		['function fn(a) {\n    a ??= `foo\n`;/* Keep comment. */\n}', 'function fn(a = `foo\n`) {\n    /* Keep comment. */\n}'],
	].map(([code, output]) => invalidTestCase({code, suggestions: [output]})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'function fn(a?: string) { a ??= `foo`; }',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(a: string = `foo`) { }'}],
			}],
		},
		{
			code: 'function fn(a?: string) { const b: string = a ?? `foo`; return b; }',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(b: string = `foo`) { return b; }'}],
			}],
		},
		{
			code: 'function fn(a) { a ||= /* Keep comment. */ `foo`; }',
			errors: [{messageId: 'preferDefaultParameters', suggestions: []}],
		},
	],
});

test({
	valid: [
		'function abc(foo = { bar: 123 }) { }',
		'function abc({ bar } = { bar: 123 }) { }',
		'function abc({ bar = 123 } = { bar }) { }',
		'function abc(foo = fooDefault) { }',
		'function abc(foo = {}) { }',
		'function abc(foo = \'bar\') { }',
		'function abc({ bar = 123 } = {}) { }',
		'const abc = (foo = \'bar\') => { };',
		'foo = foo || \'bar\';',
		'const bar = foo || \'bar\';',
		'const abc = function(foo = { bar: 123 }) { }',
		'const abc = function({ bar } = { bar: 123 }) { }',
		'const abc = function({ bar = 123 } = {}) { }',
		outdent`
			function abc(foo) {
				foo = foo || bar();
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || {bar};
			}
		`,
		outdent`
			function abc(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo, bar) {
				foo = foo || 'bar';
				baz();
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo && 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo &&= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo ||= bar();
			}
		`,
		outdent`
			function abc(foo) {
				foo.bar ||= 'bar';
			}
		`,
		outdent`
			function abc(foo, bar) {
				foo ||= 'bar';
			}
		`,
		{
			code: outdent`
				function abc(foo, foo) {
					foo ||= 'bar';
				}
			`,
			languageOptions: {sourceType: 'script'},
		},
		outdent`
			function abc(foo) {
				const bar = foo;
				foo ||= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				bar();
				foo ||= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				if (condition) {
					foo ||= 'bar';
				}
			}
		`,
		outdent`
			function abc(foo) {
				'use strict';
				foo ??= 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || 1 && 2 || 3;
			}
		`,
		outdent`
			function abc(foo) {
				foo = !foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = (foo && bar) || baz;
			}
		`,
		outdent`
			function abc(foo = 123) {
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				const bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = (foo, bar) => {
				bar = foo || 'bar';
			};
		`,
		outdent`
			const abc = function(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = function(foo) {
				foo = foo || bar();
			}
		`,
		outdent`
			function abc(foo) {
				function def(bar) {
					foo = foo || 'bar';
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				bar(foo = foo || 1);
				baz(foo);
			}
		`,
		// The following tests check references and side effects
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo || 'bar';
				console.log(foo, bar);
			}
		`,
		outdent`
			function abc(foo) {
				let bar = 123;
				bar = foo;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				bar();
				foo = foo || 123;
			}
		`,
		outdent`
			const abc = (foo) => {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			const abc = function(foo) {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			function abc(foo) {
				sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects() + 123;
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = !sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		// `new`, dynamic `import()`, and tagged templates can also have side effects before the assignment
		outdent`
			function abc(foo) {
				new SideEffects();
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				import('side-effects');
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				sideEffects\`template\`;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				const bar = function() {
					foo = 456;
				}
				foo = foo || 123;
			}
		`,
		// Last parameter is `RestElement`
		outdent`
			function abc(...foo) {
				foo = foo || 'bar';
			}
		`,
		// Last parameter is `AssignmentPattern`
		outdent`
			function abc(foo = 'bar') {
				foo = foo || 'baz';
			}
		`,
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || true;
				}
			`,
			suggestions: [outdent`
				function abc(foo = true) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					console.log(foo);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					let bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc({baz}, foo) {
					const bar = foo || 'bar';
					console.log(baz, bar);
				}
			`,
			suggestions: [outdent`
				function abc({baz}, bar = 'bar') {
					console.log(baz, bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = foo => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					const bar = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (bar = 'bar') => {
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					bar();
					baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar();
					baz();
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo ?? 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo ||= 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = foo => {
					foo ??= 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`],
		}),
		{
			code: outdent`
				function abc(foo?: string) {
					foo ??= 'bar';
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{
					desc: 'Replace reassignment with a default parameter. This changes fallback behavior to apply only to undefined.',
					output: outdent`
						function abc(foo: string = 'bar') {
						}
					`,
				}],
			}],
		},
		{
			code: outdent`
				function abc(foo: string | undefined) {
					const bar: string = foo || 'bar';
					consumeString(bar);
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{
					messageId: 'preferDefaultParametersSuggest',
					output: outdent`
						function abc(bar: string = 'bar') {
							consumeString(bar);
						}
					`,
				}],
			}],
		},
		{
			code: outdent`
				function abc(foo /* Keep comment. */: string) {
					foo ??= 'bar';
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [],
			}],
		},
		{
			code: outdent`
				function abc(foo) {
					foo ||= /* Keep comment. */ 'bar';
				}
			`,
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [],
			}],
		},
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				const abc = function(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) { }
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) { }
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) { }
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) { }
				}
			`],
		}),
		// The following tests verify the correct code formatting
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\'; }',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\';}',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'const abc = function(foo) { foo = foo || \'bar\';}',
			suggestions: ['const abc = function(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'const abc = (foo,) => { foo ??= 3; };',
			suggestions: ['const abc = (foo = 3,) => { };'],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar'; bar(); baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar(); baz();
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`, outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar = 'foo') {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar = 'foo') {
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`, outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(bay = 'bar') {
					}
					foo = foo || 'bar';
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`, outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`, outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const noSideEffects = 123;
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const noSideEffects = 123;
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					let bar = true;
					bar = false;

					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
					let bar = true;
					bar = false;

					console.log(foo);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = function() {};
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const bar = function() {};
				}
			`],
		}),
	],
});

test({
	valid: [
		outdent`
			function abc(foo, bar) {
				const { baz, ...rest } = bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				const baz = foo?.bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				import('foo');
				foo = foo || 123;
			}
		`,
	],
	invalid: [],
});
