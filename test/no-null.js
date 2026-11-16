import {fileURLToPath} from 'node:url';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const optionsIgnoreArguments = [{checkArguments: false}];

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			tsconfigRootDir: fileURLToPath(new URL('fixtures/no-null/', import.meta.url)),
			projectService: {allowDefaultProject: ['*.ts', '*.js'], defaultProject: 'tsconfig.json'},
		},
	},
});

test({
	valid: [
		'document.body.onclick = null;',
		'document.createAttribute("x").textContent = null;',
		'document.createElement("video").srcObject = null;',
		'document.createElement("video")["srcObject"] = null;',
		'const video = document.createElement("video"); const property = "srcObject"; video[property] = null;',
		'const video = document.createElement("video"); video.srcObject = (/* clear */ null);',
		'document.body.onclick = () => {}; document.body.onclick = null;',
		'declare const video: HTMLVideoElement; video.srcObject = null!;',
		'import {defaultTreeAdapter} from "parse5"; const node = defaultTreeAdapter.createTextNode("text"); node.parentNode = null;',
	].map(code => typeAware(code)),
	invalid: [
		'import type {Nullable} from "./index.js"; declare const video: {srcObject: Nullable}; video.srcObject = null;',
		'import type {Nullable} from "./index.js"; declare const element: {onclick: Nullable}; element.onclick = null;',
		'import {Receiver} from "./index.js"; const receiver = new Receiver("value"); receiver.value = null;',
		'import {defaultTreeAdapter} from "parse5"; const node = defaultTreeAdapter.createTextNode("text"); node.sourceCodeLocation = null;',
		'document.createElement("video").currentTime = null;',
		'document.body.onclick ??= null;',
	].map(code => ({
		...typeAware(code),
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
	})),
});

const localPropertyAugmentation = 'export {}; declare global { interface HTMLMediaElement { srcObject: MediaProvider | null; } } document.createElement("video").srcObject = null;';

test({
	valid: [],
	invalid: [{
		...typeAware(localPropertyAugmentation),
		errors: [
			{messageId: 'error', suggestions: [{messageId: 'replace', output: localPropertyAugmentation.replace('null', 'undefined')}]},
			{messageId: 'error', suggestions: [{messageId: 'replace', output: localPropertyAugmentation.replace('= null;', '= undefined;')}]},
		],
	}],
});

test({
	valid: [],
	invalid: [{
		...typeAware('document.body.onclick = null;'),
		filename: 'file.js',
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'document.body.onclick = undefined;'}]}],
	}],
});

test.typescript({
	valid: [],
	invalid: [
		'document.body.onclick = null;',
		'document.createElement("video").srcObject = null;',
	].map(code => ({
		code,
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
	})),
});

