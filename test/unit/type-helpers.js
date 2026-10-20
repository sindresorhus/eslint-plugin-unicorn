import test from 'node:test';
import {Linter} from 'eslint';
import {
	createTypeCheckers,
	getTypeReferenceDefinition,
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
const getTypes = (code, options, {selector, typeAware = false, javascript = false} = {}) => {
	const {getType} = createTypeCheckers({targetTypeNames: new Set(['Foo']), ...options});
	const types = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: javascript
			? {}
			: {
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

test('uses JSDoc variable, parameter, and function return annotations', t => {
	for (const code of [
		'/** @type {Foo} */ let value; check(value);',
		'/** @param {Foo} value */ function run(value) { check(value); }',
		'/** @returns {Foo} */ function create() { return source; } check(create());',
		'/** @returns {Foo} */ const create = () => source; check(create());',
	]) {
		t.assert.deepStrictEqual(getTypes(code, {}), [target], code);
		t.assert.deepStrictEqual(getTypes(code, {}, {javascript: true}), [target], code);
	}
});

test('JSDoc annotations preserve union, optionality, and unknown inference policies', t => {
	for (const [type, expected] of [
		['Foo', target],
		['Foo<string>', target],
		['string', nonTarget],
		['Foo | string', unknown],
		['?Foo', unknown],
		['Foo=', unknown],
		['Unresolved', unknown],
	]) {
		const code = `/** @param {${type}} value */ function run(value) { check(value); }`;
		t.assert.deepStrictEqual(getTypes(code, {}), [expected], code);
	}

	t.assert.deepStrictEqual(getTypes('/** @param {Foo} [value] */ function run(value) { check(value); }', {}), [unknown]);
	t.assert.deepStrictEqual(getTypes('/** @param {?Foo} value */ function run(value) { check(value); }', {allowNullishInMixedUnion: true}), [target]);
	t.assert.deepStrictEqual(getTypes('/** @type {Unresolved} */ const value = new Foo(); check(value);', {targetConstructorNames: ['Foo']}), [unknown]);
});

test('native TypeScript annotations take precedence over JSDoc', t => {
	t.assert.deepStrictEqual(getTypes('/** @type {Foo} */ let value: string; check(value);', {}), [nonTarget]);
	t.assert.deepStrictEqual(getTypes('/** @returns {Foo} */ function create(): string { return source; } check(create());', {}), [nonTarget]);
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

test('class aliases resolve in their declaration scope', t => {
	const options = {checkClassSyntax: true};
	t.assert.deepStrictEqual(getTypes('class Base extends Foo {} const Alias = Base; { class Base extends Alias {} check(new Base()); }', options), [target]);
	t.assert.deepStrictEqual(getTypes('class Base extends Foo {} const Alias = class extends Base {}; { class Base {} check(new Alias()); }', options), [target]);
	t.assert.deepStrictEqual(getTypes('class Base {} const Alias = class extends Base {}; { class Base extends Foo {} check(new Alias()); }', options), [nonTarget]);
});

test('terminates recursive aliases and inheritance without suppressing repeated concrete types', t => {
	t.assert.deepStrictEqual(getTypes('type Cycle = Cycle; type First = Second; type Second = First; function f(a: Cycle, b: First) { check(a); check(b); }', {}), [unknown, unknown]);
	t.assert.deepStrictEqual(getTypes('interface First extends Second {} interface Second extends First {} function f(a: First) { check(a); }', {}), [unknown]);
	t.assert.deepStrictEqual(getTypes('function f<T extends U, U extends T>(a: T) { check(a); }', {}), [unknown]);
	t.assert.deepStrictEqual(getTypes('type Alias = Foo; type Union = Alias | Alias; interface First extends Foo {} interface Second extends First, Foo {} function f(a: Union, b: Second) { check(a); check(b); }', {}), [target, target]);
	t.assert.deepStrictEqual(getTypes('const first = second; const second = first; check(first); check(second); const value: Foo = source; const alias = value; check(condition ? alias : alias);', {}), [unknown, unknown, target]);
	t.assert.deepStrictEqual(getTypes('class First extends Second {} class Second extends First {} const Alias = First; check(new Alias());', {checkClassSyntax: true}), [unknown]);
});

test('type information handles cyclic constraints and concrete inheritance', t => {
	t.assert.deepStrictEqual(getTypes('function f<T extends U, U extends T>(a: {value: T}) { check(a.value); }', {}, {typeAware: true}), [unknown]);
	t.assert.deepStrictEqual(getTypes('class Foo { foo = 1; } class First extends Foo {} class Second extends First {} declare const object: {value: Second}; check(object.value);', {}, {typeAware: true}), [target]);
});

/*
Return the definition type and the declaring scope type of `getTypeReferenceDefinition()` for each `Foo` type reference.
*/
const getTypeReferenceDefinitions = code => {
	const results = [];
	linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'TSTypeReference[typeName.name="Foo"]'(node) {
								const result = getTypeReferenceDefinition('Foo', context.sourceCode.getScope(node));
								results.push(result && [result.definition.type, result.scope.type]);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	return results;
};

test('`getTypeReferenceDefinition` finds the nearest type-like definition and its scope', t => {
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('class Foo {} let a: Foo;'), [['ClassName', 'module']]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('import Foo from \'foo\'; let a: Foo;'), [['ImportBinding', 'module']]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('enum Foo {} let a: Foo;'), [['TSEnumName', 'module']]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('type Foo = string; let a: Foo;'), [['Type', 'module']]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('interface Foo {} let a: Foo;'), [['Type', 'module']]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('type Foo = string; function f() { type Foo = number; let a: Foo; }'), [['Type', 'function']]);
});

test('`getTypeReferenceDefinition` skips non-type definitions', t => {
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('const Foo = 1; let a: Foo;'), [undefined]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('let a: Foo;'), [undefined]);
	t.assert.deepStrictEqual(getTypeReferenceDefinitions('class Foo {} function f(Foo) { let a: Foo; }'), [['ClassName', 'module']]);
});

test('documented callback return types reuse named checker classification policies', t => {
	for (const [returnType, options, expected] of [
		['Foo<string>', {}, target],
		['string', {}, nonTarget],
		['Foo | string', {}, unknown],
		['Foo | string', {treatMixedUnionAsTarget: true}, target],
		['Foo | null', {}, unknown],
		['Foo | null', {allowNullishInMixedUnion: true}, target],
		['Unresolved', {}, unknown],
	]) {
		const code = `/** @type {() => ${returnType}} */ let create; check(create());`;
		t.assert.deepStrictEqual(getTypes(code, options, {javascript: true}), [expected], returnType);
	}
});

test('documented callable unions and intersections classify all possible return types', t => {
	for (const [type, expected] of [
		['(() => Foo) | (() => Foo<string>)', target],
		['(() => Foo) & {label: string}', target],
		['(() => Foo) & ({label: string} & {tag: string})', target],
		['((() => Foo) & {label: string}) & ((() => Foo) & {tag: string})', target],
		['(() => Foo) & (() => string)', unknown],
		['(() => Foo) & (() => unknown)', unknown],
		['(() => Foo) & Unresolved', unknown],
		['(() => Foo) | string', unknown],
		['{label: string} & {tag: string}', unknown],
		['?(() => Foo)', unknown],
		['(() => Foo)=', unknown],
	]) {
		const code = `/** @type {${type}} */ let create; check(create());`;
		t.assert.deepStrictEqual(getTypes(code, {}, {javascript: true}), [expected], type);
		t.assert.deepStrictEqual(getTypes(code, {}), [expected], type);
	}
});

test('documented callable return combinations reuse checker union policies', t => {
	for (const type of ['(() => Foo) | (() => string)', '(() => Foo) & (() => string)']) {
		const code = `/** @type {${type}} */ let create; check(create());`;
		t.assert.deepStrictEqual(getTypes(code, {treatMixedUnionAsTarget: true}, {javascript: true}), [target], type);
	}

	const code = '/** @type {(() => Foo) | (() => null)} */ let create; check(create());';
	t.assert.deepStrictEqual(getTypes(code, {allowNullishInMixedUnion: true}, {javascript: true}), [target]);
});

test('documented callback defaults cannot classify async or generator results', t => {
	for (const initializer of ['async () => source', 'function* () { return source; }', 'async function* () { return source; }']) {
		const code = `/** @param {() => Foo} create */ function run(create = ${initializer}) { check(create()); }`;
		t.assert.deepStrictEqual(getTypes(code, {}, {javascript: true}), [unknown], initializer);
		t.assert.deepStrictEqual(getTypes(code, {}), [unknown], initializer);
	}
});

test('native callback default return annotations do not replace parameter documentation', t => {
	for (const [documented, native] of [['Foo', 'string'], ['string', 'Foo'], ['Foo', 'Foo']]) {
		const code = `/** @param {() => ${documented}} create */ function run(create = (): ${native} => source) { check(create()); }`;
		t.assert.deepStrictEqual(getTypes(code, {}), [unknown], code);
	}

	const code = '/** @param {() => Foo} create */ function run(create = () => source) { check(create()); }';
	t.assert.deepStrictEqual(getTypes(code, {}, {javascript: true}), [target]);
});
