import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-abusive-eslint-disable';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = message => ({
	ruleId: 'no-abusive-eslint-disable',
	message
});

ruleTester.run('no-abusive-eslint-disable', rule, {
	valid: [
		`eval();`,
		`eval(); // eslint-disable-line no-eval`,
		`eval(); // eslint-disable-line no-eval, no-console`,
		`eval(); //eslint-disable-line no-eval`,
		`eval(); //     eslint-disable-line no-eval`,
		`eval(); //\teslint-disable-line no-eval`,
		`eval(); /* eslint-disable-line no-eval */`,
		`eval(); /* eslint-disable-line no-eval */`,
		`eval(); // eslint-line-disable`,
		`eval(); // some comment`,
		`foo();
		// eslint-disable-line no-eval
		eval();`,
		'/* eslint-disable no-eval */',
		`foo();
		/* eslint-disable no-eval */
		eval();`
	],
	invalid: [
		{
			code: `eval(); // eslint-disable-line`,
			errors: [error('Specify the rules you want to disable at line 1:8')]
		},
		{
			code: 'foo();\neval(); // eslint-disable-line',
			errors: [error('Specify the rules you want to disable at line 2:8')]
		},
		{
			code: '/* eslint-disable */',
			errors: [error('Specify the rules you want to disable at line 1:0')]
		},
		{
			code: 'foo();\n/* eslint-disable */\neval();',
			errors: [error('Specify the rules you want to disable at line 2:0')]
		}
	]
});
