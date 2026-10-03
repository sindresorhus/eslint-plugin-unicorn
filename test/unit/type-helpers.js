import test from 'node:test';
import {Linter} from 'eslint';
import {
	createTypeCheckers,
	nonTarget,
	target,
	unknown,
} from '../../rules/utils/type-helpers.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Return the type of the first argument of each `check()` call in `code`, or of each node that `selector` matches.
*/
const getTypes = (code, options, {selector, typeAware = false} = {}) => {
	const {getType} = createTypeCheckers({targetTypeNames: new Set(['Foo']), ...options});
	const types = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typeAware ? typescriptEslintParser : parsers.typescript.implementation,
			parserOptions: typeAware
				? {projectService: {allowDefaultProject: ['*.ts']}}
				: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							[selector ?? 'CallExpression[callee.name="check"]'](node) {
								types.push(getType(selector ? node : node.arguments[0], context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return types;
};

test('a union of only nullish members is not a target when nullish members are allowed', t => {
	t.assert.deepStrictEqual(getTypes('function f(a: null | undefined) { check(a); }', {allowNullishInMixedUnion: true}), [nonTarget]);
});

test('an intersection without a target or unknown member is not a target', t => {
	t.assert.deepStrictEqual(getTypes('function f(a: string & null) { check(a); }', {}), [nonTarget]);
});

const targetTypeImports = new Map([['foo', new Set(['Foo'])]]);

test('an import binding without an imported name is unknown', t => {
	t.assert.deepStrictEqual(getTypes('import * as Foo from \'foo\'; function f(a: Foo) { check(a); }', {
		preferTypeReferenceDefinitions: true,
		targetTypeImports,
	}), [unknown]);
});

test('an import specifier with a string name resolves the imported name', t => {
	const options = {targetTypeImports};

	t.assert.deepStrictEqual(getTypes('import {\'Foo\' as Bar} from \'foo\'; function f(a: Bar) { check(a); }', options), [target]);
	t.assert.deepStrictEqual(getTypes('import {\'Baz\' as Bar} from \'foo\'; function f(a: Bar) { check(a); }', options), [nonTarget]);
});

test('an interface that extends a member expression is unknown', t => {
	t.assert.deepStrictEqual(getTypes('interface Bar extends namespace.Foo {} function f(a: Bar) { check(a); }', {}), [unknown]);
});

test('a class that extends a member expression is unknown', t => {
	t.assert.deepStrictEqual(getTypes('class Bar extends namespace.Foo {} function f(a: Bar) { check(a); }', {}), [unknown]);
});

test('class syntax without class heritage checks only uses the class name', t => {
	const options = {checkClassSyntax: true, checkClassHeritage: false};

	t.assert.deepStrictEqual(getTypes('class Bar extends Foo { method() { check(this); } }', options), [nonTarget]);
	t.assert.deepStrictEqual(getTypes('check(new Foo());', options), [target]);
	t.assert.deepStrictEqual(getTypes('check(new class extends Foo {}());', options), [nonTarget]);
});

test('class syntax resolves class references', t => {
	const options = {checkClassSyntax: true};

	t.assert.deepStrictEqual(getTypes('class Bar extends Baz {} class Baz extends Bar {} check(new Bar());', options), [unknown]);
	t.assert.deepStrictEqual(getTypes('check(new Foo());', options), [target]);
	t.assert.deepStrictEqual(getTypes('check(new namespace.Foo());', options), [unknown]);
});

test('`this` in a plain function is unknown', t => {
	t.assert.deepStrictEqual(getTypes('function f() { check(this); }', {checkClassSyntax: true}), [unknown]);
});

test('`super` resolves the superclass of the enclosing class', t => {
	const options = {checkClassSyntax: true};

	t.assert.deepStrictEqual(getTypes('class Bar extends Foo { method() { super.method(); } }', options, {selector: 'Super'}), [target]);
	t.assert.deepStrictEqual(getTypes('class Bar { method() { super.method(); } }', options, {selector: 'Super'}), [nonTarget]);
	t.assert.deepStrictEqual(getTypes('const object = { method() { super.method(); } };', options, {selector: 'Super'}), [unknown]);
});

test('a missing node is unknown', t => {
	t.assert.deepStrictEqual(getTypes('check();', {}), [unknown]);
});

test('type information uses the base constraint of an indexed access type', t => {
	t.assert.deepStrictEqual(getTypes('class Foo { foo = 1; } function f<T extends {x: Foo}>(a: T[\'x\']) { check(a); }', {}, {typeAware: true}), [target]);
});

test('type information without a symbol is unknown', t => {
	t.assert.deepStrictEqual(getTypes('declare const object: {x: \'a\'; y: [number]}; check(object.x); check(object.y);', {}, {typeAware: true}), [unknown, unknown]);
});
