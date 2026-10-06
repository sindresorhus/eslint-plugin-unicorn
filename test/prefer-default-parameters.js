import nodeTest from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import typescript from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule, ruleId} = getTester(import.meta);

const typeAware = (code, filename = 'file.ts') => ({
	code,
	filename,
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['file.ts', 'file.js']}},
	},
});

const incompatibleResultCases = [
	'function fn(name: string, repo?: string | null): string { return repo ?? name; }',
	'function fn(repo?: string | null): string { return repo ?? "default"; }',
	'function fn(name: true, repo?: boolean): true { return repo || name; }',
	'function fn(repo?: boolean): true { return repo || true; }',
	'const fn: (name: string, repo?: string | null) => string = (name, repo) => repo ?? name;',
	'function fn({name, repo}: {name: string; repo?: string | null}): string { return repo ?? name; }',
	'function fn(name: string, repo?: string | null): string { repo ??= name; return repo; }',
	'function fn(name: true, repo?: boolean): true { repo ||= name; return repo; }',
	'function fn(name: string, repo?: string | null): string { repo = repo ?? name; return repo; }',
];

const anyTypeCases = [
	'function fn(repo) { return repo ?? 3; } fn("text");',
	'function fn(repo) { repo ??= 3; return repo; } fn("text");',
	'function fn(repo) { repo = repo || 3; return repo; } fn("text");',
	'function fn(name: any, repo?: string) { return repo ?? name; } const value: number = fn(3);',
	'function fn(name: any, repo?: string) { return repo || name; } const value: number = fn(3);',
	'function fn(name: any, repo?: string) { repo ||= name; return repo; }',
	'function fn(repo: any) { return repo ?? 3; }',
	'const fn: (repo: any) => any = repo => repo ?? 3;',
	'function fn({name, repo}: {name: any; repo?: string}) { return repo ?? name; }',
	'declare const options: any; const {repo} = options; console.log(repo ?? 3);',
];

test({
	valid: [
		...anyTypeCases.map(code => typeAware(code)),
		typeAware('function fn(repo) { return repo ?? 3; } fn("text");', 'file.js'),
		typeAware('/** @param {*} [repo] */\nfunction fn(repo) { return repo ?? 3; }', 'file.js'),
	],
	invalid: [],
});

test({
	valid: incompatibleResultCases.map(code => typeAware(code)),
	invalid: [],
});

test({
	valid: [typeAware('/** @param {string} name\n * @param {number} [repo] */\nfunction fn(name, repo) { return repo ?? name; }', 'file.js')],
	invalid: [
		{
			...typeAware('/** @param {string} name\n * @param {string} [repo] */\nfunction fn(name, repo) { const result = repo ?? name; return result; }', 'file.js'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: '/** @param {string} name\n * @param {string} [repo] */\nfunction fn(name, repo = name) { const result = repo; return result; }'}],
			}],
		},
	],
});

