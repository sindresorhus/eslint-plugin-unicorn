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

for (const [name, assignment, typescript] of [
	['prototype method', 'Example.prototype.run = function (flag) { inspect(flag); };', false],
	['CommonJS export', 'module.exports = flag => { inspect(flag); };', false],
	['identifier assignment', 'run = flag => { inspect(flag); };', false],
	['wrapped function assignment', 'module.exports = ((flag) => { inspect(flag); }) satisfies ((flag: boolean) => string);', true],
]) {
	test(`associates parameter and return documentation with a direct ${name}`, t => {
		const documentation = '/** @param {boolean} [flag=false]\n * @returns {string} */ ';
		const code = documentation + assignment;
		t.assert.deepStrictEqual(getAnnotations(code, false, typescript), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
		t.assert.strictEqual(getAnnotations(code, true, typescript)[0]?.type.name, 'string');
		const [range] = getParameterRanges(code, typescript);
		t.assert.strictEqual(code.slice(...range), 'flag');
	});
}

test('assignment documentation does not escape nested, compound, or conditional expressions', t => {
	for (const assignment of [
		'consume(run = flag => { inspect(flag); });',
		'first = second = flag => { inspect(flag); };',
		'run ||= flag => { inspect(flag); };',
		'condition ? run = flag => { inspect(flag); } : source;',
	]) {
		const code = `/** @param {boolean} flag\n * @returns {string} */ ${assignment}`;
		t.assert.deepStrictEqual(getAnnotations(code), [undefined], assignment);
		t.assert.deepStrictEqual(getAnnotations(code, true), [undefined], assignment);
		t.assert.deepStrictEqual(getParameterRanges(code), [undefined], assignment);
	}
});

test('inline annotations belong to individual declarators in a multiple declaration', t => {
	const code = 'const /** @type {boolean} */ first = source, /** @type {string} */ second = source, third = source; inspect(first); inspect(second); inspect(third);';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'string', undefined]);
});

test('inline function documentation belongs to one declarator in a multiple declaration', t => {
	const code = 'const /** @param {boolean} flag\n * @returns {string} */ run = flag => { inspect(flag); }, other = () => source;';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', undefined]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('declaration documentation does not override an individually documented binding', t => {
	const code = '/** @type {boolean} */ export const first = source, /** @type {string} */ second = source; inspect(first); inspect(second);';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), [undefined, 'string']);
});

test('assignment-owned parameter ranges preserve quoted defaults and descriptions', t => {
	const code = '/** 😀\r\n * @argument {boolean} [flag = "keep ] flag"] Preserve flag.\r\n */\r\nmodule.exports = function (flag = source) { inspect(flag); };';
	const start = code.indexOf('flag = "keep');
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]]);
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
});

test('direct assignment ownership preserves native parameter and return precedence', t => {
	const code = '/** @param {boolean} flag\n * @returns {boolean} */ module.exports = (flag: string): string => { inspect(flag); return source; };';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined]);
	const [range] = getParameterRanges(code, true);
	t.assert.strictEqual(code.slice(...range), 'flag');
});

test('individual declarator documentation preserves native binding precedence', t => {
	const code = 'const /** @type {boolean} */ first: string = source, /** @type {boolean} */ second = source as string; inspect(first); inspect(second);';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [undefined, undefined]);
});

test('duplicate assignment-owned tags remain ambiguous', t => {
	const code = '/** @param {boolean} flag\n * @arg {string} flag\n * @return {boolean}\n * @returns {string} */ module.exports = flag => { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('captured parameter references retain their declaration documentation across nested scopes', t => {
	const code = '/** @param {boolean} value */ function outer(value) { const read = () => inspect(value); /** @param {string} value */ function inner(value) { const read = () => inspect(value); } inspect(value); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'string', 'boolean']);
});

test('escaped JavaScript identifiers match decoded documented parameter names', t => {
	const code = String.raw`/** @param {boolean} value */ function run(v\u0061lue) { inspect(v\u0061lue); }`;
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'value'}]);
	const start = code.indexOf('value');
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 5]]);
});

test('property-path tags neither match nor make a simple parameter tag ambiguous', t => {
	const code = '/** @param {boolean} value.ready\n * @param {string} value\n * @param {number} values\n */ function run(value, values) { inspect(value); inspect(values); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['string', 'number']);
	t.assert.deepStrictEqual(getParameterRanges(code).map(range => code.slice(...range)), ['value', 'values']);
});

test('a closer function comment owns all tags instead of borrowing missing tags from the declaration', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ const run = /** @returns {number} */ flag => { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'number');
});

test('ordinary initializer comments block outer function documentation', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ module.exports = /* Implementation details. */ flag => { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
});

