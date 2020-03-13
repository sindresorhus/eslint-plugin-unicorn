import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import outdent from 'outdent';
import rule from '../rules/prefer-set-has';

const ruleId = 'prefer-set-has';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const createError = name => [
	{
		messageId: 'preferSetHas',
		data: {
			name
		}
	}
];

ruleTester.run(ruleId, rule, {
	valid: [
		outdent`
			const foo = new Set(['1', '2', '3']);
			if (foo.has('1')) {}
		`,
		// Not `VariableDeclarator`
		outdent`
			foo = ['1', '2', '3'];
			if (foo.includes('1')) {}
		`,
		outdent`
			if (foo.includes('1')) {}
		`,
		outdent`
			if (['1', '2', '3'].includes('1')) {}
		`,
		// Didn't call `includes()`
		outdent`
			const foo = ['1', '2', '3'];
		`,
		// Not `CallExpression`
		outdent`
			const foo = ['1', '2', '3'];
			if (foo.includes) {}
		`,
		// Not `foo.includes()`
		outdent`
			const foo = ['1', '2', '3'];
			if (includes(foo)) {}
		`,
		outdent`
			const foo = ['1', '2', '3'];
			if (bar.includes(foo)) {}
		`,
		outdent`
			const foo = ['1', '2', '3'];
			if (foo[includes]('1')) {}
		`,
		outdent`
			const foo = ['1', '2', '3'];
			if (foo.indexOf('1') !== -1) {}
		`,
		// Not only `foo.includes()`
		outdent`
			const foo = ['1', '2', '3'];
			if (foo.includes('1')) {}
			foo.length = 1;
		`,
		// Declared more than once
		outdent`
			var foo = ['1', '2', '3'];
			var foo = ['4', '5', '6'];
			if (foo.includes('1')) {}
		`,
		// Not `ArrayExpression`
		outdent`
			var foo = bar;
			if (foo.includes('1')) {}
		`
	],
	invalid: [
		{
			code: outdent`
				const foo = ['1', '2', '3'];
				if (foo.includes('1')) {}
				if (foo.includes('1')) {}
			`,
			output: outdent`
				const foo = new Set(['1', '2', '3']);
				if (foo.has('1')) {}
				if (foo.has('1')) {}
			`,
			errors: createError('foo')
		}
	]
});