test({
	valid: [
		'document.implementation.createDocument(null, "root");',
		'document.lookupPrefix(null);',
		'import {defaultTreeAdapter} from "parse5"; defaultTreeAdapter.setNodeSourceCodeLocation(defaultTreeAdapter.createDocument(), null);',
		'import {defaultTreeAdapter} from "parse5"; const setLocation = defaultTreeAdapter.setNodeSourceCodeLocation; setLocation(defaultTreeAdapter.createDocument(), null);',
	].map(code => typeAware(code)),
	invalid: [
		'document.createTreeWalker(document, 0, null);',
		'new Response(null);',
		'import {acceptNull as consume} from "./index.js"; consume(null);',
		'import {Receiver} from "./index.js"; const receiver = new Receiver("value"); receiver.set(null);',
		'import {Receiver} from "./index.js"; new Receiver(null);',
		'import type {Nullable} from "./index.js"; declare const consume: (value: Nullable) => void; consume?.(null);',
		'import type {Nullable} from "./index.js"; const consume = (value: Nullable) => {}; const alias = consume; alias(null);',
		'import type {Nullable} from "./index.js"; declare function consume(...values: Nullable[]): void; consume("value", null);',
		'declare function consume(value: ReturnType<Document["getElementById"]>): void; consume(null);',
		'import type {Nullable} from "./index.js"; declare const gl: {useProgram(value: Nullable): void}; gl.useProgram(null);',
		'import type {Nullable} from "./index.js"; declare const gl: {useProgram(value: Nullable): void; useProgram(value: string): void}; gl.useProgram(null);',
		'import {acceptEither} from "./index.js"; acceptEither(null);',
		'import {acceptOptional} from "./index.js"; acceptOptional(null);',
		'import {identity} from "./index.js"; identity(null);',
		'import type {Nullable} from "./index.js"; declare const gl: {bindBuffer(target: number, value: Nullable | undefined): void}; gl.bindBuffer(1, null);',
		'declare const sender: {replaceTrack(value: unknown): void}; sender.replaceTrack(null);',
		'declare const gl: {useProgram(value: any): void}; gl.useProgram(null);',
		'declare const gl: {useProgram(value: number): void}; gl.useProgram(null);',
		'import type {Nullable} from "./index.js"; declare function consume(value: Nullable): void; declare function consume(value: undefined): void; consume(null);',
		'import type {Nullable} from "./index.js"; declare function consume(prefix: string, value: Nullable): void; consume(...prefix, null);',
	].map(code => ({
		...typeAware(code),
		errors: [{messageId: 'error', column: code.indexOf('null') + 1, suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
	})),
});

// Local parameter types and their `null` arguments are both reported.
test.typescript({
	valid: [],
	invalid: [
		'function consume(value: string | null) {} consume(null);',
		'const consume = (value: string | null) => {}; consume(null);',
		'declare function consume(value: string | null): void; consume(null);',
		'declare const consume: (value: string | null) => void; consume(null);',
		'const consume: (value: string | null) => void = value => {}; consume(null);',
		'function invoke(consume: (value: string | null) => void) { consume(null); }',
		'((value: string | null) => {})(null);',
		'type Nullable = string | null; function consume(value: Nullable) {} consume(null);',
		'function consume(this: object, value: string | null) {} consume(null);',
	].map(code => ({
		code,
		errors: [
			{messageId: 'error', column: code.indexOf('null') + 1, suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]},
			{messageId: 'error', column: code.lastIndexOf('null') + 1, suggestions: 1},
		],
	})),
});

test.typescript({
	valid: [],
	invalid: [
		'function consume(value?: string | null) {} consume(null);',
		'function consume(value: string | null = "value") {} consume(null);',
		'function consume(value: string | null | undefined) {} consume(null);',
		'type Nullable = string | null | undefined; function consume(value: Nullable) {} consume(null);',
		'function consume<Value>(value: Value) {} consume(null);',
		'function consume(value: unknown) {} consume(null);',
		'const consume: any = (value: string | null) => {}; consume(null);',
		'const consume = ((value: string | null) => {}) as (value: unknown) => void; consume(null);',
		'(((value: string | null) => {}) as (value: unknown) => void)(null);',
	].map(code => ({
		code,
		errors: [
			...(code.includes('| null') ? [{messageId: 'error', column: code.indexOf('null') + 1, suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}] : []),
			{messageId: 'error', column: code.lastIndexOf('null') + 1, suggestions: [{messageId: 'replace', output: code.replace(/null(?=\);$)/v, 'undefined')}]},
		],
	})),
});

test({
	valid: [],
	invalid: [{
		...typeAware('import {acceptNull} from "./index.js"; acceptNull(null);'),
		filename: 'file.js',
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'import {acceptNull} from "./index.js"; acceptNull(undefined);'}]}],
	}],
});

const typeScriptNullArgumentCases = [
	'document.createElementNS(null, "element");',
	'document.createElementNS(null, "element", options);',
	'document.createAttributeNS(null, "attribute");',
	'element.getAttributeNS(null, "attribute");',
	'element.getAttributeNodeNS(null, "attribute");',
	'element.setAttributeNS(null, "attribute", "value");',
	'element.removeAttributeNS(null, "attribute");',
	'element.hasAttributeNS(null, "attribute");',
	'document.getElementsByTagNameNS(null, "element");',
	'element.lookupNamespaceURI(null);',
	'gl.bindBuffer(gl.ARRAY_BUFFER, null);',
	'gl.bindFramebuffer(gl.FRAMEBUFFER, null);',
	'gl.bindRenderbuffer(gl.RENDERBUFFER, null);',
	'gl.bindTexture(gl.TEXTURE_2D, null);',
	'gl.useProgram(null);',
	'gl.bindVertexArray(null);',
	'sender.replaceTrack(null);',
	'element?.getAttributeNS(null, "attribute");',
	'gl.bindBuffer?.(gl.ARRAY_BUFFER, null);',
	'sender?.replaceTrack?.(null);',
];

