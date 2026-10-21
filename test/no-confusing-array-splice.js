import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['array.splice((/* keep */ index), 1, element);', 'array[(/* keep */ index)] = element;'],
		['array.toSpliced(index, 1, read(/* keep */));', 'array.with(index, read(/* keep */));'],
	].map(([code, output]) => ({code, errors: [{messageId: 'replace-one-element', suggestions: [{messageId: 'suggestion-replace-one-element', output}]}]})),
});

test({
	valid: [],
	invalid: [
		...[
			['(array /* keep */).splice(0, 1, element);', '(array /* keep */)[0] = element;'],
			['array.splice(0, 1, (element // keep\r\n));', 'array[0] = (element // keep\r\n);'],
			['array.toSpliced((/* index */ 0), 1, (/* element */ first, second));', 'array.with((/* index */ 0), (/* element */ first, second));'],
		].map(([code, output]) => ({code, errors: [{messageId: 'replace-one-element', suggestions: [{messageId: 'suggestion-replace-one-element', output}]}]})),
		{
			code: 'array.splice(index as /* keep */ number, 1, element);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'replace-one-element', suggestions: [{messageId: 'suggestion-replace-one-element', output: 'array[index as /* keep */ number] = element;'}]}],
		},
		...[
			'array./* discard */splice((/* keep */ index), 1, element);',
			'array.splice((/* keep */ index), /* discard */ 1, element);',
			'array.splice((/* keep */ index), (1 /* discard */), element);',
			'array.toSpliced(index, 1, /* discard */ element);',
			'array.toSpliced(index, 1, (/* keep */ element) /* discard */);',
			'const result = array.splice((/* keep */ index), 1, element);',
		].map(code => ({code, errors: [{messageId: 'replace-one-element', suggestions: []}]})),
	],
});

