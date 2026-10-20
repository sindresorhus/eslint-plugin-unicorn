import test from 'node:test';
import {Linter} from 'eslint';
import {getJSDocumentParameterNameRange, getJSDocumentTypeAnnotation, getJSDocumentReturnType} from '../../rules/utils/jsdoc-type.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/**
Collect annotations for inspected bindings or function returns.
*/
function getAnnotations(code, returns = false, typescript = false) {
	const annotations = [];
	const messages = linter.verify(code, {
		languageOptions: typescript
			? {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			}
			: {},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							[returns ? ':function' : 'CallExpression[callee.name="inspect"]'](node) {
								const annotation = returns
									? getJSDocumentReturnType(node, context)
									: getJSDocumentTypeAnnotation(node.arguments[0], context);
								annotations.push(annotation && {
									type: annotation.type,
									optional: annotation.optional,
									name: annotation.nameRange && code.slice(...annotation.nameRange),
								});
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return annotations;
}

test('finds direct variable and exact named parameter annotations', t => {
	const [variable, parameter, unrelated] = getAnnotations('/** @type {boolean} */ let flag; inspect(flag); /** @param {string} text */ function run(other, text) { inspect(text); inspect(other); }');
	t.assert.strictEqual(variable.type.name, 'boolean');
	t.assert.strictEqual(parameter.type.name, 'string');
	t.assert.strictEqual(parameter.name, 'text');
	t.assert.strictEqual(unrelated, undefined);
});

test('preserves optional parameter name ranges and multiline type expressions', t => {
	const [parameter] = getAnnotations('/**\r\n * @argument {\r\n * boolean\r\n * } [flag = false] Description.\r\n */\r\nfunction run(flag) { inspect(flag); }');
	t.assert.strictEqual(parameter.type.name, 'boolean');
	t.assert.strictEqual(parameter.optional, true);
	t.assert.strictEqual(parameter.name, 'flag');
});

test('treats an optional type as parameter optionality', t => {
	const [parameter] = getAnnotations('/** @param {boolean=} flag */ function run(flag) { inspect(flag); }');
	t.assert.strictEqual(parameter.type.name, 'boolean');
	t.assert.strictEqual(parameter.optional, true);
});

test('finds return annotations on functions and their declaration wrappers', t => {
	for (const code of [
		'/** @return {boolean} */ function run() {}',
		'/** @returns {boolean} */ export function run() {}',
		'/** @returns {boolean} */ const run = () => {};',
		'const object = {/** @returns {boolean} */ run() {}};',
		'class Example {/** @returns {boolean} */ run() {}}',
	]) {
		t.assert.strictEqual(getAnnotations(code, true)[0].type.name, 'boolean', code);
	}
});

test('ignores malformed, duplicate, mismatched, and unrelated annotations', t => {
	for (const code of [
		'/* @type {boolean} */ let flag; inspect(flag);',
		'/** @type {boolean */ let flag; inspect(flag);',
		'/** @type {boolean}\n * @type {string} */ let flag; inspect(flag);',
		'/** @type {boolean}\n * @type {boolean |} */ let flag; inspect(flag);',
		'/** @param {boolean} flag\n * @param {boolean |} flag */ function run(flag) { inspect(flag); }',
		'/** @type {boolean} */ const other = 1; let flag; inspect(flag);',
		'/** @param {boolean} other */ function run(flag) { inspect(flag); }',
		'/** @param {boolean} flag.value */ function run(flag) { inspect(flag); }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code), [undefined], code);
	}
});

test('does not attach whole-value annotations to destructured or multiple bindings', t => {
	for (const code of [
		'/** @type {boolean} */ let flag, other; inspect(flag); inspect(other);',
		'/** @type {boolean} */ const {flag} = source; inspect(flag);',
		'/** @param {boolean} flag */ function run({flag}) { inspect(flag); }',
	]) {
		t.assert.strictEqual(getAnnotations(code).every(annotation => annotation === undefined), true, code);
	}
});

for (const [name, code] of [
	['exported variable', '/** @type {boolean} */ export let flag; inspect(flag);'],
	['documentation inside export wrapper', 'export /** @type {boolean} */ let flag; inspect(flag);'],
	['inline variable binding', 'let /** @type {boolean} */ flag; inspect(flag);'],
	['default parameter', '/** @param {boolean} flag */ function run(flag = fallback) { inspect(flag); }'],
	['arg alias', '/** @arg {boolean} flag */ function run(flag) { inspect(flag); }'],
	['argument alias', '/** @argument {boolean} flag */ function run(flag) { inspect(flag); }'],
	['arrow parameter', '/** @param {boolean} flag */ const run = flag => { inspect(flag); };'],
	['exported arrow parameter', '/** @param {boolean} flag */ export const run = flag => { inspect(flag); };'],
	['function expression parameter', '/** @param {boolean} flag */ const run = function (flag) { inspect(flag); };'],
	['object method parameter', 'const object = {/** @param {boolean} flag */ run(flag) { inspect(flag); }};'],
	['class method parameter', 'class Example {/** @param {boolean} flag */ run(flag) { inspect(flag); }}'],
	['class field arrow parameter', 'class Example {/** @param {boolean} flag */ run = flag => { inspect(flag); };}'],
	['inline parameter', 'function run(/** @type {boolean} */ flag) { inspect(flag); }'],
	['inline parameter precedence', '/** @param {string} flag */ function run(/** @type {boolean} */ flag) { inspect(flag); }'],
]) {
	test(`associates ${name}`, t => {
		t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type), [{kind: 'name', name: 'boolean'}]);
	});
}

test('matches reordered parameter tags by exact name rather than position', t => {
	const annotations = getAnnotations('/**\n * @param {string} second Description mentioning first.\n * @param {boolean} first\n */ function run(first, second, third) { inspect(first); inspect(second); inspect(third); }');
	t.assert.deepStrictEqual(annotations.map(annotation => annotation?.type.name), ['boolean', 'string', undefined]);
	t.assert.deepStrictEqual(annotations.map(annotation => annotation?.name), ['first', 'second', undefined]);
});

test('resolves shadowed names to their own declarations', t => {
	const annotations = getAnnotations('/** @type {boolean} */ let value; inspect(value); { /** @type {string} */ let value; inspect(value); } function run(value) { inspect(value); } inspect(value);');
	t.assert.deepStrictEqual(annotations.map(annotation => annotation?.type.name), ['boolean', 'string', undefined, 'boolean']);
});

test('does not leak cached annotations between source files with identical ranges', t => {
	for (const type of ['boolean', 'string', 'boolean']) {
		t.assert.strictEqual(getAnnotations(`/** @type {${type}} */ let value; inspect(value);`)[0].type.name, type);
	}
});

for (const [name, code] of [
	['default export', '/** @returns {boolean} */ export default function () {}'],
	['inline arrow', 'const run = /** @returns {boolean} */ () => {};'],
	['class field', 'class Example {/** @returns {boolean} */ run = () => {};}'],
]) {
	test(`finds return annotations on ${name}`, t => {
		t.assert.strictEqual(getAnnotations(code, true)[0].type.name, 'boolean');
	});
}

test('does not inherit return documentation in nested functions', t => {
	const annotations = getAnnotations('/** @returns {boolean} */ function outer() { function inner() {} }', true);
	t.assert.deepStrictEqual(annotations.map(annotation => annotation?.type.name), ['boolean', undefined]);
});

test('keeps balanced malformed and unsupported types as unknown annotations', t => {
	for (const type of ['boolean |', 'Array<>', '(boolean', 'keyof Value', 'import("example").Value', 'T extends boolean ? boolean : string']) {
		const [annotation] = getAnnotations(`/** @type {${type}} */ const flag = true; inspect(flag);`);
		t.assert.deepStrictEqual(annotation.type, {kind: 'unknown'}, type);
	}
});

test('unknown parameter types preserve optional metadata and rename ranges', t => {
	const [annotation] = getAnnotations('/** @param {boolean |} [flag=false] Description. */ function run(flag = true) { inspect(flag); }');
	t.assert.deepStrictEqual(annotation, {type: {kind: 'unknown'}, optional: true, name: 'flag'});
});

test('native TypeScript annotations take precedence over documented binding and return types', t => {
	t.assert.deepStrictEqual(getAnnotations('/** @param {boolean} flag */ function run(flag: string) { inspect(flag); }', false, true), [undefined]);
	t.assert.deepStrictEqual(getAnnotations('/** @type {boolean} */ let flag: string; inspect(flag);', false, true), [undefined]);
	t.assert.deepStrictEqual(getAnnotations('/** @returns {boolean} */ function run(): string {}', true, true), [undefined]);
});

for (const [name, code] of [
	['missing type braces', '/** @type boolean */ let flag; inspect(flag);'],
	['duplicate parameter aliases', '/** @param {boolean} flag\n * @arg {boolean} flag */ function run(flag) { inspect(flag); }'],
	['intervening ordinary comment', '/** @type {boolean} */ /* Other comment. */ let flag; inspect(flag);'],
	['intervening line comment', '/** @type {boolean} */\n// Other comment.\nlet flag; inspect(flag);'],
	['unbalanced optional name', '/** @param {boolean} [flag=false */ function run(flag) { inspect(flag); }'],
	['parameter prefix mismatch', '/** @param {boolean} flagLong */ function run(flag) { inspect(flag); }'],
	['rest parameter', '/** @param {boolean} flag */ function run(...flag) { inspect(flag); }'],
	['cast expression', 'inspect(/** @type {boolean} */ (source));'],
	['property reads', 'const object = {/** @type {boolean} */ flag: source}; inspect(object.flag);'],
]) {
	test(`ignores ${name}`, t => {
		t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	});
}

test('duplicate return aliases and multi-declarator ownership are ambiguous', t => {
	for (const code of [
		'/** @returns {boolean}\n * @return {boolean} */ function run() {}',
		'/** @returns {boolean} */ const first = () => {}, second = () => {};',
	]) {
		t.assert.strictEqual(getAnnotations(code, true).every(annotation => annotation === undefined), true, code);
	}
});

/**
Collect parameter tag source ranges independently of type annotation precedence.
*/
function getParameterRanges(code, typescript = false) {
	const ranges = [];
	const messages = linter.verify(code, {
		languageOptions: typescript
			? {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			}
			: {},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							':function'(node) {
								for (const parameter of node.params) {
									const identifier = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
									ranges.push(getJSDocumentParameterNameRange(identifier, context));
								}
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return ranges;
}

test('uses UTF-16 source offsets for Unicode names, astral descriptions, and CRLF', t => {
	const code = '/** 😀 Description.\r\n * @param {boolean} [许可 = false] Preserve 😀 and 许可 in descriptions.\r\n * @param {string} $other\r\n */\r\nfunction run(许可, $other) {}';
	const first = code.indexOf('许可 = false');
	const second = code.indexOf('$other');
	t.assert.deepStrictEqual(getParameterRanges(code), [[first, first + 2], [second, second + 6]]);
});

test('preserves documented name ranges for native TypeScript parameters with defaults', t => {
	const code = '/** @param {boolean} [flag = false] flag description */ function run(flag: string = "") {}';
	const start = code.indexOf('flag = false');
	t.assert.deepStrictEqual(getParameterRanges(code, true), [[start, start + 4]]);
});

test('does not return a name range for ambiguous or inline-only parameter documentation', t => {
	t.assert.deepStrictEqual(getParameterRanges('/** @param {boolean} flag\n * @argument {string} flag */ function run(flag) {}'), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges('function run(/** @type {boolean} */ flag) {}'), [undefined]);
});

test('direct object properties and class fields expose their own annotation', t => {
	const annotations = [];
	const messages = linter.verify('const object = {/** @type {boolean} */ documented: source}; class Example {/** @type {string} */ documented = source; /** @type {number} */ static count;}', {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Property, PropertyDefinition'(node) {
								annotations.push(getJSDocumentTypeAnnotation(node, context)?.type.name);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	t.assert.deepStrictEqual(messages, []);
	t.assert.deepStrictEqual(annotations, ['boolean', 'string', 'number']);
});

test('optional default syntax changes metadata without expanding the name range', t => {
	for (const parameter of ['[flag]', '[flag=false]', '[flag = true]', '[flag = "text ] value"]', '[flag = {ready: true}]']) {
		const code = `/** @param {boolean} ${parameter} Description flag. */ function run(flag) { inspect(flag); }`;
		t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}], parameter);
	}
});

// Inline type precedence must not erase the parameter's documented optionality.
for (const [name, documentation] of [
	['bracketed name', '/** @param {string} [flag] */'],
	['bracketed default', '/** @param {string} [flag=false] */'],
	['Closure optional type', '/** @param {string=} flag */'],
]) {
	test(`preserves ${name} optionality when an inline type wins`, t => {
		const code = `${documentation} function run(/** @type {boolean} */ flag) { inspect(flag); }`;
		t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	});
}

test('inline optional type metadata survives a required named tag', t => {
	const code = '/** @param {string} flag */ function run(/** @type {boolean=} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
});

for (const [name, tag] of [
	['plain name', '@param flag'],
	['description', '@param flag - Keep flag in prose.'],
	['optional name', '@param [flag]'],
	['optional default', '@param [flag = false] Description.'],
	['arg alias', '@arg flag'],
	['argument alias', '@argument [flag="flag"]'],
]) {
	test(`finds rename ranges for an untyped parameter ${name}`, t => {
		const code = `/** ${tag} */ function run(flag = false) { inspect(flag); }`;
		const [range] = getParameterRanges(code);
		t.assert.strictEqual(range && code.slice(...range), 'flag');
		t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	});
}

test('untyped optional parameter metadata combines with inline type evidence', t => {
	const code = '/** @param [flag=false] Description. */ function run(/** @type {boolean} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
});

test('an untyped duplicate tag makes parameter evidence and name ranges ambiguous', t => {
	const code = '/** @param {boolean} flag\n * @argument flag Description. */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('untyped property paths and malformed optional names do not supply rename ranges', t => {
	for (const tag of ['@param flag.value', '@param flag[]', '@param [flag=false', '@param [flag.other]']) {
		const code = `/** ${tag} */ function run(flag) {}`;
		t.assert.deepStrictEqual(getParameterRanges(code), [undefined], tag);
	}
});

for (const [name, code] of [
	['as assertion', '/** @returns {boolean} */ const run = (() => source) as (() => boolean);'],
	['satisfies expression', '/** @returns {boolean} */ const run = (() => source) satisfies (() => boolean);'],
	['non-null expression', '/** @returns {boolean} */ const run = (() => source)!;'],
	['angle assertion', '/** @returns {boolean} */ const run = <() => boolean>(() => source);'],
	['nested wrappers', '/** @returns {boolean} */ const run = (((() => source) as (() => boolean))!) satisfies (() => boolean);'],
	['exported wrapper', '/** @returns {boolean} */ export const run = (() => source) satisfies (() => boolean);'],
	['class field wrapper', 'class Example { /** @returns {boolean} */ run = (() => source) as (() => boolean); }'],
	['object property wrapper', 'const object = {/** @returns {boolean} */ run: (() => source) as (() => boolean)};'],
	['function expression wrapper', '/** @returns {boolean} */ const run = (function () { return source; }) as (() => boolean);'],
]) {
	test(`associates return documentation through a TypeScript ${name}`, t => {
		t.assert.strictEqual(getAnnotations(code, true, true)[0]?.type.name, 'boolean');
	});
}

test('associates parameter documentation through TypeScript function wrappers', t => {
	const code = '/** @param {boolean} flag */ const run = ((flag) => { inspect(flag); }) satisfies ((flag: boolean) => void);';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code, true)[0]), 'flag');
});

test('native return types retain precedence through TypeScript wrappers', t => {
	const code = '/** @returns {boolean} */ const run = (() : string => source) satisfies (() => string);';
	t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined]);
});

