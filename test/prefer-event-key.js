import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-event-key';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const invalidTestCase = (code, output, eventName) => {
	return {
		code,
		output,
		errors: [{message: `Prefer \`${eventName}.key\` over \`${eventName}.keyCode\``}]
	};
};

ruleTester.run('prefer-event-key', rule, {
	valid: [
		`foo.addEventListener('keydown', event => {
			if (event.key === 'Escape') {
			}
		});`
	],
	invalid: [
		invalidTestCase(
			`foo.addEventListener('keydown', event => {
				if (event.keyCode === 27) {
				}
			});`,
			`foo.addEventListener('keydown', event => {
				if (event.key === 'Escape') {
				}
			});`,
			'event'
		),
		invalidTestCase(
			`foo.addEventListener('keydown', event => {
				if (event.keyCode == 27) {
				}
			});`,
			`foo.addEventListener('keydown', event => {
				if (event.key == 'Escape') {
				}
			});`,
			'event'
		),
		invalidTestCase(
			`foo.addEventListener('keydown', event => {
				if (event.keyCode !== 27) {
				}
			});`,
			`foo.addEventListener('keydown', event => {
				if (event.key !== 'Escape') {
				}
			});`,
			'event'
		),
		invalidTestCase(
			`foo.addEventListener('keydown', event => {
				if (event.keyCode != 27) {
				}
			});`,
			`foo.addEventListener('keydown', event => {
				if (event.key != 'Escape') {
				}
			});`,
			'event'
		),
		invalidTestCase(
			`foo.addEventListener('keydown', event => {
				if (event.keyCode === 255) {
				}
			});`,
			`foo.addEventListener('keydown', event => {
				if (event.keyCode === 255) {
				}
			});`,
			'event'
		)
	]
});
