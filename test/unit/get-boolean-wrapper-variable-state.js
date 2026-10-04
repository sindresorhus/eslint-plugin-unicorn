import path from 'node:path';
import test from 'node:test';
import {Linter} from 'eslint';
import ts from 'typescript';
import {getBooleanWrapperVariableState} from '../../rules/utils/get-boolean-wrapper-variable-state.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();
const filename = path.resolve('file.ts');
const wrappers = new Map([['Ref', 'value']]);
const wrapperDeclaration = 'interface Ref<T> { value: T }';

// TypeScript passes file names with `/` separators, also on Windows, where `path.relative()` also ignores the case of the drive letter
const isFile = name => path.relative(name, filename) === '';

// A program without `strictNullChecks`, where `checker.getNonNullableType()` keeps a type parameter as is
const createNonStrictProgram = code => {
	const host = ts.createCompilerHost({});
	const {getSourceFile} = host;
	host.getSourceFile = (name, ...arguments_) => isFile(name)
		? ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true)
		: getSourceFile(name, ...arguments_);
	host.fileExists = name => isFile(name) || ts.sys.fileExists(name);
	host.readFile = name => isFile(name) ? code : ts.sys.readFile(name);

	return ts.createProgram([filename], {strict: false}, host);
};

/*
Return the boolean wrapper state of the variable named `isFoo` in `code`, with type information.
*/
const getState = (code, {strict = true} = {}) => {
	code = `${wrapperDeclaration} ${code}`;
	let state;

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typescriptEslintParser,
			parserOptions: strict
				? {projectService: {allowDefaultProject: ['*.ts']}}
				: {programs: [createNonStrictProgram(code)]},
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Program:exit'() {
								const variable = context.sourceCode.scopeManager.scopes
									.flatMap(scope => scope.variables)
									.find(variable => variable.name === 'isFoo');
								state = getBooleanWrapperVariableState({
									variable,
									definition: variable.defs[0],
									context,
									wrappers,
								});
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return state;
};

test('a nullable wrapper uses the wrapped value', t => {
	t.assert.strictEqual(getState('declare const isFoo: Ref<boolean> | undefined;'), 'boolean');
	t.assert.strictEqual(getState('declare const isFoo: Ref<string> | null;'), 'non-boolean');
});

test('a wrapped value of an unknown type is unknown', t => {
	t.assert.strictEqual(getState('declare const isFoo: Ref<any>;'), 'unknown');
});

test('a wrapped value uses the constraint of an indexed access type', t => {
	t.assert.strictEqual(getState('function f<T extends {x: boolean}>(isFoo: Ref<T[\'x\']>) {}'), 'boolean');
});

test('types without a configured wrapper are unknown', t => {
	for (const code of [
		'declare const isFoo: {a: 1} & {b: 2};',
		'declare const isFoo: Partial<{a: boolean}>;',
		'declare const isFoo: {[Key in \'a\']: boolean};',
		'function f<T extends Ref<boolean> | null>(isFoo: T) {}',
	]) {
		t.assert.strictEqual(getState(code), 'unknown', code);
	}
});

test('an unconstrained type parameter is unknown without `strictNullChecks`', t => {
	t.assert.strictEqual(getState('function f<T>(isFoo: T) {}', {strict: false}), 'unknown');
	t.assert.strictEqual(getState('function f<T extends Ref<boolean>>(isFoo: T) {}', {strict: false}), 'boolean');
});

test('terminates on cyclic wrapper inheritance and constraints', t => {
	for (const code of [
		'interface First extends Second {} interface Second extends First {} declare const isFoo: First;',
		'function foo<T extends U, U extends T>(isFoo: T) {}',
	]) {
		t.assert.strictEqual(getState(code), 'unknown', code);
	}

	for (const [code, expected] of [
		['interface First extends Second {} interface Second extends Ref<boolean> {} declare const isFoo: First;', 'boolean'],
		['interface First extends Second {} interface Second extends Ref<string> {} declare const isFoo: First;', 'non-boolean'],
		['function foo<T extends U, U extends Ref<boolean>>(isFoo: T) {}', 'boolean'],
	]) {
		t.assert.strictEqual(getState(code), expected, code);
	}
});