test({
	valid: [],
	invalid: [
		'crypto.createCipheriv(algorithm, key, null);',
		...typeScriptNullArgumentCases,
		'JSON.stringify(value, null, 2);',
		'array.push(null);',
		'array.unshift(null);',
	].map(code => ({
		code,
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
	})),
});

test.typescript({
	valid: [
		...typeScriptNullArgumentCases,
		...['file.ts', 'file.tsx', 'file.mts', 'file.cts'].map(filename => ({
			code: 'document.createElementNS(null, "element");',
			filename,
		})),
	],
	invalid: [
		'crypto.createCipheriv(algorithm, key, null);',
		...['file.js', 'file.jsx', 'file.mjs', 'file.cjs'].map(filename => ({
			code: 'document.createElementNS(null, "element");',
			filename,
		})),
		'createElementNS(null, "element");',
		'document.createElementNS(namespace, null);',
		'element.setAttributeNS(namespace, "attribute", null);',
		'element.getAttributeNS(null);',
		'element.getAttributeNS(null, "attribute", extra);',
		'element.getAttributeNS(null, ...names);',
		'element["getAttributeNS"](null, "attribute");',
		'gl.bindBuffer(null, buffer);',
		'gl.bindBuffer(null);',
		'gl.bindBuffer(target, null, extra);',
		'gl.useProgram(null, extra);',
		'sender.replaceTrack(null, extra);',
		'sender.replaceTrack({track: null});',
		'object.customMethodNS(null, "name");',
		'document.createTreeWalker(root, whatToShow, null);',
		'connection.addIceCandidate(null);',
	].map(testCase => {
		const {code} = typeof testCase === 'string' ? {code: testCase} : testCase;
		return {
			...(typeof testCase === 'string' ? {code} : testCase),
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
		};
	}),
});

test({
	valid: [],
	invalid: [
		'delete null;',
		'delete ((null));',
		'delete (/* keep */ null);',
		...[
			'delete (null as unknown);',
			'delete (null satisfies unknown);',
			'delete (<unknown>null);',
			'delete null!;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	].map(testCase => ({
		...(typeof testCase === 'string' ? {code: testCase} : testCase),
		errors: [{messageId: 'error', suggestions: 0}],
	})),
});

test({
	valid: [],
	invalid: [{
		code: 'delete [null][0];',
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'delete [undefined][0];'}]}],
	}],
});

