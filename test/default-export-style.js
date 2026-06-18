import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const separateFunctionOptions = [{functions: 'separate'}];
const ignoreFunctionOptions = [{functions: 'ignore'}];
const separateClassOptions = [{classes: 'separate'}];
const ignoreClassOptions = [{classes: 'ignore'}];

test.snapshot({
	valid: [
		'export default function foo() {}',
		'export default async function foo() {}',
		'export default class Foo {}',
		outdent`
			/** Leading comment */
			export default function foo() {}
		`,
		{
			code: outdent`
				const foo = () => {};
				export default foo;
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function foo() {}
				const bar = () => {};
			`,
			options: ignoreFunctionOptions,
		},
		{
			code: outdent`
				const foo = () => {};
				export default foo;
			`,
			options: ignoreFunctionOptions,
		},
		{
			code: outdent`
				function foo() {}
				export default foo;
			`,
			options: ignoreFunctionOptions,
		},
		{
			code: outdent`
				class Foo {}
				export default Foo;
			`,
			options: separateClassOptions,
		},
		{
			code: 'export default class Foo {}',
			options: ignoreClassOptions,
		},
		{
			code: outdent`
				class Foo {}
				export default Foo;
			`,
			options: ignoreClassOptions,
		},

		// Ignored unsupported cases
		'export function foo() {}',
		'export class Foo {}',
		'const foo = () => {}; export {foo};',
		'export default function () {}',
		'export default class {}',
		'export default () => {}',
		'const foo = 1; export {foo as default};',
		'export {foo as default} from "foo";',
		'module.exports = foo;',
		'exports.default = foo;',
		'export default foo;',
		'const foo = 1; export default foo;',
		'const foo = {}; export default foo;',
		'const foo = []; export default foo;',
		'const foo = function () {}; export default foo;',
		'let foo = () => {}; export default foo;',
		'const foo = () => {}, bar = () => {}; export default foo;',
		outdent`
			import foo from 'foo';
			export default foo;
		`,
		outdent`
			function foo() {}
			const bar = 1;
			export default foo;
		`,
		outdent`
			function foo() {}
			// Comment between declaration and export.
			export default foo;
		`,
		outdent`
			function foo() {}
			export default foo;
			foo = bar;
		`,
		outdent`
			class Foo {}
			export default Foo;
			Foo = Bar;
		`,
		{
			code: outdent`
				export default function foo(value: string): string {
					return value;
				}
			`,
			options: separateFunctionOptions,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'export default function foo(value?) {}',
			options: separateFunctionOptions,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const foo = (value: string): string => value;
				export default foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				const foo = () => value satisfies string;
				export default foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Foo implements Bar {}
				export default Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Foo {
					property: string;
				}
				export default Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				class Foo {
					method?() {}
				}
				export default Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				@sealed
				class Foo {}
				export default Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'export default abstract class Foo {}',
			options: separateClassOptions,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				export default class Foo {}
				Foo = Bar;
			`,
			options: separateClassOptions,
		},
		{
			code: outdent`
				export default function foo() {}
				foo = bar;
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				abstract class Foo {}
				export default Foo;
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				export default function * foo() {
					yield foo;
				}
			`,
			options: separateFunctionOptions,
		},
	],
	invalid: [
		outdent`
			function foo() {}
			export default foo;
		`,
		outdent`
			async function foo() {}
			export default foo;
		`,
		outdent`
			/** Leading comment */
			function foo() {}
			export default foo;
		`,
		outdent`
			class Foo {}
			export default Foo;
		`,
		outdent`
			class Foo extends Bar {}
			export default Foo;
		`,
		outdent`
			const foo = () => {};
			export default foo;
		`,
		outdent`
			const foo = value => value;
			export default foo;
		`,
		outdent`
			function foo(value) {
				return value?.bar;
			}
			export default foo;
		`,
		outdent`
			const foo = value => value?.bar;
			export default foo;
		`,
		outdent`
			function foo() {}
			export default /* comment */ foo;
		`,
		outdent`
			function foo() {}
			export default foo; // Comment.
		`,
		outdent`
			class Foo {}
			export default /* comment */ Foo;
		`,
		outdent`
			class Foo {}
			export default Foo; // Comment.
		`,
		outdent`
			const foo = /* @__PURE__ */ () => {};
			export default foo;
		`,
		outdent`
			const foo = () => {};
			export default foo; // Comment.
		`,
		outdent`
			foo();
			const foo = () => {};
			export default foo;
		`,
		outdent`
			const foo = () => this.foo;
			export default foo;
		`,
		outdent`
			const foo = () => arguments;
			export default foo;
		`,
		outdent`
			const foo = () => {
				// Comment.
			};
			export default foo;
		`,
		{
			code: 'export default function foo() {}',
			options: separateFunctionOptions,
		},
		{
			code: 'export default /* comment */ function foo() {}',
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				foo();
				export default function foo() {}
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function Foo() {}
				new Foo();
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function Foo() {}
				Foo.prototype.method = function () {};
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function Foo() {}
				Foo['prototype'].method = function () {};
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function foo() {
					return this.foo;
				}
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function foo() {
					return arguments;
				}
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function foo() {
					return new.target;
				}
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				export default function foo() {
					// Comment.
				}
			`,
			options: separateFunctionOptions,
		},
		{
			code: outdent`
				function foo() {}
				export default foo;
			`,
			options: separateFunctionOptions,
		},
		outdent`
			const Foo = () => {};
			export default Foo;
			new Foo();
		`,
		{
			code: 'export default class Foo {}',
			options: separateClassOptions,
		},
	],
});
