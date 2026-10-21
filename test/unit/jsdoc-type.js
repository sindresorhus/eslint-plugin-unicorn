import test from 'node:test';
import {Linter} from 'eslint';
import {
	getJSDocumentParameterNameRange,
	getJSDocumentTypeAnnotation,
	getJSDocumentReturnType,
	hasJSDocumentComments,
} from '../../rules/utils/jsdoc-type.js';
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

test('ungrouped optional callbacks retain their return type and parameter name', t => {
	for (const type of ['function(): boolean=', '() => boolean=']) {
		const code = `/** @param {${type}} ready */ function run(ready) { inspect(ready); }`;
		for (const typescript of [false, true]) {
			t.assert.deepStrictEqual(getAnnotations(code, false, typescript), [{
				type: {kind: 'function', returnType: {kind: 'name', name: 'boolean'}},
				optional: true,
				name: 'ready',
			}], type);
		}
	}
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

test('getter type annotations describe their returned value', t => {
	for (const code of [
		'const task = { /** @type {boolean} */ get ready() { return source; } };',
		'class Task { /** @type {boolean} */ get ready() { return source; } }',
	]) {
		for (const typescript of [false, true]) {
			t.assert.strictEqual(getAnnotations(code, true, typescript)[0]?.type.name, 'boolean', code);
		}
	}
});

test('getter documentation belongs to its value function rather than a computed key', t => {
	for (const tag of ['type', 'returns']) {
		for (const code of [
			`const task = { /** @${tag} {boolean} */ get [function key() { return source; }]() { return source; } };`,
			`class Task { /** @${tag} {boolean} */ get [function key() { return source; }]() { return source; } }`,
			`const task = { /** @${tag} {boolean} */ get [/** @type {string} */ function key() { return source; }]() { return source; } };`,
			`class Task { /** @${tag} {boolean} */ get [/** @type {string} */ function key() { return source; }]() { return source; } }`,
		]) {
			const annotations = getAnnotations(code, true);
			t.assert.strictEqual(annotations[0], undefined, code);
			t.assert.strictEqual(annotations[1]?.type.name, 'boolean', code);
		}
	}
});

test('getter type and return tags must identify one unambiguous annotation', t => {
	for (const tags of [
		'@type {boolean}\n * @returns {string}',
		'@return {boolean}\n * @type {boolean}',
		'@type {boolean}\n * @type {string}',
	]) {
		const code = `class Task { /** ${tags} */ get ready() { return source; } }`;
		t.assert.deepStrictEqual(getAnnotations(code, true), [undefined], tags);
	}
});

test('type tags on ordinary methods and setters do not describe returned values', t => {
	for (const code of [
		'/** @type {boolean} */ function ready() { return source; }',
		'const task = { /** @type {boolean} */ ready() { return source; } };',
		'class Task { /** @type {boolean} */ ready() { return source; } }',
		'class Task { /** @type {boolean} */ set ready(value) {} }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code, true), [undefined], code);
	}
});

test('native getter return annotations override documented property types', t => {
	for (const code of [
		'const task = { /** @type {boolean} */ get ready(): string { return source; } };',
		'class Task { /** @type {boolean} */ get ready(): string { return source; } }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code, true, true), [undefined], code);
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

test('irrelevant type tags retain parameter and return boundaries without contributing annotations', t => {
	for (const tag of ['throws', 'exception', 'property', 'prop', 'this', 'extends', 'satisfies', 'example', 'custom']) {
		const code = [
			'/**',
			` * @${tag} {Array<{broken:} flag`,
			' * @argument {boolean} [flag=false] Keep flag in the description.',
			` * @${tag} {function(string): number} flag`,
			' * @return {string}',
			' */ function run(flag = source) { inspect(flag); }',
		].join('\r\n');
		t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}], tag);
		t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string', tag);
		const start = code.indexOf('[flag') + 1;
		t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]], tag);
	}
});

test('irrelevant tags do not supply a binding type or hide duplicate supported tags', t => {
	for (const tag of ['throws', 'property', 'example']) {
		const code = `/** @${tag} {boolean} flag */ let flag; inspect(flag);`;
		t.assert.deepStrictEqual(getAnnotations(code), [undefined], tag);
		const duplicate = `/** @type {boolean}\n * @${tag} {string}\n * @type {number} */ let flag; inspect(flag);`;
		t.assert.deepStrictEqual(getAnnotations(duplicate), [undefined], tag);
	}
});

test('irrelevant tags remain boundaries for malformed supported annotations', t => {
	const code = '/** @param {boolean\n * @throws Error} flag\n * @returns {string} */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
});

test('ignored declaration tags still exclude the whole documentation comment from inference', t => {
	for (const declaration of ['@typedef {boolean} Flag', '@callback Read', '@overload']) {
		const code = [
			'/** @param {boolean} flag',
			' * @throws {Error}',
			` * ${declaration}`,
			' * @returns {string} */ function run(flag) { inspect(flag); }',
		].join('\n');
		t.assert.deepStrictEqual(getAnnotations(code), [undefined], declaration);
		t.assert.deepStrictEqual(getAnnotations(code, true), [undefined], declaration);
		t.assert.deepStrictEqual(getParameterRanges(code), [undefined], declaration);
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

test('annotation consumers share successful and missing lookups without hiding native parameter rename metadata', t => {
	const code = [
		'/** @param {boolean} [flag=false]',
		' * @returns {string} */ function documented(flag = source) { inspect(flag); }',
		'function undocumented(flag) { inspect(flag); }',
		'/** @param {boolean} [flag=false]',
		' * @returns {boolean} */ function native(flag: string): number { inspect(flag); }',
	].join('\n');
	const visited = [];
	const messages = linter.verify(code, {
		languageOptions: {parser: parsers.typescript.implementation},
		plugins: {
			test: {
				rules: {
					capture: {
						create(context) {
							const calls = {getAllComments: 0, getCommentsBefore: 0, getScope: 0};
							const sourceCode = new Proxy(context.sourceCode, {
								get(target, property) {
									const value = Reflect.get(target, property, target);
									if (Object.hasOwn(calls, property)) {
										return (...arguments_) => {
											calls[property]++;
											return value.apply(target, arguments_);
										};
									}

									return typeof value === 'function' ? value.bind(target) : value;
								},
							});
							return {
								FunctionDeclaration(node) {
									const parameter = node.params[0].left ?? node.params[0];
									const reference = node.body.body[0].expression.arguments[0];
									const firstContext = {sourceCode};
									const annotation = getJSDocumentTypeAnnotation(parameter, firstContext);
									const referenceAnnotation = getJSDocumentTypeAnnotation(reference, firstContext);
									const returnAnnotation = getJSDocumentReturnType(node, firstContext);
									const range = getJSDocumentParameterNameRange(parameter, firstContext);
									const firstCalls = {...calls};
									const secondContext = {sourceCode};
									t.assert.deepStrictEqual(getJSDocumentParameterNameRange(parameter, secondContext), range);
									t.assert.deepStrictEqual(getJSDocumentReturnType(node, secondContext), returnAnnotation);
									t.assert.deepStrictEqual(getJSDocumentTypeAnnotation(reference, secondContext), referenceAnnotation);
									t.assert.deepStrictEqual(getJSDocumentTypeAnnotation(parameter, secondContext), annotation);
									t.assert.deepStrictEqual(calls, firstCalls);
									t.assert.strictEqual(calls.getAllComments, 1);
									t.assert.deepStrictEqual(referenceAnnotation, annotation);
									visited.push([node.id.name, annotation?.type.name, returnAnnotation?.type.name, range && code.slice(...range)]);
								},
							};
						},
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	t.assert.deepStrictEqual(messages, []);
	t.assert.deepStrictEqual(visited, [
		['documented', 'boolean', 'string', 'flag'],
		['undocumented', undefined, undefined, undefined],
		['native', undefined, undefined, 'flag'],
	]);
});

test('documentation presence is isolated to each source file and includes description-only comments', t => {
	for (const [code, expected] of [
		['/** @type {boolean} */ let value;', true],
		['/* @type {boolean} */ let value;', false],
		['// /** @type {boolean} */\nlet value;', false],
		['/** Description only. */ let value;', true],
		['let value;', false],
	]) {
		let actual;
		const messages = linter.verify(code, {
			plugins: {
				test: {
					rules: {
						capture: {
							create: context => ({
								Program() {
									actual = hasJSDocumentComments(context);
								},
							}),
						},
					},
				},
			},
			rules: {'test/capture': 'error'},
		});
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(actual, expected, code);
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
									const binding = parameter.type === 'TSParameterProperty' ? parameter.parameter : parameter;
									const identifier = binding.type === 'AssignmentPattern' ? binding.left : binding;
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
	const code = 'const object = {/** @type {boolean} */ documented: source}; class Example {/** @type {string} */ documented = source; /** @type {number} */ static count;}';
	t.assert.deepStrictEqual(getPropertyTypes(code).map(type => type?.name), ['boolean', 'string', 'number']);
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

test('constructor parameter properties own exact named documentation', t => {
	for (const parameter of ['public flag', 'private flag', 'protected flag', 'readonly flag', 'public readonly flag = source']) {
		const code = `class Example { /** @param {boolean} [flag=false] */ constructor(${parameter}) { inspect(flag); } }`;
		t.assert.deepStrictEqual(getAnnotations(code, false, true), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}], parameter);
		t.assert.strictEqual(code.slice(...getParameterRanges(code, true)[0]), 'flag', parameter);
	}
});

test('constructor parameter properties preserve native types and documentation rename ranges', t => {
	const code = 'class Example { /** @argument {boolean} [flag=false] */ constructor(public flag: string = "") { inspect(flag); } }';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [undefined]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code, true)[0]), 'flag');
});

test('constructor parameter property documentation stays exact and ambiguous duplicates stay unknown', t => {
	for (const tags of ['@param {boolean} other', '@param {boolean} flag.ready', '@param {boolean} flag\n * @arg {string} flag']) {
		const code = `class Example { /** ${tags} */ constructor(public flag) { inspect(flag); } }`;
		t.assert.deepStrictEqual(getAnnotations(code, false, true), [undefined], tags);
		t.assert.deepStrictEqual(getParameterRanges(code, true), [undefined], tags);
	}
});

test('async and generator functions retain parameter documentation independently of callable return inference', t => {
	for (const code of [
		'/** @param {boolean} flag */ async function run(flag) { inspect(flag); }',
		'/** @param {boolean} flag */ async function* run(flag) { inspect(flag); }',
		'const task = { /** @param {boolean} flag */ async [key](flag) { inspect(flag); } };',
		'class Task { /** @param {boolean} flag */ static async run(flag) { inspect(flag); } }',
		'class Task { /** @param {boolean} flag */ *#run(flag) { inspect(flag); } }',
		'class Task { /** @param {boolean} flag */ run = async flag => { inspect(flag); }; }',
	]) {
		t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}], code);
		const start = code.indexOf('flag');
		t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]], code);
	}
});

test('multiline parameter tags preserve exact names across separated type and default tokens', t => {
	const code = '/**\r\n * @param\r\n * {boolean}\r\n * [flag\r\n * = false]\r\n * Keep flag in this description.\r\n */\r\nfunction run(flag = source) { inspect(flag); }';
	const start = code.indexOf('flag');
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]]);
});

