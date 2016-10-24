import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-starts-ends-with';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = {
	startsWith: [{
		ruleId: 'prefer-starts-ends-with',
		message: 'Prefer `.startsWith` over regex with `^`.'
	}],
	endsWith: [{
		ruleId: 'prefer-starts-ends-with',
		message: 'Prefer `.endsWith` over regex with `$`.'
	}]
};

const validRegex = [
	/foo/,
	/^foo$/,
	/^foo+/,
	/foo+$/,
	/^[f,a]/,
	/[f,a]$/,
	/^\w/,
	/\w$/,
	/^foo./,
	/foo.$/,
	/\^foo/
];

const invalidRegex = [
	/^foo/,
	/foo$/,
	/^!/,
	/!$/,
	/^ /,
	/ $/
];

ruleTester.run('prefer-starts-ends-with', rule, {
	valid: [
		'foo.startsWith("bar")',
		'foo.endsWith("bar")'
	]
		.concat(validRegex.map(re => `${re}.test(bar)`))
		.concat(validRegex.map(re => `bar.match(${re})`)),
	invalid: []
		.concat(invalidRegex.map(re => ({
			code: `${re}.test(bar)`,
			errors: errors[`${re}`.startsWith('/^') ? 'startsWith' : 'endsWith']
		})))
		.concat(invalidRegex.map(re => ({
			code: `bar.match(${re})`,
			errors: errors[`${re}`.startsWith('/^') ? 'startsWith' : 'endsWith']
		})))
});
