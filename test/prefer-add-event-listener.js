import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-add-event-listener';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, correctCode, eventType) => {
	return {
		code,
		output: correctCode,
		errors: [{message: `Prefer \`addEventListener\` over \`${eventType}\``}]
	};
};

ruleTester.run('prefer-add-event-listener', rule, {
	valid: [
		`foo.addEventListener('click', () => {})`,
		`foo.onclick`,
		`foo.setCallBack = () => {console.log('foo')}`,
		`setCallBack = () => {console.log('foo')}`,
		`foo.onclick.bar = () => {}`,
		`foo['x'] = true;`
	],
	invalid: [
		invalidTestCase(
			'foo.onclick = () => {}',
			`foo.addEventListener('click', () => {})`,
			'onclick'
		),
		invalidTestCase(
			'foo.bar.onclick = onClick',
			`foo.bar.addEventListener('click', onClick)`,
			'onclick'
		),
		invalidTestCase(
			'foo.onkeydown = () => {}',
			`foo.addEventListener('keydown', () => {})`,
			'onkeydown'
		),
		invalidTestCase(
			'foo.ondragend = () => {}',
			`foo.addEventListener('dragend', () => {})`,
			'ondragend'
		),
		invalidTestCase(
			`foo.onclick = function (e) {
				console.log(e);
			}`,
			`foo.addEventListener('click', function (e) {
				console.log(e);
			})`,
			'onclick'
		)
	]
});