test('native optional parameters retain their optionality with a required JSDoc tag', t => {
	for (const declaration of [
		'function run(flag?) { inspect(flag); }',
		'function run(/** @type {boolean} */ flag?) { inspect(flag); }',
		'constructor(public flag?) { inspect(flag); }',
	]) {
		const documented = `/** @param {boolean} flag */ ${declaration}`;
		const code = declaration.startsWith('constructor') ? `class Task { ${documented} }` : documented;
		const start = code.indexOf('flag');
		t.assert.deepStrictEqual(getAnnotations(code, false, true), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}], declaration);
		t.assert.deepStrictEqual(getParameterRanges(code, true), [[start, start + 4]], declaration);
	}

	const code = '/** @param {boolean} flag */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code, false, true), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
});

test('duplicate tags affect only the matching parameter while sibling and return tags remain usable', t => {
	const code = '/** @param {boolean} first\n * @argument {string} first\n * @param {number} second\n * @returns {string} */ function run(first, second) { inspect(first); inspect(second); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined, {type: {kind: 'name', name: 'number'}, optional: false, name: 'second'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
	const start = code.indexOf('second');
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined, [start, start + 6]]);
});

test('ambiguous return aliases do not erase an independently documented parameter', t => {
	const code = '/** @param {boolean} [flag=false]\n * @return {string}\n * @returns {number} */ function run(flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('an unclosed optional name does not consume the next parameter or return tag', t => {
	const code = '/** @param {boolean} [first=false\n * @param {string} second\n * @returns {number} */ function run(first, second) { inspect(first); inspect(second); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined, {type: {kind: 'name', name: 'string'}, optional: false, name: 'second'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'number');
	const start = code.indexOf('second');
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined, [start, start + 6]]);
});