test.snapshot({
	valid: [
		'let foo',
		'Object.create(null)',
		'Object.create(null, {foo: {value:1}})',
		'let insertedNode = parentNode.insertBefore(newNode, null)',
		'let insertedNode = parentNode?.insertBefore(newNode, null)',
		// Not `null`
		'const foo = "null";',
		// More/Less arguments
		'Object.create()',
		// Not `null`
		'Object.create(bar)',
		'Object.create("null")',

		// `React.useRef(null)`
		'useRef(null)',
		'React.useRef(null)',

		// `Object.setPrototypeOf(foo, null)`
		'Object.setPrototypeOf(foo, null)',
		'Reflect.setPrototypeOf(foo, null)',

		// Ignored
		'if (foo === null) {}',
		'if (null === foo) {}',
		'if (foo !== null) {}',
		'if (null !== foo) {}',
		// `checkStrictEquality: false`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}',
		].map(code => ({
			code,
			options: [{checkStrictEquality: false}],
		})),
		// `checkArguments: false`
		...[
			'foo(null)',
			'foo(bar, null)',
			'drawingManager.setMap(null)',
			'markers[index].setMap(null)',
			'object?.method?.(null)',
			'foo?.(null)',
			'new HttpResponse(null)',
			'new HttpResponse(body, null)',
		].map(code => ({
			code,
			options: optionsIgnoreArguments,
		})),
		// #1146
		{
			code: 'foo = Object.create(null)',
			languageOptions: {ecmaVersion: 2019},
		},
	],
	invalid: [
		'const foo = null',
		'foo(null)',

		// Auto fix
		'if (foo == null) {}',
		'if (foo != null) {}',
		'if (null == foo) {}',
		'if (null != foo) {}',

		// Suggestion `ReturnStatement`
		outdent`
			function foo() {
				return null;
			}
		`,

		// Suggestion `VariableDeclaration`
		'let foo = null;',
		'var foo = null;',
		'var foo = 1, bar = null, baz = 2;',
		'const foo = null;',
		{
			code: 'const foo = null;',
			options: optionsIgnoreArguments,
		},
		{
			code: outdent`
				function foo() {
					return null;
				}
			`,
			options: optionsIgnoreArguments,
		},
		{
			code: 'if (foo === null) {}',
			options: [{checkArguments: false, checkStrictEquality: true}],
		},
		...[
			'foo([null])',
			'foo(bar ?? null)',
			'foo(...[null])',
			'new HttpResponse([null])',
		].map(code => ({
			code,
			options: optionsIgnoreArguments,
		})),

		// `checkStrictEquality`
		...[
			'if (foo === null) {}',
			'if (null === foo) {}',
			'if (foo !== null) {}',
			'if (null !== foo) {}',
		].map(code => ({
			code,
			options: [{checkStrictEquality: true}],
		})),

		// Not `CallExpression`
		'new Object.create(null)',
		'new foo.insertBefore(bar, null)',
		// Not `MemberExpression`
		'create(null)',
		'insertBefore(bar, null)',
		// `callee.property` is not a `Identifier`
		'Object["create"](null)',
		'foo["insertBefore"](bar, null)',
		// Computed
		'Object[create](null)',
		'foo[insertBefore](bar, null)',
		'Object[null](null)',
		// Not matching method
		'Object.notCreate(null)',
		'foo.notInsertBefore(foo, null)',
		// Not `Object`
		'NotObject.create(null)',
		// `callee.object.type` is not a `Identifier`
		'lib.Object.create(null)',
		// More/Less arguments
		'Object.create(...[null])',
		'Object.create(null, bar, extraArgument)',
		'foo.insertBefore(null)',
		'foo.insertBefore(foo, null, bar)',
		'foo.insertBefore(...[foo], null)',
		// Not in right position
		'foo.insertBefore(null, bar)',
		'Object.create(bar, null)',
		// Optional call
		'useRef?.(null)',
		'React.useRef?.(null)',
		'Object.setPrototypeOf?.(foo, null)',
		// `setPrototypeOf` not on `Object` or `Reflect`
		'foo.setPrototypeOf(bar, null)',
		// `setPrototypeOf` with `null` not as the second argument
		'Object.setPrototypeOf(null, foo)',
		'Object.setPrototypeOf(foo, null, bar)',
	],
});

// `using` and `await using` declarations require an initializer, so the "remove" suggestion would produce a syntax error
test.typescript({
	valid: [],
	invalid: [
		{
			code: 'using x = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'using x = undefined;'}],
			}],
		},
		{
			code: 'async function f() { await using x = null; }',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'async function f() { await using x = undefined; }'}],
			}],
		},
		{
			code: 'for (using x = null; ; ) { break; }',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'for (using x = undefined; ; ) { break; }'}],
			}],
		},
		{
			code: 'let x = null;',
			errors: [{
				messageId: 'error',
				suggestions: [
					{messageId: 'remove', output: 'let x;'},
					{messageId: 'replace', output: 'let x = undefined;'},
				],
			}],
		},
	],
});

