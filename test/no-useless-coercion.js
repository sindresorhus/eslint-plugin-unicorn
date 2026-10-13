import {stripTypeScriptTypes} from 'node:module';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

nodeTest('deleting a coerced value preserves the property and delete result', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};

	for (const [value, expression] of [
		['1', 'Number(object.value as number)'],
		['1', '+(object.value as number)'],
		['true', 'Boolean(object.value as boolean)'],
		['"x"', 'String(object.value as string)'],
		['1n', 'BigInt(object.value as bigint)'],
		['"x"', '(object.value as string) + ""'],
		['"x"', '"" + (object.value as string)'],
		['"x"', '(object.value as string).toString()'],
	]) {
		const code = `"use strict"; const object = {value: ${value}}; const result = delete (${expression}); JSON.stringify({result, exists: Object.hasOwn(object, "value")});`;
		const {fixed, output, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, false, code);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		const result = runInNewContext(stripTypeScriptTypes(output));
		t.assert.deepStrictEqual(JSON.parse(result), {result: true, exists: true});
	}

	const code = '"use strict"; const result = delete Number(Math.PI); result;';
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(runInNewContext(output), true);
	// Exposing the non-configurable reference would throw instead of returning true.
	t.assert.throws(() => runInNewContext('"use strict"; delete Math.PI;'), {name: 'TypeError'});
});

test({
	valid: [],
	invalid: [
		{code: 'const object = {length: 1}; delete Number(object.length);', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'const object = {length: 1}; delete +object.length;', errors: [{messageId: 'no-useless-coercion'}]},
		{code: 'delete Number(Math.PI);', errors: [{messageId: 'no-useless-coercion'}]},
		...[
			'delete (Number(object.length) as number);',
			'delete Number(object.length)!;',
			'delete (Number(object.length) satisfies number);',
			'delete (<number>Number(object.length));',
			'delete Number(object.length satisfies number);',
			'delete Number(/* keep */ object.length);',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'no-useless-coercion'}]})),
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const object = {length: 1}; const result = Number(object.length) + 1;',
			output: 'const object = {length: 1}; const result = object.length + 1;',
			errors: [{messageId: 'no-useless-coercion'}],
		},
	],
});

