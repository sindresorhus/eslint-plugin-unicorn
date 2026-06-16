import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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

		// Out of scope
		'Object({a: 1})',
		'Symbol(x)',
		'Array(x)',
		'new Boolean(true)',
		'new Number(42)',
		'~~x',
		'!!x',
		'x + \'\'',
		'x.toString()',
		'globalThis.Boolean(true)',

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

		// Resolved variables
		'const flag = true; Boolean(flag)',
		'const name = \'unicorn\'; String(name)',

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
	],
});
