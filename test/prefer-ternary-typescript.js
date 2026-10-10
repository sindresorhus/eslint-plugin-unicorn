import path from 'node:path';
import test from 'node:test';
import outdent from 'outdent';
import typescript from 'typescript';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';

function createProgram(code, filename = path.resolve('prefer-ternary-typescript.ts')) {
	filename = filename.replaceAll('\\', '/');
	const options = {
		strict: true,
		noEmit: true,
		allowJs: true,
		checkJs: true,
		target: typescript.ScriptTarget.ESNext,
		module: typescript.ModuleKind.NodeNext,
	};
	const host = typescript.createCompilerHost(options);
	const getSourceFile = host.getSourceFile.bind(host);
	host.getSourceFile = (filePath, languageVersion, ...arguments_) => filePath === filename
		? typescript.createSourceFile(filename, code, languageVersion, true)
		: getSourceFile(filePath, languageVersion, ...arguments_);

	return typescript.createProgram([filename], options, host);
}

function getDiagnostics(program) {
	const [filename] = program.getRootFileNames();
	return program.getSemanticDiagnostics(program.getSourceFile(filename)).map(diagnostic => typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function getMessages(program, {typeAware = true} = {}) {
	const [filename] = program.getRootFileNames();
	const linter = new Linter();
	return linter.verify(program.getSourceFile(filename).text, {
		files: ['**/*.{js,ts}'],
		languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: typeAware ? [program] : undefined}},
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
	}, {filename});
}

test('loads virtual source files with Windows path separators', t => {
	const filename = path.win32.resolve('C:/prefer-ternary-typescript.ts');
	const code = 'const value: number = "invalid";';
	const program = createProgram(code, filename);
	t.assert.strictEqual(program.getSourceFile(filename)?.text, code);
	t.assert.deepStrictEqual(getDiagnostics(program), ['Type \'string\' is not assignable to type \'number\'.']);
});

for (const [pattern, first, second] of [
	['[object.handler]', '[value => value.toFixed()]', '[value => value.toUpperCase()]'],
	['{handler: object.handler}', '{handler: value => value.toFixed()}', '{handler: value => value.toUpperCase()}'],
]) {
	for (const prefix of ['', 'return ', 'result = ']) {
		test(`preserves narrowed callback types in ${prefix || 'standalone '}${pattern}`, t => {
			const code = outdent`
				function update(object: {kind: "number"; handler: (value: number) => string} | {kind: "string"; handler: (value: string) => string}) {
					let result;
					if (object.kind === "number") {
						${prefix}(${pattern} = ${first});
					} else {
						${prefix}(${pattern} = ${second});
					}
				}
			`;
			const program = createProgram(code);
			t.assert.deepStrictEqual(getDiagnostics(program), []);

			const messages = getMessages(program);

			if (!prefix) {
				t.assert.deepStrictEqual(messages, []);
				return;
			}

			t.assert.strictEqual(messages.length, 1);
			const {fix} = messages[0];
			t.assert.ok(fix);
			// Compile the fix with a fresh program so types reflect the rewritten source.
			const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			t.assert.deepStrictEqual(getDiagnostics(createProgram(output)), []);
		});
	}
}

for (const [pattern, first, second] of [
	['callback', 'firstCallback', 'secondCallback'],
	['[object.handler]', '[value => value.toFixed()]', '[value => value.toExponential()]'],
	['{handler: object.handler}', '{handler: value => value.toFixed()}', '{handler: value => value.toExponential()}'],
]) {
	test(`still combines compatible callback types in ${pattern}`, t => {
		const code = outdent`
			type Handler = (value: number) => string;
			function update(object: {kind: "first" | "second"; handler: Handler}, callback: Handler, firstCallback: Handler, secondCallback: Handler) {
				if (object.kind === "first") {
					(${pattern} = ${first});
				} else {
					(${pattern} = ${second});
				}
			}
		`;
		const program = createProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);

		const messages = getMessages(program);
		t.assert.strictEqual(messages.length, 1);
		const {fix} = messages[0];
		t.assert.ok(fix);
		const value = pattern.startsWith('[')
			? `[object.kind === "first" ? ${first.slice(1, -1)} : ${second.slice(1, -1)}]`
			: `object.kind === "first" ? ${first} : ${second}`;
		const assignment = `${pattern} = ${value}`;
		t.assert.strictEqual(fix.text, pattern.startsWith('{') ? `(${assignment});` : `${assignment};`);
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.deepStrictEqual(getDiagnostics(createProgram(output)), []);
	});
}

