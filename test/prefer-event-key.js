import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-event-key';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = key => ({
	ruleId: 'prefer-event-key',
	message: `Use \`.key\` instead of \`.${key}\``
});

ruleTester.run('prefer-event-key', rule, {
	valid: [
		`window.addEventListener('click', e => {
			console.log(e.key);
		})`,
		`window.addEventListener('click', () => {
			console.log(keyCode, which, charCode);
			console.log(window.keyCode);
		})`,
		`foo.addEventListener('click', (e, r, fg) => {
			function a() {
				if (true) {
					{
						{
							const e = {};
							const { charCode } = e;
							console.log(e.keyCode, charCode);
						}
					}
				}
			}
		});`,
		`
		const e = {}
		foo.addEventListener('click', function (event) {
			function a() {
				if (true) {
					{
						{
							console.log(e.keyCode);
						}
					}
				}
			}
		});
		`,
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
		})`,
		`foo.addEventListener('click', e => {
			{
				const e = {};
				console.log(e.keyCode);
			}
		});`
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
				window.addEventListener('click', ({keyCode}) => {
					console.log(keyCode);
				})
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				window.addEventListener('click', ({which}) => {
					if (which === 23) {
						console.log('Wrong!')
					}
				})
			`,
			errors: [error('which')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 27) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'Escape') {
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
			output: `
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
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
			output: `
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
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
			output: `
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
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
			output: `
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
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
				foo11111111.addEventListener('click', event => {
					if (event.charCode === 27) {
					}
				});
			`,
			output: `
				foo11111111.addEventListener('click', event => {
					if (event.key === 'Escape') {
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
			errors: [error('charCode')],
			output: `
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', (a, b, c) => {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')],
			output: `
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', function(a, b, c) {
					if (a.charCode === 27) {
					}
				});
			`,
			output: `
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
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
			errors: [error('charCode')],
			output: `
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
				});
			`
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
			errors: [error('which')],
			output: `
				foo.addEventListener('click', event => {
					if (event.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', a => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: `
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', (a, b, c) => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: `
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', function(a, b, c) {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: `
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
					}
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', function(b) {
					if (b.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: `
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
				});
			`
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
		},
		{
			code: `
				foo.addEventListener('click', function(b) {
					if (b.which === 27) {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`,
			errors: [error('which'), error('keyCode')],
			output: `
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`
		},
		{
			code: `
				foo.addEventListener('click', function(b) {
					if (b.which > 27) {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`,
			errors: [error('which'), error('keyCode')],
			output: `
				foo.addEventListener('click', function(b) {
					if (b.which > 27) {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`
		},
		{
			code: `
			const e = {}
			foo.addEventListener('click', (e, r, fg) => {
				function a() {
					if (true) {
						{
							{
								const { charCode } = e;
								console.log(e.keyCode, charCode);
							}
						}
					}
				}
			});
			`,
			errors: [error('charCode'), error('keyCode')],
			output: `
			const e = {}
			foo.addEventListener('click', (e, r, fg) => {
				function a() {
					if (true) {
						{
							{
								const { charCode } = e;
								console.log(e.keyCode, charCode);
							}
						}
					}
				}
			});
			`
		},
		{
			code: `
			const e = {}
			foo.addEventListener('click', (e, r, fg) => {
				function a() {
					if (true) {
						{
							{
								const { charCode } = e;
								console.log(e.keyCode, charCode);
							}
						}
					}
				}
			});
			`,
			errors: [error('charCode'), error('keyCode')],
			output: `
			const e = {}
			foo.addEventListener('click', (e, r, fg) => {
				function a() {
					if (true) {
						{
							{
								const { charCode } = e;
								console.log(e.keyCode, charCode);
							}
						}
					}
				}
			});
			`
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 13) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'Enter') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 38) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowUp') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 40) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowDown') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 37) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowLeft') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 39) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowRight') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 221) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === ']') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 186) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === ';') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 187) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === '=') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 188) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === ',') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 189) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === '-') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 190) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === '.') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 191) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === '/') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 219) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === '[') {
					}
				});
			`,
			errors: [error('keyCode')]
		},
		{
			code: `
				foo123.addEventListener('click', event => {
					if (event.keyCode === 222) {
					}
				});
			`,
			output: `
				foo123.addEventListener('click', event => {
					if (event.key === ''') {
					}
				});
			`,
			errors: [error('keyCode')]
		}
	]
});