test('an unclosed parameter type cannot hide valid following tags', t => {
	const code = '/** @param {Array<boolean first\n * @argument {number} second\n * @return {boolean} */ function run(first, second) { inspect(first); inspect(second); }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined, {type: {kind: 'name', name: 'number'}, optional: false, name: 'second'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'boolean');
	t.assert.deepStrictEqual(getParameterRanges(code).map(range => range && code.slice(...range)), [undefined, 'second']);
});

test('an inline unknown type overrides named certainty without losing its optional name range', t => {
	const code = '/** @param {boolean} [flag=false] */ function run(/** @type {unknown} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'unknown'}, optional: true, name: 'flag'}]);
	const start = code.indexOf('[flag') + 1;
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]]);
});

test('an inline type remains usable when named parameter aliases are ambiguous', t => {
	const code = '/** @param {string} flag\n * @arg {number} flag */ function run(/** @type {boolean} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: undefined}]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('ambiguous inline type tags leave independent named documentation authoritative', t => {
	const code = '/** @param {string} [flag] */ function run(/** @type {boolean}\n * @type {number} */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'string'}, optional: true, name: 'flag'}]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('a description-only initializer comment prevents borrowing declaration annotations', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ const run = /** Implementation details. */ flag => { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('a nearest description-only declaration comment blocks an older binding type', t => {
	const code = '/** @type {boolean} */\n/** This binding is intentionally undocumented. */ let flag; inspect(flag);';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
});