test('preserves inferred arrow names even with compatible contextual types', t => {
	const code = outdent`
		function update(selected: boolean, callback: (value: number) => string) {
			if (selected) {
				callback = value => value.toFixed();
			} else {
				callback = value => value.toExponential();
			}
		}
	`;
	const program = createProgram(code);
	t.assert.deepStrictEqual(getDiagnostics(program), []);
	t.assert.deepStrictEqual(getMessages(program), []);
});

for (const [name, target, firstType, secondType, firstCallback] of [
	['any parameter', 'object.handler', 'handler: (value: any) => string', 'handler: (value: number) => string', 'value => String(value)'],
	['any target', 'object.handler', 'handler: any', 'handler: (value: number) => string', '(value: any) => String(value)'],
	['correlated computed target', 'object.handlers[object.kind]', 'handlers: {first: Handler}', 'handlers: {second: Handler}', 'value => String(value)'],
]) {
	test(`preserves contextual typing with ${name}`, t => {
		const code = outdent`
			type Handler = (value: number) => string;
			function update(object: {kind: "first"; ${firstType}} | {kind: "second"; ${secondType}}) {
				if (object.kind === "first") {
					[${target}] = [${firstCallback}];
				} else {
					[${target}] = [value => value.toFixed()];
				}
			}
		`;
		const program = createProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);
		t.assert.deepStrictEqual(getMessages(program), []);
	});
}

for (const pattern of ['[value = object.values[object.kind]]', '{[object.values[object.kind]]: value}']) {
	test(`preserves narrowing within ${pattern}`, t => {
		const code = outdent`
			function update(object: {kind: "first"; values: {first: string}} | {kind: "second"; values: {second: string}}) {
				let value: string;
				const record: Record<string, string> = {};
				if (object.kind === "first") {
					(${pattern} = ${pattern.startsWith('[') ? '[]' : 'record'});
				} else {
					(${pattern} = ${pattern.startsWith('[') ? '[]' : 'record'});
				}
			}
		`;
		const program = createProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);
		t.assert.deepStrictEqual(getMessages(program), []);
	});
}

for (const [name, annotation, initial, replacement] of [
	['callback array', 'Array<(value: number) => string>', '[(value: number) => value.toFixed()]', '[value => value.toExponential()]'],
	['callback object', '{callback: (value: number) => string}', '{callback: (value: number) => value.toFixed()}', '{callback: value => value.toExponential()}'],
	['primitive', 'number', '1', '2'],
]) {
	test(`skips inferred ${name} declarations with type information`, t => {
		const code = `function update(selected: boolean) { let value = ${initial}; if (selected) { value = ${replacement}; } return value; }`;
		const program = createProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);

		const messages = getMessages(program);
		const fix = messages[0]?.suggestions?.[0]?.fix;
		if (fix) {
			const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			t.assert.deepStrictEqual(getDiagnostics(createProgram(output)), []);
		}

		t.assert.deepStrictEqual(messages, []);
	});

	test(`still suggests annotated ${name} declarations with type information`, t => {
		const code = `function update(selected: boolean) { let value: ${annotation} = ${initial}; if (selected) { value = ${replacement}; } return value; }`;
		const program = createProgram(code);
		t.assert.deepStrictEqual(getDiagnostics(program), []);

		const messages = getMessages(program);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {fix} = messages[0].suggestions[0];
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.strictEqual(output, `function update(selected: boolean) { const value: ${annotation} = selected ? ${replacement} : ${initial}; return value; }`);
		t.assert.deepStrictEqual(getDiagnostics(createProgram(output)), []);
	});
}

test('retains inferred declaration suggestions without type information', t => {
	const code = 'function update(selected: boolean) { let value = 1; if (selected) { value = 2; } return value; }';
	const messages = getMessages(createProgram(code), {typeAware: false});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.strictEqual(output, 'function update(selected: boolean) { const value = selected ? 2 : 1; return value; }');
});

test('skips checked JavaScript declaration suggestions only with type information', t => {
	const filename = path.resolve('prefer-ternary-javascript.js');
	const code = 'const selected = Math.random() > 0.5; let value = 1; if (selected) { value = 2; } value;';
	const program = createProgram(code, filename);
	t.assert.deepStrictEqual(getDiagnostics(program), []);
	t.assert.deepStrictEqual(getMessages(program), []);

	const messages = getMessages(program, {typeAware: false});
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.strictEqual(output, 'const selected = Math.random() > 0.5; const value = selected ? 2 : 1; value;');
	t.assert.deepStrictEqual(getDiagnostics(createProgram(output, filename)), []);
});
