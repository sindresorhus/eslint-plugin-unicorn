import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-key-over-key-code';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = key => ({
	ruleId: 'prefer-key-over-key-code',
	message: `Use key instead of ${key}. See https://goo.gl/cRK532 for more info.`
});

ruleTester.run('prefer-key-over-key-code', rule, {
	valid: [
		`window.addEventListener('click', e => {
			console.log(e.key);
		})`,
		'const { keyCode } = e',
		'const { charCode } = e',
		'const {a, b, c} = event',
		'const keyCode = () => 4',
		'const which = keyCode => 5',
		'function which(abc) { const {keyCode} = abc; return keyCode}',
		'const { which } = e',
		'const { keyCode: key } = e',
		'const { keyCode: abc } = e',
		`foo.addEventListener('keydown', e => {
			(function (abc) {
				if (e.key === 'ArrowLeft') return true;
				const { charCode } = abc;
			}())
		})`,
		`foo.addEventListener('keydown', e => {
			if (e.key === 'ArrowLeft') return true;
		})`,
		`a.addEventListener('keyup', function (event) {
			const key = event.key;
		})`,
		`a.addEventListener('keyup', function (event) {
			const { key } = event;
		})`,
		`foo.addEventListener('click', e => {
			const good = {};
			good.keyCode = '34';
		});`,
		`foo.addEventListener('click', e => {
			const good = {};
			good.charCode = '34';
		});`,
		`foo.addEventListener('click', e => {
			const good = {};
			good.which = '34';
		});`,
		`foo.addEventListener('click', e => {
			const {keyCode: a, charCode: b, charCode: c} = e;
		});`,
		`add.addEventListener('keyup', event => {
			f.addEventList('some', e => {
				const {charCode} = e;
				console.log(event.key)
			})
		})`
	],
	invalid: [
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.keyCode);
				})
			`,
			errors: [error('keyCode')]
		},
		{
			code: `				
				foo.addEventListener('click', event => {
					if (event.keyCode === 27) {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `				
				foo.addEventListener('click', a => {
					if (a.keyCode === 27) {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `				
				foo.addEventListener('click', (a, b, c) => {
					if (a.keyCode === 27) {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `				
				foo.addEventListener('click', function(a, b, c) {
					if (a.keyCode === 27) {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `				
				foo.addEventListener('click', function(b) {
					if (b.keyCode === 27) {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {keyCode, a, b} = e;
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {a: keyCode, a, b} = e;
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				add.addEventListener('keyup', event => {
					f.addEventList('some', e => {
						const {keyCode} = event;
						console.log(event.key)
					})
				})
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.charCode);
				})
			`,
			errors: [error('charCode')]
		},
		{
			code: `				
				foo.addEventListener('click', event => {
					if (event.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `				
				foo.addEventListener('click', a => {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `				
				foo.addEventListener('click', (a, b, c) => {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `				
				foo.addEventListener('click', function(a, b, c) {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `				
				foo.addEventListener('click', function(b) {
					if (b.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {charCode, a, b} = e;
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {a: charCode, a, b} = e;
				});
			`,
			errors: [error('charCode')]
		},
		{
			code: `
				window.addEventListener('click', e => {
					console.log(e.which);
				})
			`,
			errors: [error('which')]
		},
		{
			code: `				
				foo.addEventListener('click', event => {
					if (event.which === 27) {
					}
				});
			`,
			errors: [error('which')]
		},
		{
			code: `				
				foo.addEventListener('click', a => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')]
		},
		{
			code: `				
				foo.addEventListener('click', (a, b, c) => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')]
		},
		{
			code: `				
				foo.addEventListener('click', function(a, b, c) {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')]
		},
		{
			code: `				
				foo.addEventListener('click', function(b) {
					if (b.which === 27) {
					}
				});
			`,
			errors: [error('which')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {which, a, b} = e;
				});
			`,
			errors: [error('which')]
		},
		{
			code: `
				foo.addEventListener('click', e => {
					const {a: which, a, b} = e;
				});
			`,
			errors: [error('which')]
		}
	]
});