nodeTest('comment-preserving element replacement suggestions retain evaluation order and mutation', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-confusing-array-splice': rule}}},
		rules: {'unicorn/no-confusing-array-splice': 'error'},
	};
	for (const method of ['splice', 'toSpliced']) {
		const expression = `array.${method}(readIndex(/* index */), 1, readElement(/* element */));`;
		const code = outdent`
			const array = [1, 2, 3];
			const events = [];
			const readIndex = () => {events.push("index"); return 1;};
			const readElement = () => {events.push("element"); return 9;};
			${method === 'toSpliced' ? 'const result = ' : ''}${expression}
			JSON.stringify({array, ${method === 'toSpliced' ? 'result,' : ''} events});
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions?.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.strictEqual(suggested.split('/* index */').length, 2);
		t.assert.strictEqual(suggested.split('/* element */').length, 2);
		t.assert.deepStrictEqual(linter.verify(suggested, config), []);
		const originalResult = runInNewContext(code);
		const suggestedResult = runInNewContext(suggested);
		t.assert.strictEqual(suggestedResult, originalResult);
		t.assert.deepStrictEqual(JSON.parse(suggestedResult), method === 'splice'
			? {array: [1, 9, 3], events: ['index', 'element']}
			: {array: [1, 2, 3], result: [1, 9, 3], events: ['index', 'element']});
	}
});

test.snapshot({
	valid: [
		// Known non-array receiver (type information)
		{
			code: 'function f(foo: {splice(start: number, deleteCount: number, element: unknown): void}) { foo.splice(index, 1, element); }',
			languageOptions: {parser: parsers.typescript},
		},
		'array.splice(index)',
		'array.splice(index, 1)',
		'array.splice(index, 2, element)',
		'array.splice(index, 0, element)',
		'array.splice(index, 1n, element)',
		'array.splice(-2, 0, element)',
		'array.splice(-1, 0, element, otherElement)',
		'array.splice(index, 1, ...elements)',
		'array.splice(index, ...argumentsArray)',
		// Nested unary expressions resolve to a positive index.
		'array.splice(- -1, 0, element)',
		'array.splice(-(-(1)), 0, element)',
		'array.toSpliced(index)',
		'array.toSpliced(index, 1)',
		'array.toSpliced(index, 2, element)',
		'array.toSpliced(index, 0, element)',
		'array.toSpliced(index, 1n, element)',
		'array.toSpliced(-2, 0, element)',
		'array.toSpliced(-1, 0, element, otherElement)',
		'array.toSpliced(index, 1, ...elements)',
		'array.toSpliced(index, ...argumentsArray)',
		'array["splice"](index, 1, element)',
		'array["toSpliced"](index, 1, element)',
		'splice(index, 1, element)',
		'toSpliced(index, 1, element)',
		'new array.splice(index, 1, element)',
		'array.splice?.(index, 1, element)',
		'array.toSpliced?.(index, 1, element)',
		'array?.splice(index, 1, element)',
		'array?.toSpliced(index, 1, element)',
	],
	invalid: [
		'array.splice(index, 1, element)',
		'array.splice(index, 1.0, element)',
		'array.splice(index, 0x1, element)',
		'array.splice(index, +1, element)',
		'array.items.splice(index, 1, element)',
		'array.splice(/* comment */ index, 1, element)',
		'const removed = array.splice(index, 1, element)',
		'array.splice(-1, 1, element)',
		'array.splice(-1, 0, element)',
		'array.splice(-1, 0.5, element)',
		'array.splice(- 1, 0, element)',
		'array.splice(-1, +0, element)',
		'array.splice(-1, -0, element)',
		'array.splice(-1, 0b0, element)',
		// Nested unary expressions resolve to a negative index.
		'array.splice(- - -1, 0, element)',
		'array.splice(-(-(-1)), 0, element)',
		'array.toSpliced(index, 1, element)',
		'array.toSpliced(index, 1.0, element)',
		'array.toSpliced(index, 1.5, element)',
		'array.toSpliced(index, 0x1, element)',
		'array.toSpliced(index, +1, element)',
		'(array || other).toSpliced(index, 1, element)',
		'const result = array.toSpliced(index, 1, element)',
		'array.toSpliced(-1, 1, element)',
		'array.toSpliced(-1.5, 1, element)',
		'array.toSpliced(array.length, 1, element)',
		'array.toSpliced(-1, 0, element)',
		'array.toSpliced(-1.5, 0.5, element)',
		'array.toSpliced(- 1, 0, element)',
		'array.toSpliced(-1, +0, element)',
		'array.toSpliced(-1, -0, element)',
		'array.toSpliced(-1, 0b0, element)',
		// A bracket assignment does not run `ToInteger` on the index, so only a whole non-negative number or a canonical numeric string is the same element
		'array.splice(1, 1, element)',
		'array.splice(NaN, 1, element)',
		'array.splice(1.5, 1, element)',
		'array.splice(true, 1, element)',
		'array.splice(null, 1, element)',
		'array.splice(undefined, 1, element)',
		'array.splice(\'1\', 1, element)',
		'array.splice(\'0\', 1, element)',
		'array.splice(\'1.5\', 1, element)',
		'array.splice(\'abc\', 1, element)',
		'array.splice(\'1x\', 1, element)',
		'array.splice(\'\', 1, element)',
		'array.splice(\'01\', 1, element)',
		// A sequence expression keeps its parentheses
		'array.splice(0, 1, (9, 8))',
		'array.toSpliced(0, 1, (9, 8))',
		'array.toSpliced((0, 1), 1, element)',
		// The replacement reads the length, so an element that mutates the array would run after that read
		'array.splice(-1, 0, array.pop())',
		// `array[1e21]` is the property named `1e+21`, not an index
		'array.splice(1e21, 1, element)',
		'array.splice(index + 1, 1, element)',
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'array.splice(index, 1n, element)',
		'array.toSpliced(index, 1n, element)',
	],
	invalid: [
		'array.splice(index, 1 as const, element)',
		'array.splice(index, <number>1, element)',
		'array.splice(index, 1!, element)',
		'array.splice(index, 1 satisfies number, element)',
		'array.splice(-1 as const, 0 as const, element)',
		'array.splice(-1 satisfies number, 0 satisfies number, element)',
		'array.toSpliced(index, 1 as const, element)',
		'array.toSpliced(index, <number>1, element)',
		'array.toSpliced(index, 1!, element)',
		'array.toSpliced(index, 1 satisfies number, element)',
		'array.toSpliced(-1 as const, 0 as const, element)',
		'array.toSpliced(-1 satisfies number, 0 satisfies number, element)',
		'array.toSpliced(-1 satisfies number, 1, element)',
		'array.toSpliced(-(1 satisfies number), 1, element)',
		// A receiver that is known to be an array must still be reported
		'function f(foo: unknown[]) { foo.splice(index, 1, element); }',
		// A TypeScript wrapper does not make `null` or `undefined` an index
		'array.splice(null as any, 1, element)',
		'array.splice(undefined!, 1, element)',
	],
});

test({
	valid: [],
	invalid: [{
		code: '({array: [1]}.array.toSpliced)(0, 1, 2);',
		errors: [{
			messageId: 'replace-one-element', suggestions: [{
				messageId: 'suggestion-replace-one-element',
				output: '({array: [1]}.array).with(0, 2);',
			}],
		}],
	}, {
		code: 'const result = ({array: [1]}.array.toSpliced)(0, 1, 2);',
		errors: [{
			messageId: 'replace-one-element', suggestions: [{
				messageId: 'suggestion-replace-one-element',
				output: 'const result = {array: [1]}.array.with(0, 2);',
			}],
		}],
	}, {
		code: '((array)).toSpliced(0, 1, 2);',
		errors: [{
			messageId: 'replace-one-element', suggestions: [{
				messageId: 'suggestion-replace-one-element',
				output: '((array)).with(0, 2);',
			}],
		}],
	}],
});
