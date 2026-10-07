import path from 'node:path';
import test from 'node:test';
import outdent from 'outdent';
import typescript from 'typescript';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';

const filename = path.resolve('prefer-ternary-typescript.ts');

function createProgram(code) {
	const options = {
		strict: true,
		noEmit: true,
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
	return program.getSemanticDiagnostics(program.getSourceFile(filename)).map(diagnostic => typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function getMessages(program) {
	const linter = new Linter();
	return linter.verify(program.getSourceFile(filename).text, {
		files: ['**/*.ts'],
		languageOptions: {parser: typescriptEslintParser, parserOptions: {programs: [program]}},
		plugins: {unicorn},
		rules: {'unicorn/prefer-ternary': 'error'},
	}, {filename});
}

for (const pattern of ['[object.handler]', '{handler: object.handler}']) {
	for (const prefix of ['', 'return ', 'result = ']) {
		test(`preserves narrowed callback types in ${prefix || 'standalone '}${pattern}`, t => {
			const first = pattern.startsWith('[') ? '[value => value.toFixed()]' : '{handler: value => value.toFixed()}';
			const second = pattern.startsWith('[') ? '[value => value.toUpperCase()]' : '{handler: value => value.toUpperCase()}';
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

for (const pattern of ['[object.handler]', '{handler: object.handler}']) {
	test(`still combines compatible callback types in ${pattern}`, t => {
		const first = pattern.startsWith('[') ? '[value => value.toFixed()]' : '{handler: value => value.toFixed()}';
		const second = pattern.startsWith('[') ? '[value => value.toExponential()]' : '{handler: value => value.toExponential()}';
		const code = outdent`
			type Handler = (value: number) => string;
			function update(object: {kind: "first" | "second"; handler: Handler}) {
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
		const assignment = `${pattern} = object.kind === "first" ? ${first} : ${second}`;
		t.assert.strictEqual(fix.text, pattern.startsWith('[') ? `${assignment};` : `(${assignment});`);
		const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
		t.assert.deepStrictEqual(getDiagnostics(createProgram(output)), []);
	});
}

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
