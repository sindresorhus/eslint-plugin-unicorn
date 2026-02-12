import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	testerOptions: {
		plugins: Object.fromEntries([
			['plugin-name', 'rule-name'],
			['@scope/plugin', 'rule-name'],
			['@scope', 'rule-name'],
		].map(([pluginName, ruleName]) => [pluginName, {rules: {[ruleName]: {}}}])),
	},
	valid: [
		'eval();',
		'eval(); // eslint-disable-line no-eval',
		'eval(); // eslint-disable-line no-eval, no-console',
		'eval(); //eslint-disable-line no-eval',
		'eval(); //     eslint-disable-line no-eval',
		'eval(); //\teslint-disable-line no-eval',
		'eval(); /* eslint-disable-line no-eval */',
		'eval(); // eslint-disable-line plugin-name/rule-name',
		'eval(); // eslint-disable-line @scope/plugin/rule-name',
		'eval(); // eslint-disable-line no-eval, @scope/plugin/rule-name',
		'eval(); // eslint-disable-line @scope/rule-name',
		'eval(); // eslint-disable-line no-eval, @scope/rule-name',
		'eval(); // eslint-line-disable',
		'eval(); // some comment',
		'/* eslint-disable no-eval */',
		// Add `rule-to-test/` to `no-abusive-eslint-disable`
		// Because `RuleTester` add this prefix
		// https://github.com/eslint/eslint/blob/ecd0ede7fd2ccbb4c0daf0e4732e97ea0f49db1b/lib/rule-tester/rule-tester.js#L554
		outdent`
			/* eslint-disable rule-to-test/no-abusive-eslint-disable */
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
		`,
		outdent`
			foo();
			/* eslint-enable */
		`,
		outdent`
			foo();
			/* eslint-enable no-eval */
		`,
		outdent`
			foo();
			/* eslint no-unused-vars: error */
		`,
		outdent`
			/* global foo */
			foo();
		`,
		outdent`
			// eslint-disables: This file is a polyfill, it is meant to abstract away rules
			const x = ''
		`,
	],
	invalid: [],
});

test.snapshot({
	valid: [],
	invalid: [
		'eval(); // eslint-disable-line',
		outdent`
			foo();
			eval(); // eslint-disable-line
		`,
		'/* eslint-disable */',
		outdent`
			foo();
			/* eslint-disable */
			eval();
		`,
		outdent`
			foo();
				/* eslint-disable-next-line */
					eval();
		`,
		outdent`
			// eslint-disable-next-line
			eval();
		`,
		outdent`
			// eslint-disable-next-line -- reason
			eval();
		`,
		outdent`
			// eslint-disable-next-line no-eval
			eval();
			// eslint-disable-next-line
			eval();
		`,
	],
});