test('TypeScript wrappers do not associate multi-declarator or call argument documentation', t => {
	for (const code of [
		'/** @returns {boolean} */ const first = (() => source) as (() => boolean), second = 1;',
		'/** @returns {boolean} */ const run = wrap((() => source) as (() => boolean));',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined], code);
	}
});

test('native callable bindings and fields take precedence over documented returns', t => {
	for (const code of [
		'/** @returns {boolean} */ const run: () => string = () => source;',
		'/** @returns {boolean} */ class Example { run: () => string = () => source; }',
		'class Example { /** @returns {boolean} */ run: () => string = () => source; }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined], code);
	}
});

test('native callable owner types retain precedence through satisfies and non-null wrappers', t => {
	for (const code of [
		'/** @returns {boolean} */ const run: () => string = (() => source) satisfies (() => string);',
		'class Example { /** @returns {boolean} */ run: () => string = (() => source)!; }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined], code);
	}
});

test('native callable owner types do not erase parameter rename metadata', t => {
	const code = '/** @param flag */ const run: (flag: boolean) => void = (flag) => consume(flag);';
	const [range] = getParameterRanges(code, true);
	t.assert.strictEqual(code.slice(...range), 'flag');
});

test('native asserted initializers suppress conflicting binding documentation', t => {
	for (const initializer of ['source as string', '<string>source', '(source as string)!', '(source as string) satisfies string']) {
		const code = `/** @type {boolean} */ const flag = ${initializer}; inspect(flag);`;
		t.assert.deepStrictEqual(getAnnotations(code, false, true), [undefined], initializer);
	}
});

test('native initializer assertions do not erase parameter rename metadata', t => {
	const code = '/** @param {boolean} flag */ const run = ((flag) => consume(flag)) as ((flag: string) => void);';
	const [range] = getParameterRanges(code, true);
	t.assert.strictEqual(code.slice(...range), 'flag');
});