test('parameter ranges skip identical names in a shebang and leading description', t => {
	const code = '#!/usr/bin/env node\n/** flag 😀\n * @param {boolean} [flag=false] flag.\n */ function run(flag) { inspect(flag); }';
	const start = code.indexOf('[flag') + 1;
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]]);
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
});

test('default parameter expressions resolve earlier documented bindings', t => {
	const code = '/** @param {boolean} first\n * @param {string} second */ function run(first, second = inspect(first)) { inspect(second); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'string']);
	t.assert.deepStrictEqual(getParameterRanges(code).map(range => code.slice(...range)), ['first', 'second']);
});

test('a callback default captures its outer documented parameter without inheriting return tags', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ function run(flag, read = () => inspect(flag)) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', 'boolean']);
	t.assert.deepStrictEqual(getAnnotations(code, true).map(annotation => annotation?.type.name), ['string', undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code).map(range => range && code.slice(...range)), ['flag', undefined]);
});

test('catch bindings shadow an outer documented parameter without borrowing its annotation', t => {
	const code = '/** @param {boolean} flag */ function run(flag) { try { inspect(flag); } catch (flag) { inspect(flag); } inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code).map(annotation => annotation?.type.name), ['boolean', undefined, 'boolean']);
});

test('named function expression parameters keep their documentation when the function has the same name', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ const run = function flag(flag) { inspect(flag); };';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('class-level function-like tags do not annotate a constructor parameter', t => {
	const code = '/** @param {boolean} flag\n * @returns {string} */ export default class Task { constructor(flag) { inspect(flag); } }';
	t.assert.deepStrictEqual(getAnnotations(code), [undefined]);
	t.assert.deepStrictEqual(getAnnotations(code, true), [undefined]);
	t.assert.deepStrictEqual(getParameterRanges(code), [undefined]);
});

