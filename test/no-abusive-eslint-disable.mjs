import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

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
		// TODO[@fisker]: Figure out how to test this
		// outdent`
		// 	/* eslint-disable no-abusive-eslint-disable */
		// 	eval(); // eslint-disable-line
		// `,
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
	],
});
