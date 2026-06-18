import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Trailing identity operands are not value-preserving outside boolean contexts.
		'const value = input && true;',
		'const value = input || false;',

		// Trailing absorbing operands are not value-preserving for arbitrary values.
		'const value = input && false;',
		'const value = input || true;',
		'const flag = input === other;\nconst value = flag && false;',
		'const flag = input === other;\nconst value = flag || true;',
		'const value = !input && false;',
		'const value = input === other || true;',
		'const value = key in object && false;',
		'const value = input < other || true;',

		// Keep side effects from known-boolean calls.
		'const value = isReady() && false;',
		'const value = isReady() || true;',
		'const value = Number.isFinite(input) && false;',
		'const value = /foo/.test(input) || true;',

		// Out of scope.
		'const value = input ?? false;',
		'const value = input === true;',
		'const value = input !== false;',
		'const value = input & true;',
		'const value = input | false;',

		// Mixed logical operators are not flattened together.
		'const value = input && (other || false);',
		'const value = input || (other && true);',
	],
	invalid: [
		// Leading identity operands.
		'const value = true && input;',
		'const value = false || input;',

		// Middle identity operands are value-preserving.
		'const value = input && true && other;',
		'const value = input || false || other;',
		'const value = true && input && true && other;',
		'const value = false || input || false || other;',

		// Trailing identity operands in boolean contexts.
		'if (input && true) {}',
		'if (input || false) {}',
		'while (input && true) {}',
		'const value = input && true ? yes : no;',
		'const value = Boolean(input || false);',
		'const value = !(input && true);',

		// Trailing identity operands with known boolean values.
		'const flag = input === other;\nconst value = flag && true;',
		'const flag = input === other;\nconst value = flag || false;',
		'const value = !input && true;',
		'const value = input === other || false;',
		'const value = Number.isFinite(input) && true;',
		'const value = /foo/.test(input) || false;',

		// Leading absorbing operands.
		'const value = false && input;',
		'const value = true || input;',

		// Parenthesized expressions.
		'const value = (true && input);',
		'const value = ((false || input));',
		'const value = true && (input || other) && final;',

		// Object expressions must remain valid when they become the first operand.
		'const value = true && {};',
		'true && {};',
		'const value = true && {} && input;',
		'true && {} && input;',

		// ASI-sensitive replacements.
		outdent`
			const value = input
			true && [1, 2, 3].map(number => number)
		`,
		outdent`
			const value = input
			false || (1 + 2)
		`,

		// Comments are reported but not fixed.
		'const value = true /* keep */ && input;',
		'if (input && /* keep */ true) {}',

		// TypeScript.
		{code: 'declare const flag: boolean;\nconst value = flag && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const flag: true;\nconst value = flag || false;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input as boolean) && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input satisfies boolean) || false;', languageOptions: {parser: parsers.typescript}},
	],
});