test({
	valid: [
		'const fn = (name, repo) => { [name] = ["changed"]; return repo ?? name; };',
		'const fn = (name, repo) => { for (name of []) {} return repo ?? name; };',
		'const fn = (name, repo) => { function reset() { ({name} = {name: "changed"}); } return repo ?? name; };',
		'const fn = repo => [repo ?? -0, repo ?? 0];',
		'const fn = repo => [repo ?? -1, repo ?? -2];',
		'const fn = repo => [repo ?? -1, repo ?? -1n];',
		'const fn = repo => repo ?? -"1";',
		'const fn = repo => repo ?? -(1 + 2);',
		'const fn = repo => repo ?? --other;',
	],
	invalid: [
		{code: 'const fn = repo => [repo ?? -1, repo ?? -0x1];', output: 'const fn = (repo = -1) => [repo, repo];'},
		{code: 'const fn = repo => [repo || -1n, repo || -0x1n];', output: 'const fn = (repo = -1n) => [repo, repo];'},
		{code: 'const fn = repo => [repo ?? -0n, repo ?? 0n];', output: 'const fn = (repo = -0n) => [repo, repo];'},
		{code: 'const {repo} = options; console.log(repo ?? -1);', output: 'const {repo = -1} = options; console.log(repo);'},
		{code: 'function fn(repo) { const result = repo ?? -1; return result; }', output: 'function fn(repo = -1) { const result = repo; return result; }'},
		{code: 'const fn = repo => repo ?? -/* Keep comment. */ 1;', output: undefined},
	].map(({code, output}) => ({
		code,
		errors: [{
			messageId: code.startsWith('const {') ? 'preferDestructuringDefaultOverFallback' : 'preferDefaultParameterOverFallback',
			suggestions: output ? [{messageId: 'moveDefaultToDeclaration', output}] : [],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		{code: 'function fn(repo) { repo ??= -1; return repo; }', output: 'function fn(repo = -1) { return repo; }'},
		{code: 'function fn(repo) { repo ||= -1n; return repo; }', output: 'function fn(repo = -1n) { return repo; }'},
		{code: 'function fn(repo) { repo = repo || -0; return repo; }', output: 'function fn(repo = -0) { return repo; }'},
	].map(({code, output}) => ({
		code,
		errors: [{messageId: 'preferDefaultParameters', suggestions: [{messageId: 'preferDefaultParametersSuggest', output}]}],
	})),
});

test({
	valid: [
		'function fn(name: string, repo?: number) { return repo ?? name; }',
		'function fn(repo?: number) { return repo ?? "default"; }',
		'const fn: (name: string, repo?: number) => string | number = (name, repo) => repo ?? name;',
		'function fn<Value>(name: string, repo?: Value) { return repo ?? name; }',
		'function fn(name: string | number, repo?: number) { if (typeof name === "number") { return repo ?? name; } return 0; }',
		'function fn(name?: number, repo?: number) { return repo ?? name; }',
		'function fn(name: number | undefined, repo: number | undefined): number { if (typeof name === "number") { return repo ?? name; } return 0; }',
		'const fn: (name?: number, repo?: number) => number = (name, repo) => typeof name === "number" ? repo ?? name : 0;',
		'function fn(name: number | undefined, repo: number | undefined): number { console.log(repo ?? name); if (typeof name === "number") { return repo ?? name; } return 0; }',
	].map(code => typeAware(code)),
	invalid: [],
});

test({
	valid: [
		typeAware('const fn = ({name, repo}: {name: string; repo?: number}) => repo ?? name;'),
		typeAware('const {repo} = {repo: undefined}; const result = repo ?? 3;'),
	],
	invalid: [],
});

test({
	valid: [],
	invalid: [
		{
			...typeAware('function fn(repo?: number) { return repo ?? 3; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(repo: number = 3) { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn(repo?: number) { return repo ?? -1; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(repo: number = -1) { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn(name: number | undefined, repo: number | undefined) { return repo ?? name; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name: number | undefined, repo: number | undefined = name) { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn(name: string | null, repo?: string | null): string | null { return repo ?? name; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name: string | null, repo: string | null = name): string | null { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn(name: string, repo?: string) { return repo ?? name; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name: string, repo: string = name) { return repo; }'}],
			}],
		},
		{
			...typeAware('const fn: (name: string, repo?: string) => string = (name, repo) => repo ?? name;'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn: (name: string, repo?: string) => string = (name, repo = name) => repo;'}],
			}],
		},
		{
			...typeAware('const fn = ({name, repo}: {name: string; repo?: string}) => repo ?? name;'),
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'const fn = ({name, repo = name}: {name: string; repo?: string}) => repo;'}],
			}],
		},
		{
			...typeAware('function fn<Value>(name: Value, repo?: Value) { return repo ?? name; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn<Value>(name: Value, repo: Value = name) { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn<Value>([name, repo]: [Value, Value?]): Value { return repo ?? name; }'),
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn<Value>([name, repo = name]: [Value, Value?]): Value { return repo; }'}],
			}],
		},
		{
			...typeAware('const options: {fallback: string; repo?: string} = {fallback: "name"}; const {fallback, repo} = options; const output: string = repo ?? fallback;'),
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{
					messageId: 'moveDefaultToDeclaration',
					output: 'const options: {fallback: string; repo?: string} = {fallback: "name"}; const {fallback, repo = fallback} = options; const output: string = repo;',
				}],
			}],
		},
		{
			...typeAware('function fn(name: string, repo?: string) { repo ||= name; return repo; }'),
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name: string, repo: string = name) { return repo; }'}],
			}],
		},
		{
			...typeAware('function fn(name: boolean, repo?: string | boolean) { const result = repo ?? name; return result; }'),
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name: boolean, repo: string | boolean = name) { const result = repo; return result; }'}],
			}],
		},
	],
});

test.typescript({
	valid: [
		'class Foo { set value(repo: number) { repo ||= 3; } }',
		'class Foo { set value(repo: number | undefined) { console.log(repo ?? 3); } }',
	],
	invalid: [
		{
			code: 'function fn(repo: any) { return repo ?? 3; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(repo: any = 3) { return repo; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { const result: string = repo ?? name; return result; }',
			filename: 'file.ts',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { const result: string = repo; return result; }'}],
			}],
		},
		{
			code: 'class Foo { set value({name, repo}: {name: string; repo?: string}) { console.log(repo ?? name); } }',
			filename: 'file.ts',
			errors: [{
				messageId: 'preferDestructuringDefaultOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'class Foo { set value({name, repo = name}: {name: string; repo?: string}) { console.log(repo); } }'}],
			}],
		},
	],
});