test('sibling function declarators keep independent tags and exact source ranges', t => {
	const code = 'const /** @param {boolean} flag\n * @returns {string} */ first = flag => { inspect(flag); }, /** @param {number} flag\n * @returns {boolean} */ second = flag => { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'number']);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', 'boolean']);
	const first = code.indexOf('flag');
	const second = code.indexOf('flag', code.indexOf('@param {number}'));
	t.assert.deepStrictEqual(getParameterRanges(code), [[first, first + 4], [second, second + 4]]);
});

test('documentation on an assignment does not leak into a nested implementation callback', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ module.exports = flag => { inspect(flag); return () => { inspect(flag); }; };';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'boolean']);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code).map(range => code.slice(...range)), ['flag']);
});

test('default-exported arrow expressions own parameter and return documentation', t => {
	const code = '/** @arg {boolean} [flag=false]\n * @return {string} */ export default (flag => { inspect(flag); });';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('functions in default parameters do not inherit the outer function documentation', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ function run(flag = function (flag) { inspect(flag); }) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), [undefined, 'boolean']);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', undefined]);
	const start = code.indexOf('flag');
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4], undefined]);
});

for (const declaration of ['@callback Check', '@typedef {function(boolean): string} Check']) {
	test(`type declaration ${declaration} does not annotate an adjacent function`, t => {
		const code = `/** ${declaration}\n * @param {boolean} flag\n * @returns {string}\n */ function run(flag) { inspect(flag); }`;
		t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
		t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
		t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
	});
}

test('a type-declaration comment cannot provide a binding annotation', t => {
	const code = '/** @typedef {boolean} Flag\n * @type {boolean}\n */ let flag; inspect(flag);';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
});

test('separate function documentation still owns its tags after a callback declaration', t => {
	const code = '/** @callback Check\n * @param {number} flag\n * @returns {number} */\n/** @param {boolean} flag\n * @returns {string} */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('astral identifier characters retain exact optional parameter ranges', t => {
	const code = '/** @param {boolean} [flag𐐀 = false] Preserve flag𐐀. */ function run(flag𐐀) { inspect(flag𐐀); }';
	const start = code.indexOf('flag𐐀');
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 'flag𐐀'.length]]);
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag𐐀'}]);
});

test('getter return tags and setter parameter tags belong to separate method owners', t => {
	const code = 'const task = {/** @returns {string} */ get ready() { return source; }, /** @param {boolean} value */ set ready(value) { inspect(value); }};';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'value'}]);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', undefined]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'value');
});

test('ignoring callback declaration tags does not suppress an independent inline parameter type', t => {
	const code = '/** @callback Check\n * @param {string} flag\n * @returns {string} */ function run(/** @type {boolean} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: undefined}]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
});

test('decorated method documentation skips decorator callbacks and preserves native return precedence', t => {
	const code = 'class Task { /** @param {boolean} flag\n * @returns {string} */ @decorate(function (flag) { inspect(flag); }) run(flag): number { inspect(flag); return source; } }';
	t.assert.deepStrictEqual(getAnnotations(code, false, true).map(annotation => annotation?.type.name), [undefined, 'boolean']);
	t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined, undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code, true).map(range => range && code.slice(...range)), [undefined, 'flag']);
});

test('overload documentation does not become an implementation annotation', t => {
	const code = '/** @overload\n * @param {string} flag\n * @returns {string} */\n/** @overload\n * @param {boolean} flag\n * @returns {boolean} */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('implementation documentation remains independent from preceding overload signatures', t => {
	const code = '/** @overload\n * @param {boolean} flag\n * @returns {boolean} */\n/** @param {string} flag\n * @returns {number} */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'string'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'number');
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('optional parameter names require a boundary after their closing bracket', t => {
	for (const name of ['[flag]suffix', '[flag=false].value', '[flag="text"][]']) {
		const code = `/** @param {boolean} ${name} */ function run(flag) { inspect(flag); }`;
		t.assert.deepStrictEqual(getAnnotations(code), [undefined], name);
		t.assert.deepStrictEqual(getParameterRanges(code), [undefined], name);
	}
});

test('auto-accessor initializers own parameter and return documentation', t => {
	const code = 'class Example { /** @param {boolean} flag\n * @returns {string} */ accessor read = flag => { inspect(flag); }; }';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true, true)[0]?.type.name, 'string');
	t.assert.strictEqual(code.slice(...getParameterRanges(code, true)[0]), 'flag');
});

test('native auto-accessor binding types override documented initializer returns', t => {
	const code = 'class Example { /** @returns {boolean} */ accessor read: () => string = () => source; }';
	t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined]);
});