// The "remove" suggestion deletes the text between the parameter and the `null`, so a comment in that range would be dropped
test({
	valid: [],
	invalid: [
		{
			code: 'let x /* comment */ = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x /* comment */ = undefined;'}],
			}],
		},
		{
			code: 'let x = /* comment */ null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x = /* comment */ undefined;'}],
			}],
		},
		{
			code: 'let x /* a */ = /* b */ null /* c */;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let x /* a */ = /* b */ undefined /* c */;'}],
			}],
		},
		{
			code: 'let {a} /* comment */ = null;',
			errors: [{
				messageId: 'error',
				suggestions: [{messageId: 'replace', output: 'let {a} /* comment */ = undefined;'}],
			}],
		},
	],
});

// The parentheses around the value are not part of its range, removing it must take them too
test({
	valid: [],
	invalid: [
		{
			code: 'let foo = (null);',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'let foo;'}, {messageId: 'replace', output: 'let foo = (undefined);'}]}],
		},
		{
			code: 'function f() { return (null); }',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'function f() { return; }'}, {messageId: 'replace', output: 'function f() { return (undefined); }'}]}],
		},
		// The remove suggestion deletes everything between `return` and the `null`, so a comment in that range rules it out
		{
			code: 'function f() { return (/* keep */ null); }',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'function f() { return (/* keep */ undefined); }'}]}],
		},
		{
			code: 'let foo = ((null));',
			errors: [{messageId: 'error', suggestions: [{messageId: 'remove', output: 'let foo;'}, {messageId: 'replace', output: 'let foo = ((undefined));'}]}],
		},
		// A comment inside the parentheses is still in the removed range
		{
			code: 'let foo = (/* keep */ null);',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let foo = (/* keep */ undefined);'}]}],
		},
		// A destructuring pattern requires an initializer, so `null` cannot be removed
		{
			code: 'let {a} = null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let {a} = undefined;'}]}],
		},
		{
			code: 'let [a] = null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let [a] = undefined;'}]}],
		},
	],
});

test.typescript({
	valid: [
		'useRef<HTMLDivElement | null>(null);',
		'React.useRef<HTMLDivElement | null>(null);',
		'useRef<null | HTMLDivElement>(null);',
		'useRef<HTMLDivElement | undefined | null>(null);',
		'useRef<(HTMLDivElement | null)>(null);',
		'useRef<null>(null);',
		'React.useRef<null>(null);',
		'useRef<HTMLDivElement | null>(element);',
		'React.useRef<HTMLDivElement | null>(element);',
	],
	invalid: [
		'foo<HTMLDivElement | null>(element);',
		'Other.useRef<HTMLDivElement | null>(element);',
		'React["useRef"]<HTMLDivElement | null>(element);',
		'useRef?.<HTMLDivElement | null>(element);',
		'React.useRef?.<HTMLDivElement | null>(element);',
		'React?.useRef<HTMLDivElement | null>(element);',
		'useRef<HTMLDivElement | null>();',
		'useRef<HTMLDivElement | null>(element, extra);',
		'useRef<Array<string | null>>([]);',
		'useRef<{value: string | null}>({value: "foo"});',
	].map(code => ({
		code,
		errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: code.replace('null', 'undefined')}]}],
	})),
});

// The `null` type is not autofixed, because `null` from types the user does not control (React refs, DOM APIs) cannot be replaced with `undefined`
test.typescript({
	valid: [
		'type Foo = undefined;',
		'type Foo = \'null\';',
		'type Foo = Null;',
	],
	invalid: [
		{
			code: 'type Foo = string | null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'type Foo = string | undefined;'}]}],
		},
		{
			code: 'type Foo = string | /* keep */ null;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'type Foo = string | /* keep */ undefined;'}]}],
		},
		{
			code: 'function foo(): null {}',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'function foo(): undefined {}'}]}],
		},
		{
			code: 'let foo: Array<string | null>;',
			errors: [{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let foo: Array<string | undefined>;'}]}],
		},
		// The type and the value are reported separately
		{
			code: 'let foo: string | null = null;',
			errors: [
				{messageId: 'error', suggestions: [{messageId: 'replace', output: 'let foo: string | undefined = null;'}]},
				{messageId: 'error', suggestions: [{messageId: 'remove', output: 'let foo: string | null;'}, {messageId: 'replace', output: 'let foo: string | null = undefined;'}]},
			],
		},
	],
});
