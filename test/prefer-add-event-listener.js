import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-add-event-listener';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = (code, correctCode, eventType, message) => {
	return {
		code,
		output: correctCode || code,
		errors: eventType ?
			[{message: `Prefer \`addEventListener\` over \`${eventType}\`.`}] :
			[{message}]
	};
};

const expectedBeforeUnloadWithReturnMessage = [
	'Prefer `addEventListener` over `onbeforeunload`.',
	'Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.'
].join(' ');

ruleTester.run('prefer-add-event-listener', rule, {
	valid: [
		'foo.addEventListener(\'click\', () => {})',
		'foo.removeEventListener(\'click\', onClick)',
		'foo.onclick',
		'foo.setCallBack = () => {console.log(\'foo\')}',
		'setCallBack = () => {console.log(\'foo\')}',
		'foo.onclick.bar = () => {}',
		'foo[\'x\'] = true;'
	],

	invalid: [
		invalidTestCase(
			'foo.onclick = () => {}',
			'foo.addEventListener(\'click\', () => {})',
			'onclick'
		),
		invalidTestCase(
			'foo.onclick = 1',
			'foo.addEventListener(\'click\', 1)',
			'onclick'
		),
		invalidTestCase(
			'foo.bar.onclick = onClick',
			'foo.bar.addEventListener(\'click\', onClick)',
			'onclick'
		),
		invalidTestCase(
			'const bar = null; foo.onclick = bar;',
			'const bar = null; foo.addEventListener(\'click\', bar);',
			'onclick'
		),
		invalidTestCase(
			'foo.onkeydown = () => {}',
			'foo.addEventListener(\'keydown\', () => {})',
			'onkeydown'
		),
		invalidTestCase(
			'foo.ondragend = () => {}',
			'foo.addEventListener(\'dragend\', () => {})',
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
		),
		invalidTestCase(
			'foo.onclick = null',
			null,
			null,
			'Prefer `removeEventListener` over `onclick`.'
		),
		invalidTestCase(
			'foo.onclick = undefined',
			null,
			null,
			'Prefer `removeEventListener` over `onclick`.'
		),
		invalidTestCase(
			'window.onbeforeunload = null',
			null,
			null,
			'Prefer `removeEventListener` over `onbeforeunload`.'
		),
		invalidTestCase(
			'window.onbeforeunload = undefined',
			null,
			null,
			'Prefer `removeEventListener` over `onbeforeunload`.'
		),
		invalidTestCase(
			'window.onbeforeunload = foo',
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			'window.onbeforeunload = () => \'foo\'',
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			`window.onbeforeunload = () => {
				return bar;
			}`,
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			`window.onbeforeunload = function () {
				return 'bar';
			}`,
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			`window.onbeforeunload = function () {
				return;
			}`,
			`window.addEventListener('beforeunload', function () {
				return;
			})`,
			'onbeforeunload'
		),
		invalidTestCase(
			`window.onbeforeunload = function () {
				(() => {
					return 'foo';
				})();
			}`,
			`window.addEventListener('beforeunload', function () {
				(() => {
					return 'foo';
				})();
			})`,
			'onbeforeunload'
		),
		invalidTestCase(
			`window.onbeforeunload = e => {
				console.log(e);
			}`,
			`window.addEventListener('beforeunload', e => {
				console.log(e);
			})`,
			'onbeforeunload'
		)
	]
});
