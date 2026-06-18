import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Trailing identity operands are not value-preserving outside boolean contexts.
		'const value = input && true;',
		'const value = input || false;',

		// Non-leading absorbing operands are intentionally out of scope.
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

		// Trailing identity operands are still not safe inside parenthesized same-operator chains.
		'const value = input && (other && true);',
		'const value = input || (other || false);',

		// Optional chaining and unknown types are not known boolean in value contexts.
		'const value = object?.enabled && true;',
		{code: 'declare const value: unknown;\nconst result = value && true;', languageOptions: {parser: parsers.typescript}},

		// `for` initializers are not boolean contexts.
		'for (input && true;;) {}',

		// Directive prologue positions are ignored when simplifying to a string literal could change semantics.
		'true && \'use strict\';',
		'true && \'directive\';\n\'use strict\';',
		'\'directive\';\ntrue && \'use strict\';',
		outdent`
			function foo() {
				false || 'use strict';
			}
		`,
		{code: 'true && (\'use strict\' as const);', languageOptions: {parser: parsers.typescript}},
		{code: 'true && (\'use strict\' satisfies string);', languageOptions: {parser: parsers.typescript}},
		{code: 'true && \'use strict\'!;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && <const>\'use strict\';', languageOptions: {parser: parsers.typescript}},
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

		// Partial simplification can leave a trailing identity operand that is unsafe to remove.
		'const value = true && input && true;',
		'const value = false || input || false;',

		// All-identity chains collapse to one literal.
		'const value = true && true;',
		'const value = false || false;',

		// Trailing identity operands in boolean contexts.
		'if (input && true) {}',
		'if (input || false) {}',
		'if (input && (other && true)) {}',
		'if (input || (other || false)) {}',
		'if (object?.enabled && true) {}',
		'while (input && true) {}',
		'for (; input && true;) {}',
		'do {} while (input || false);',
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

		// Parenthesized chains.
		'const value = (true && input);',
		'const value = ((false || input));',

		// Member expressions and calls.
		'const value = true && input?.property;',
		'const value = false || input.member;',
		'const value = true && input();',
		'new (true && Constructor)();',
		'new (false || Constructor)();',

		// Mixed operators and grouped operands preserve needed parentheses.
		'const value = true && (input || other);',
		'const value = false || (input && other);',
		'const value = true && (foo = bar) && baz;',
		'const value = true && (foo, bar) && baz;',
		'const value = true && (input || other) && final;',
		'const value = (input || false || other) && final;',
		'const value = final && (input || false || other);',
		'const value = (input && true && other) || final;',

		// Object expressions must remain valid when they become the first operand.
		'const value = true && {};',
		'true && {};',
		'const value = true && {} && input;',
		'true && {} && input;',
		'true && function () {} && input;',
		'true && class {} && input;',
		'true && (function () {}) && input;',
		'true && (class {}) && input;',
		{code: 'true && {} as Foo && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && {} satisfies Foo && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && {}! && input;', languageOptions: {parser: parsers.typescript}},
		{code: 'true && <Foo>{} && input;', languageOptions: {parser: parsers.typescript}},

		// ASI-sensitive replacements.
		outdent`
			const value = input
			true && [1, 2, 3].map(number => number)
		`,
		outdent`
			const value = input
			false || (1 + 2)
		`,

		// String literals outside directive prologues are still fixable.
		'foo();\ntrue && \'use strict\';',

		// TypeScript wrappers around the logical expression keep the replacement parenthesized.
		{code: '(true && \'use strict\') as const;', languageOptions: {parser: parsers.typescript}},
		{code: '(false || \'use strict\') satisfies string;', languageOptions: {parser: parsers.typescript}},
		{code: '(true && \'use strict\')!;', languageOptions: {parser: parsers.typescript}},
		{code: '<const>(true && \'use strict\');', languageOptions: {parser: parsers.typescript}},

		// Comments inside the chain are reported but not fixed.
		'const value = true /* keep */ && input;',
		'if (input && /* keep */ true) {}',
		'const value = true && call(/* keep */);',
		'const value = true && call(/* keep */) && other;',

		// Comments outside the chain are preserved.
		'const value = /* keep */ true && input;',
		'const value = true && input /* keep */;',

		// TypeScript.
		{code: 'declare const flag: boolean;\nconst value = flag && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const flag: true;\nconst value = flag || false;', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const flag: boolean;\nconst value = flag! && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input as boolean) && true;', languageOptions: {parser: parsers.typescript}},
		{code: 'const value = (input satisfies boolean) || false;', languageOptions: {parser: parsers.typescript}},
	],
});