test({
	valid: [],
	invalid: [{
		code: 'class Foo { set value(repo) { repo ||= 3; } }',
		errors: [{
			messageId: 'preferDefaultParameters',
			suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'class Foo { set value(repo = 3) { } }'}],
		}],
	}],
});

for (const parser of ['vue', 'svelte']) {
	test[parser]({
		valid: [],
		invalid: [{
			code: '<script>const fn = (name, repo) => repo ?? name;</script>',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: '<script>const fn = (name, repo = name) => repo;</script>'}],
			}],
		}],
	});
}

const getTypeScriptDiagnostics = (code, {filename = '/prefer-default-parameters.ts', ...compilerOptions} = {}) => {
	const options = {
		strict: true, noEmit: true, types: [], skipLibCheck: true, target: typescript.ScriptTarget.ESNext,
		...compilerOptions,
	};
	const host = typescript.createCompilerHost(options);
	const {getSourceFile} = host;
	host.getSourceFile = (name, ...arguments_) => name === filename
		? typescript.createSourceFile(name, code, options.target, true)
		: getSourceFile(name, ...arguments_);
	const program = typescript.createProgram([filename], options, host);
	return typescript.getPreEmitDiagnostics(program).map(diagnostic => typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
};

nodeTest('incompatible transformations are not reported', t => {
	const linter = new Linter();
	const codes = [
		'function fn(name: number | undefined, repo: number | undefined): number { if (typeof name === "number") { return repo ?? name; } return 0; }',
		'const fn: (name?: number, repo?: number) => number = (name, repo) => typeof name === "number" ? repo ?? name : 0;',
		...incompatibleResultCases,
	];
	for (const code of codes) {
		t.assert.deepStrictEqual(getTypeScriptDiagnostics(code), []);
		const {languageOptions, filename} = typeAware(code);
		const messages = linter.verify(code, {
			files: ['**/*.ts'],
			languageOptions,
			plugins: {unicorn: {rules: {[ruleId]: rule}}},
			rules: {[`unicorn/${ruleId}`]: 'error'},
		}, {filename});
		t.assert.deepStrictEqual(messages, []);
	}
});

nodeTest('any types cannot change inferred call signatures or return types', t => {
	const linter = new Linter();
	for (const code of anyTypeCases) {
		t.assert.deepStrictEqual(getTypeScriptDiagnostics(code, {noImplicitAny: false}), []);
		const {languageOptions, filename} = typeAware(code);
		const messages = linter.verify(code, {
			files: ['**/*.ts'],
			languageOptions,
			plugins: {unicorn: {rules: {[ruleId]: rule}}},
			rules: {[`unicorn/${ruleId}`]: 'error'},
		}, {filename});
		t.assert.deepStrictEqual(messages, []);
	}

	const code = 'function fn(repo) { return repo ?? 3; } fn("text");';
	t.assert.deepStrictEqual(getTypeScriptDiagnostics(code, {
		filename: '/prefer-default-parameters.js', allowJs: true, checkJs: true, noImplicitAny: false,
	}), []);
});

nodeTest('suggestions preserve TypeScript validity and the annotated call signature', t => {
	const linter = new Linter();
	const codes = [
		'function fn(repo?: number) { return repo ?? -1; }',
		'function fn(name: number | undefined, repo: number | undefined) { return repo ?? name; }',
		'function fn(name: string | null, repo?: string | null): string | null { return repo ?? name; }',
		'function fn(name: string, repo?: string) { return repo ?? name; }',
		'const fn: (name: string, repo?: string) => string = (name, repo) => repo ?? name;',
		'function fn<Value>(name: Value, repo?: Value) { return repo ?? name; }',
		'function fn<Value>([name, repo]: [Value, Value?]): Value { return repo ?? name; }',
		'const options: {fallback: string; repo?: string} = {fallback: "name"}; const {fallback, repo} = options; const output: string = repo ?? fallback;',
		'class Foo { set value({name, repo}: {name: string; repo?: string}) { console.log(repo ?? name); } }',
		'function fn(name: boolean, repo?: string | boolean) { const result = repo ?? name; return result; } fn(true, "text");',
		'const fn: (name: boolean, repo?: string | boolean) => string | boolean = (name, repo) => { const result = repo ?? name; return result; }; fn(true, "text");',
	];
	for (const code of codes) {
		t.assert.deepStrictEqual(getTypeScriptDiagnostics(code), []);
		const {languageOptions, filename} = typeAware(code);
		const messages = linter.verify(code, {
			files: ['**/*.ts'],
			languageOptions,
			plugins: {unicorn: {rules: {[ruleId]: rule}}},
			rules: {[`unicorn/${ruleId}`]: 'error'},
		}, {filename});
		t.assert.strictEqual(messages.length, 1);
		const [suggestion] = messages[0].suggestions ?? [];
		t.assert.ok(suggestion);
		const {fix} = suggestion;
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.deepStrictEqual(getTypeScriptDiagnostics(output), []);
	}
});

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
		'const fn = (name, {repo}, other = (name = "changed")) => repo ?? name;',
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
			'const fn = (name, repo) => repo ?? name;',
			'const fn = ({a}) => a || 3;',
			'const fn = ([a]) => a ?? 3;',
			'const {a} = options; console.log(a || 3);',
			'let [a] = arr; console.log(a ?? 3);',
			'function fn(a) { const b = a || 3; console.log(b); }',
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
			'function fn(name, repo) { repo ??= name; }',
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
			code: 'function fn(name, repo) { function reset(name) { name = "changed"; } return repo ?? name; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { function reset(name) { name = "changed"; } return repo; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { repo ??= name; function reset(name) { name = "changed"; } return repo; }',
			errors: [{
				messageId: 'preferDefaultParameters',
				suggestions: [{messageId: 'preferDefaultParametersSuggest', output: 'function fn(name, repo = name) { function reset(name) { name = "changed"; } return repo; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { const /* Keep comment. */ result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { const /* Keep comment. */ result = repo; return result; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { const result = repo ?? name; console.log(result); }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { const result = repo; console.log(result); }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { var result = "initial"; var result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { var result = "initial"; var result = repo; return result; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { if (true) { var result = "initial"; } var result = repo || name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { if (true) { var result = "initial"; } var result = repo; return result; }'}],
			}],
		},
		{
			code: 'function fn(name, repo) { result = "initial"; var result = repo ?? name; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name, repo = name) { result = "initial"; var result = repo; return result; }'}],
			}],
		},
		{
			code: 'function fn(repo) { var result = "initial"; var result = repo ?? 3; return result; }',
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(repo = 3) { var result = "initial"; var result = repo; return result; }'}],
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
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(name = {result: "outer"}, repo = name) { const result = repo; return result; }'}],
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
		['function fn(a) { const b = a || `foo`; }', 'function fn(a = `foo`) { const b = a; }'],
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

const invalidTestCase = ({code, suggestions, messageIds = []}) => {
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
		errors: suggestions.map((suggestion, index) => ({
			messageId: messageIds[index] ?? 'preferDefaultParameters',
			suggestions: [{
				messageId: messageIds[index] === 'preferDefaultParameterOverFallback' ? 'moveDefaultToDeclaration' : 'preferDefaultParametersSuggest',
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
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{messageId: 'moveDefaultToDeclaration', output: 'function fn(a: string = `foo`) { const b: string = a; return b; }'}],
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
			messageIds: ['preferDefaultParameterOverFallback'],
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					const bar = foo;
				}
			`],
		}),
		{
			code: outdent`
				function abc(foo) {
					let bar = foo || 'bar';
				}
			`,
			errors: [{
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{
					messageId: 'moveDefaultToDeclaration',
					output: outdent`
						function abc(foo = 'bar') {
							let bar = foo;
						}
					`,
				}],
			}],
		},
		invalidTestCase({
			messageIds: ['preferDefaultParameterOverFallback'],
			code: outdent`
				function abc({baz}, foo) {
					const bar = foo || 'bar';
					console.log(baz, bar);
				}
			`,
			suggestions: [outdent`
				function abc({baz}, foo = 'bar') {
					const bar = foo;
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
			messageIds: ['preferDefaultParameterOverFallback'],
			code: outdent`
				const abc = (foo) => {
					const bar = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
					const bar = foo;
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
				messageId: 'preferDefaultParameterOverFallback',
				suggestions: [{
					messageId: 'moveDefaultToDeclaration',
					output: outdent`
						function abc(foo: string | undefined = 'bar') {
							const bar: string = foo;
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
			messageIds: ['preferDefaultParameterOverFallback'],
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					const bar = foo;
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			messageIds: ['preferDefaultParameterOverFallback'],
			code: outdent`
				const abc = function(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 'bar') {
					const bar = foo;
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
			messageIds: ['preferDefaultParameters', 'preferDefaultParameterOverFallback'],
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
					function ghi(baz = 'bar') {
						const bay = baz;
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
