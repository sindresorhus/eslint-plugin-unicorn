import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-abusive-eslint-disable';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

// Define rules for test
[
	'plugin/rule',
	'@scope/plugin/rule-name',
	'@scope/rule-name',
	'@scopewithoutplugin'
].forEach(rule => {
	ruleTester.linter.defineRule(rule, {});
});

const error = [
	{
		messageId: 'no-abusive-eslint-disable'
	}
];

ruleTester.run('no-abusive-eslint-disable', rule, {
	valid: [
		'eval();',
		'eval(); // eslint-disable-line no-eval',
		'eval(); // eslint-disable-line no-eval, no-console',
		'eval(); //eslint-disable-line no-eval',
		'eval(); //     eslint-disable-line no-eval',
		'eval(); //\teslint-disable-line no-eval',
		'eval(); /* eslint-disable-line no-eval */',
		'eval(); // eslint-disable-line plugin/rule',
		'eval(); // eslint-disable-line @scope/plugin/rule-name',
		'eval(); // eslint-disable-line no-eval, @scope/plugin/rule-name',
		'eval(); // eslint-disable-line @scope/rule-name',
		'eval(); // eslint-disable-line no-eval, @scope/rule-name',
		'eval(); // eslint-line-disable',
		'eval(); // some comment',
		'/* eslint-disable no-eval */',
		outdent`
			/* eslint-disable no-abusive-eslint-disable */
			eval(); // eslint-disable-line
		`,
		outdent`
			foo();
			// eslint-disable-line no-eval
			eval();
		`,
		outdent`
			foo();
			/* eslint-disable no-eval */
			eval();
		`,
		outdent`
			foo();
			/* eslint-disable-next-line no-eval */
			eval();
		`
	],
	invalid: [
		{
			code: 'eval(); // eslint-disable-line',
			errors: error
		},
		{
			code: 'foo();\neval(); // eslint-disable-line',
			errors: error
		},
		{
			code: '/* eslint-disable */',
			errors: error
		},
		{
			code: 'foo();\n/* eslint-disable */\neval();',
			errors: error
		},
		{
			code: 'foo();\n/* eslint-disable-next-line */\neval();',
			errors: error
		},
		{
			code: '// eslint-disable-next-line\neval();',
			errors: error
		},
		{
			code: '// eslint-disable-next-line @scopewithoutplugin\neval();',
			errors: error
		}
	]
});

const visualizeTester = visualizeRuleTester(test);
visualizeTester.run('no-abusive-eslint-disable', rule, [
	'eval(); // eslint-disable-line'
]);