test.snapshot({
	valid: [
		// Genuine conversions (argument type is unknown or different)
		'Boolean(1)',
		'Boolean(x)',
		'Boolean(null)',
		'Boolean(x ? 1 : 0)',
		'String(123)',
		'String(x)',
		'String(null)',
		'String([])',
		'Number("5")',
		'Number(x)',
		'Number(null)',
		'Number(bigintValue)',
		'Number(a - b)',
		'Number(a % b)',
		'const modes = new Set(["foo"]); modes.clear(); Number(modes.size ? value : "value");',
		'const modes = new Set(["foo"]); modes.clear(); +((modes.size && value) || "value");',
		'const modes = new Set(["foo"]); modes.clear(); Boolean(modes.size ? true : value);',
		'const modes = new Set(["foo"]); modes.clear(); String(modes.size ? "x" : value);',
		'const alias = condition; var condition = true; String(alias ? "x" : value);',
		'const modes = new Set(["foo"]); modes.clear(); BigInt(modes.size ? 1n : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); Boolean(object.value ? true : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); String(object.value ? "x" : value);',
		'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); BigInt(object.value ? 1n : value);',
		'Number(x?.length)',
		'Boolean(x ?? y)',
		'Boolean(x || false)',
		'Boolean(a && b)',
		'Boolean(x === y ? a : b)',
		'BigInt(5)',
		'BigInt(x)',
		'BigInt("5")',

		// Method return types are not tracked
		'String(x.repeat(3))',
		'String(x.at(0))',

		// `+` on a bigint throws at runtime, so it is never useless
		{code: 'declare const x: bigint; +x', languageOptions: {parser: parsers.typescript}},

		// Out of scope
		'Object({a: 1})',
		'Symbol(x)',
		'Array(x)',
		'new Boolean(true)',
		'new Number(42)',
		'globalThis.Boolean(true)',

		// Operator idioms we intentionally do not flag
		'~~x', // `~~` truncates, so it is never a no-op
		'~~5',
		'!!x', // Covered by ESLint's `no-extra-boolean-cast`
		'!!true',
		'-5', // Negation is not a coercion

		// Operator idioms on values that are not already the target type
		'x + \'\'',
		'5 + \'\'',
		'\'\' + 5',
		'x.toString()',
		'(5).toString()',
		'+x',
		'+\'5\'',
		'x + \'a\'', // Non-empty string is a real concatenation
		'x.toLocaleString()',
		'x[\'toString\']()',
		'x?.toString()',
		'x.toString(2)',

		// Wrong arity / shape
		'Boolean()',
		'Number()',
		'Number(1, 2)',
		'Number(...x)',
		'Boolean?.(true)',

		// Shadowed globals
		'const Boolean = () => {}; Boolean(true)',
		'function f(String) { return String(\'x\'); }',
		'function f(Number) { return Number(42); }',
		'import {String} from \'x\'; String(\'y\')',
	],
	invalid: [
		// Literals
		'Boolean(true)',
		'Boolean(false)',
		'String(\'hello\')',
		'Number(42)',
		'Number(0)',
		'BigInt(1n)',

		// Double coercion
		'Boolean(Boolean(x))',
		'String(String(x))',
		'Number(Number(x))',
		'Number(parseInt(x, 10))',
		'Number(Number.parseFloat(x))',
		'BigInt(BigInt(x))',

		// Already-typed expressions
		'Boolean(a === b)',
		'Boolean(!x)',
		'Boolean(!!x)',
		'Boolean(a > 0 && b > 0)',
		'Boolean(true || false)',
		'Boolean(x instanceof Foo)',
		'Boolean(x in obj)',
		'Boolean(delete obj.x)',
		'Boolean(a?.b === c)',
		'Number(x.length)',
		'Number(Math.PI)',
		'Number(Number.MAX_SAFE_INTEGER)',
		'Number(NaN)',
		'Number(x >>> 0)',
		'Number(~x.length)',
		'Number(+x)',
		'Number(x * 2)',
		'Number(x % 2)',
		'Number(x > 0 ? 1 : 2)',
		'String(`${x}`)', // eslint-disable-line no-template-curly-in-string
		'String(a + \'b\')',
		'String(typeof x)',
		'String(x ? \'a\' : \'b\')',
		'BigInt(1n + 2n)',
		'BigInt(2n ** 3n)',
		'BigInt(BigInt.asIntN(64, x))',
		'BigInt(x ? 1n : 2n)',

		// Unary `+` on a value already a number
		'+5',
		'+x.length',
		'+Number(x)',
		'+(x * 2)',
		'+ +x', // Nested: the inner `+x` is always a number, so the outer `+` is useless

		// Empty-string concatenation on a value already a string
		'\'a\' + \'\'',
		'\'\' + \'a\'',
		'\'\' + \'\'', // Both operands are empty strings
		'`${x}` + \'\'', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\') + \'\'',
		'String(x) + \'\'',

		// `.toString()` on a value already a string
		'\'a\'.toString()',
		'`${x}`.toString()', // eslint-disable-line no-template-curly-in-string
		'(a + \'b\').toString()',
		'String(x).toString()',

		// Resolved variables
		'const flag = true; Boolean(flag)',
		'const name = \'unicorn\'; String(name)',
		'const text = \'x\'; text + \'\'',
		'const n = 5; +n',

		// Fix: parenthesization
		'String(a + \'b\').length',
		'Number(x * 2).toFixed(2)',
		'Boolean(x ? a > 0 : b < 0)',
		// Unary operator parent forces parentheses around a loosely-bound argument
		'!Boolean(a === b)',
		// Strong-precedence argument needs no parentheses, even in a tight position
		'-Number(x.length)',
		// Template literal binds tightly, so no parentheses before a member `.`
		'String(`foo`).length',
		// Decimal integer literal needs parentheses before a member `.`
		'Number(5).toFixed(2)',
		// Argument already parenthesized, do not double-wrap
		'Boolean((a === b))',
		'(Number(x.length))',
		// Sequence expression keeps its existing parentheses
		'Number((a, b.length))',
		// Object literal needs parentheses, otherwise `{` starts a block at statement position
		'Number({foo: 1}.length)',

		// Fix: ASI
		outdent`
			foo
			Number(+bar)
		`,

		// Fix: comment inside (reported, not fixed)
		'Number(/* keep */ x.length)',
		'+/* keep */ x.length',
		'\'a\' /* keep */ + \'\'',
		'(/* keep */ \'a\').toString()',

		// TypeScript
		{code: 'Boolean(x as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; String(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: number) => Number(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'const f = (x: bigint) => BigInt(x)', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(<number>x)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: number; Number(x!)', languageOptions: {parser: parsers.typescript}},
		{code: 'BigInt(x as bigint)', languageOptions: {parser: parsers.typescript}},
		// Cast expressions bind loosely, so they need parentheses in a tight position
		{code: 'String(x as string).length', languageOptions: {parser: parsers.typescript}},
		{code: 'Number(x satisfies number).toFixed(2)', languageOptions: {parser: parsers.typescript}},

		// TypeScript: operator idioms on typed values
		{code: 'declare const x: number; +x', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x + \'\'', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const x: string; x.toString()', languageOptions: {parser: parsers.typescript}},

		// Type information: a bigint literal type
		{
			code: 'declare const object: {value: 1n}; BigInt(object.value);',
			filename: 'file.ts',
			languageOptions: {
				parser: typescriptEslintParser,
				parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
			},
		},
	],
});

// A user object can have a `length` that is not a number
test({
	valid: [
		'const object = {length: "5"};\nconst a = Number(object.length);',
		'const object = {length: "abc"};\nconst a = +object.length;',
		'const object = {length: true};\nconst a = +object.length;',
	],
	invalid: [
		{
			code: 'const object = {length: 5};\nconst a = Number(object.length);',
			output: 'const object = {length: 5};\nconst a = object.length;',
			errors: 1,
		},
		{
			code: 'const a = Number(foo.length);',
			output: 'const a = foo.length;',
			errors: 1,
		},
	],
});
