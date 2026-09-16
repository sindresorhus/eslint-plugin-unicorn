import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'array.fill(0)',
		'array.fill("x")',
		'array.fill(false)',
		'array.fill(null)',
		'array.fill(undefined)',
		'array.fill(10n)',
		'array.fill(Symbol("x"))',
		'array.fill(Symbol.for("x"))',
		'array.fill(Symbol.iterator)',
		'array.fill(`x`)',
		'array.fill(() => {})',
		'array.fill(function () {})',
		'array.fill(/x/)',
		'array.fill(new RegExp("x"))',
		'const value = new RegExp("x"); array.fill(value)',
		'let value = {}; value = 1; array.fill(value)',
		'var value = {}; array.fill(value)',
		'const value = {}; const alias = value; array.fill(alias)',
		'array.fill(object.value)',
		'array.fill(this.value)',
		'array?.fill({})',
		'array.fill?.({})',
		'array[fill]({})',
		'Array.from({length: 3}, () => value)',
		'Array.from({length: 3}).map(() => value)',
		'const {value = {}} = object; array.fill(value)',
		'function foo(value = {}) { array.fill(value); }',
	],
	invalid: [
		'new Array(3).fill({})',
		'Array(3).fill([])',
		'Array.from({length: 3}).fill(new Map())',
		'[1, 2, 3].fill(new Set())',
		'const value = {}; array.fill(value)',
		'const value = []; array.fill(value)',
		'const value = new Map(); array.fill(value)',
		'const value = new class {}; array.fill(value)',
		'const RegExp = class {}; array.fill(new RegExp())',
		'array.fill(class {})',
		outdent`
			const value = {};
			array.fill(value, 1);
		`,
	],
});

test.typescript({
	valid: [
		...[
			'declare function restore(): Template;',
			'function restore(): Template { return template; }',
			'const restore = (): Template => template;',
			'const restore = function (): Template { return template; };',
			'const restore = (((): Template => template) satisfies (() => Template));',
			'const restore = (((): Template => template)!);',
		].map(declaration => `interface Template { fill(value: object): void; } ${declaration} restore().fill({});`),
		'declare function restore(): Uint8Array; restore().fill({});',
		'declare function restore(): {fill(value: object): void}; restore().fill({});',
		...[
			'function restore(): Result { type Result = object[]; return template; }',
			'const restore = (): Result => { type Result = object[]; return template; };',
			'const restore = function (): Result { type Result = object[]; return template; };',
		].map(declaration => `type Result = {fill(value: object): void}; ${declaration} restore().fill({});`),
		outdent`
			interface Template { fill(value: object): void; }
			declare function restore(): Template;
			function inner() {
				type Template = object[];
				restore().fill({});
			}
		`,
	],
	invalid: [
		...[
			'declare function restore(): object[];',
			'declare function restore(): [object, object];',
			'declare function restore(): object[] | {fill(value: object): void};',
			'declare function restore(): any;',
			'declare function restore(): unknown;',
			'function restore() { return template; }',
			'import {restore} from "template";',
			'import type {Template} from "template"; declare function restore(): Template;',
			'interface Template {fill(value: object): void} const restore: () => Template = () => template;',
			'let restore = (): {fill(value: object): void} => template;',
			'declare function original(): {fill(value: object): void}; const restore = original;',
			'declare function restore(value: string): {fill(value: object): void}; declare function restore(): object[];',
			'function restore(): {fill(value: object): void} { return template; } restore = other;',
			'const restore = (): object[] => [];',
			'const restore = function (): object[] { return []; };',
			'type Result = object[]; function restore(): Result { type Result = {fill(value: object): void}; return []; }',
			'type Result = object[]; const restore = (): Result => { type Result = {fill(value: object): void}; return []; };',
			'type Result = object[]; const restore = function (): Result { type Result = {fill(value: object): void}; return []; };',
		].map(declaration => ({
			code: `${declaration} restore().fill({});`,
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		})),
		{
			code: outdent`
				type Template = object[];
				declare function restore(): Template;
				function inner() {
					interface Template { fill(value: object): void; }
					restore().fill({});
				}
			`,
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		},
		{
			code: 'interface Fillable {fill(value: object): unknown;} function identity<T extends Fillable>(value: T): T {return value;} identity([{}]).fill({});',
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		},
		{
			code: 'interface Items extends Array<object> {} declare function restore(): Items; restore().fill({});',
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		},
		{
			code: 'declare function restore(): object[]; const restored = restore(); restored.fill({});',
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		},
		{
			code: 'interface Template {fill(value: object): void} const restore = (((): Template => template) as unknown as (() => object[])); restore().fill({});',
			errors: [{messageId: 'no-array-fill-with-reference-type'}],
		},
	],
});

test.snapshot({
	valid: [
		typeAware(outdent`
			interface CustomTemplate { fill(values: Record<string, string>): unknown; }
			declare function restoreTemplate(): CustomTemplate;
			const restored = restoreTemplate();
			const values = {title: 'World'};
			restored.fill(values);
		`),
		typeAware('function restore() { return {fill(value: object) {}}; } const restored = restore(); restored.fill({});'),
		typeAware('interface Template {fill(value: object): void} const restore = (((): object[] => []) as unknown as (() => Template)); restore().fill({});'),
	],
	invalid: [
		typeAware('declare function restore(): object[]; const restored = restore(); const value = {}; restored.fill(value);'),
		typeAware('function restore() { return [{}]; } const restored = restore(); restored.fill({});'),
		typeAware('interface Fillable {fill(value: object): unknown;} function identity<T extends Fillable>(value: T): T {return value;} identity([{}]).fill({});'),
		typeAware('interface Template {fill(value: object): void} const restore = (((): Template => template) as unknown as (() => object[])); restore().fill({});'),
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.fill(/x/ as RegExp)',
		'array.fill((() => {}) as Function)',
		'array.fill(object.value as Foo)',
		'const value = {}; const alias = value as Foo; array.fill(alias)',
		// `TypedArray#fill()` coerces the value to a number, so no slot can share the reference
		'function f(foo: Uint8Array) { foo.fill({}); }',
		'const foo = new Uint8Array(3); foo.fill({});',
		// Other known non-array receivers have no `Array#fill()` semantics either
		outdent`
			interface CustomTemplate {
				fill(values: Record<string, string>): unknown;
			}

			declare function restoreTemplate(): CustomTemplate;

			const restored = restoreTemplate();
			const values = {title: 'World'};

			restored.fill(values);
		`,
		'function f(foo: Set<object>) { foo.fill({}); }',
		'function draw(context: CanvasRenderingContext2D) { const path = new Path2D(); context.fill(path); }',
		'function draw(context: OffscreenCanvasRenderingContext2D) { const path = new Path2D(); context.fill(path); }',
	],
	invalid: [
		'array.fill({} as Foo)',
		'array.fill(<Foo>{})',
		'array.fill({} satisfies Foo)',
		'array.fill({}!)',
		'const value = {} as Foo; array.fill(value)',
		'const value = {}; array.fill(value!)',
		// A receiver known to be an array must still be reported
		'function f(foo: object[]) { foo.fill({}); }',
		// An unknown receiver is still reported
		'function f(foo) { foo.fill({}); }',
	],
});