test('a default-exported class method owns documentation independently from its class', t => {
	const code = '/** @param {number} flag\n * @returns {number} */ export default class Task { /** @param {boolean} [flag=false]\n * @returns {string} */ run(flag) { inspect(flag); } }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'string');
	const start = code.indexOf('[flag') + 1;
	t.assert.deepStrictEqual(getParameterRanges(code), [[start, start + 4]]);
});

test('default-exported async generators retain raw parameter and return documentation', t => {
	const code = '/** @argument {boolean} [flag=false]\n * @return {number} */ export default async function* run(flag) { inspect(flag); yield source; }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'boolean'}, optional: true, name: 'flag'}]);
	t.assert.strictEqual(getAnnotations(code, true)[0]?.type.name, 'number');
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

/**
Collect annotations directly from property owners instead of resolving an identifier reference.
*/
function getPropertyTypes(code, typescript = false) {
	const types = [];
	const messages = linter.verify(code, {
		languageOptions: typescript ? {parser: parsers.typescript.implementation} : {},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Property, PropertyDefinition, AccessorProperty'(node) {
								types.push(getJSDocumentTypeAnnotation(node, context)?.type);
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

	return types;
}

for (const [name, code, expected, typescript = false] of [
	['shorthand properties', 'const object = {/** @type {boolean} */ value};', ['boolean']],
	['quoted property keys', 'const object = {/** @type {string} */ "value-key": source};', ['string']],
	['numeric property keys', 'const object = {/** @type {number} */ 0: source};', ['number']],
	['computed property keys', 'const object = {/** @type {boolean} */ [readKey()]: source};', ['boolean']],
	['private fields', 'class Task {/** @type {boolean} */ #value = source;}', ['boolean']],
	['computed static fields', 'class Task {/** @type {string} */ static [readKey()] = source;}', ['string']],
	['auto-accessors', 'class Task {/** @type {boolean} */ accessor value = source;}', ['boolean'], true],
	['decorated fields', 'class Task {/** @type {string} */ @decorate value = source;}', ['string'], true],
	['satisfies field initializers', 'class Task {/** @type {boolean} */ value = source satisfies string;}', ['boolean'], true],
	['non-null field initializers', 'class Task {/** @type {boolean} */ value = source!;}', ['boolean'], true],
	['satisfies property initializers', 'const object = {/** @type {boolean} */ value: source satisfies string};', ['boolean'], true],
	['native field types', 'class Task {/** @type {boolean} */ value: string = source;}', [undefined], true],
	['native optional field types', 'class Task {/** @type {boolean} */ value?: string;}', [undefined], true],
	['native accessor types', 'class Task {/** @type {boolean} */ accessor value: string = source;}', [undefined], true],
	['asserted property initializers', 'const object = {/** @type {boolean} */ value: source as string};', [undefined], true],
	['asserted field initializers', 'class Task {/** @type {boolean} */ value = source as string;}', [undefined], true],
	['asserted accessor initializers', 'class Task {/** @type {boolean} */ accessor value = source as string;}', [undefined], true],
	['assertions within non-null wrappers', 'class Task {/** @type {boolean} */ value = (source as string)!;}', [undefined], true],
	['assertions within satisfies wrappers', 'const object = {/** @type {boolean} */ value: (source as string) satisfies string};', [undefined], true],
	['angle assertions on fields', 'class Task {/** @type {boolean} */ value = <string>source;}', [undefined], true],
	['independently documented siblings', 'const object = {/** @type {boolean} */ first: source, second: source, /** @type {string} */ third: source};', ['boolean', undefined, 'string']],
	['an object declaration type', '/** @type {boolean} */ const object = {value: source};', [undefined]],
	['a class declaration type', '/** @type {boolean} */ class Task {value = source;}', [undefined]],
	['a preceding method type', 'class Task {/** @type {boolean} */ read() {} value = source;}', [undefined]],
	['an ordinary intervening comment', 'const object = {/** @type {boolean} */ /* Keep. */ value: source};', [undefined]],
	['a closer description-only comment', 'class Task {/** @type {boolean} */ /** Details. */ value = source;}', [undefined]],
	['an initializer-only comment', 'const object = {value: /** @type {boolean} */ source};', [undefined]],
	['a return-only property comment', 'const object = {/** @returns {boolean} */ value: source};', [undefined]],
	['duplicate field type tags', 'class Task {/** @type {boolean}\n * @type {string} */ value = source;}', [undefined]],
	['declaration-only accessor documentation', 'class Task {/** @typedef {boolean} Flag\n * @type {boolean} */ accessor value = source;}', [undefined], true],
]) {
	test(`direct property annotation: ${name}`, t => {
		t.assert.deepStrictEqual(getPropertyTypes(code, typescript), expected.map(name => name === undefined ? undefined : {kind: 'name', name}));
	});
}

test('direct property annotations preserve unsupported types as unknown without borrowing an initializer type', t => {
	const code = 'const object = {/** @type {keyof Value} */ value: true};';
	t.assert.deepStrictEqual(getPropertyTypes(code), [{kind: 'unknown'}]);
});

test('nested property owners retain separate annotation types', t => {
	const code = 'const object = {/** @type {Object} */ outer: {/** @type {boolean} */ inner: source}, sibling: source};';
	t.assert.deepStrictEqual(getPropertyTypes(code), [{kind: 'name', name: 'Object'}, {kind: 'name', name: 'boolean'}, undefined]);
});

for (const [name, tag, expected, expectedName] of [
	['case-normalized tag spelling', '@PaRaM {boolean} flag', 'boolean', 'flag'],
	['bang-suffixed parameter tag', '@param! {boolean} flag', 'boolean', 'flag'],
	['prototype-like parameter name', '@argument {boolean} __proto__', 'boolean', '__proto__'],
	['case-sensitive parameter name', '@param {boolean} Flag', undefined, undefined],
	['a required name with an equals suffix', '@param {boolean} flag=false', undefined, undefined],
	['a required name with a bracket suffix', '@param {boolean} flag[0]', undefined, undefined],
]) {
	test(`parameter tag token: ${name}`, t => {
		const parameter = expectedName ?? 'flag';
		const code = `/** ${tag} */ function run(${parameter}) { inspect(${parameter}); }`;
		t.assert.deepStrictEqual(getAnnotations(code), [expected === undefined
			? undefined
			: {
				type: {kind: 'name', name: expected}, optional: false, name: expectedName,
			}]);
		t.assert.deepStrictEqual(getParameterRanges(code).map(range => range && code.slice(...range)), [expectedName]);
	});
}

test('an inline type tag without braces falls back to named parameter documentation', t => {
	const code = '/** @param {string} [flag] */ function run(/** @type boolean */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'string'}, optional: true, name: 'flag'}]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});

test('an inline unclosed type does not consume the independent named parameter annotation', t => {
	const code = '/** @param {number} flag */ function run(/** @type {boolean */ flag) { inspect(flag); }';
	t.assert.deepStrictEqual(getAnnotations(code), [{type: {kind: 'name', name: 'number'}, optional: false, name: 'flag'}]);
	t.assert.strictEqual(code.slice(...getParameterRanges(code)[0]), 'flag');
});
