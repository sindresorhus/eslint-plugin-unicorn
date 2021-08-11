import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const error = key => ({
	messageId: 'prefer-keyboard-event-key',
	data: {name: key},
});

test({
	valid: [
		outdent`
			window.addEventListener('click', e => {
				console.log(e.key);
			})
		`,
		outdent`
			window.addEventListener('click', () => {
				console.log(keyCode, which, charCode);
				console.log(window.keyCode);
			})
		`,
		outdent`
			foo.addEventListener('click', (e, r, fg) => {
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
			});
		`,
		outdent`
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
		outdent`
			foo.addEventListener('keydown', e => {
				(function (abc) {
					if (e.key === 'ArrowLeft') return true;
					const { charCode } = abc;
				}())
			})
		`,
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
		});`,
	],

	invalid: [
		{
			code: outdent`
				window.addEventListener('click', e => {
					console.log(e.keyCode);
				})
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				window.addEventListener('click', ({keyCode}) => {
					console.log(keyCode);
				})
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				window.addEventListener('click', ({which}) => {
					if (which === 23) {
						console.log('Wrong!')
					}
				})
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				window.addEventListener('click', ({which, another}) => {
					if (which === 23) {
						console.log('Wrong!')
					}
				})
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 27) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'Escape') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.keyCode === 65) {}
				});
			`,
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key === 'A') {}
				});
			`,
			errors: [error('keyCode')],
		},
		// Make sure `\n` is escaped
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.keyCode === 10) {}
				});
			`,
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key === '\\n') {}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (!event.keyCode) {}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', a => {
					if (a.keyCode === 27) {
					}
				});
			`,
			output: outdent`
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.keyCode === 27) {
					}
				});
			`,
			output: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.keyCode === 27) {
					}
				});
			`,
			output: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', function(b) {
					if (b.keyCode === 27) {
					}
				});
			`,
			output: outdent`
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {keyCode, a, b} = e;
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {a: keyCode, a, b} = e;
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				add.addEventListener('keyup', event => {
					f.addEventList('some', e => {
						const {keyCode} = event;
						console.log(event.key)
					})
				})
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				window.addEventListener('click', e => {
					console.log(e.charCode);
				})
			`,
			errors: [error('charCode')],
		},
		{
			code: outdent`
				foo11111111.addEventListener('click', event => {
					if (event.charCode === 27) {
					}
				});
			`,
			output: outdent`
				foo11111111.addEventListener('click', event => {
					if (event.key === 'Escape') {
					}
				});
			`,
			errors: [error('charCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', a => {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')],
			output: outdent`
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')],
			output: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.charCode === 27) {
					}
				});
			`,
			output: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
					}
				});
			`,
			errors: [error('charCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', function(b) {
					if (b.charCode === 27) {
					}
				});
			`,
			errors: [error('charCode')],
			output: outdent`
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {charCode, a, b} = e;
				});
			`,
			errors: [error('charCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {a: charCode, a, b} = e;
				});
			`,
			errors: [error('charCode')],
		},
		{
			code: outdent`
				window.addEventListener('click', e => {
					console.log(e.which);
				})
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', a => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: outdent`
				foo.addEventListener('click', a => {
					if (a.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: outdent`
				foo.addEventListener('click', (a, b, c) => {
					if (a.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: outdent`
				foo.addEventListener('click', function(a, b, c) {
					if (a.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', function(b) {
					if (b.which === 27) {
					}
				});
			`,
			errors: [error('which')],
			output: outdent`
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {which, a, b} = e;
				});
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				foo.addEventListener('click', e => {
					const {a: which, a, b} = e;
				});
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				foo.addEventListener('click', function(b) {
					if (b.which === 27) {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`,
			errors: [error('which'), error('keyCode')],
			output: outdent`
				foo.addEventListener('click', function(b) {
					if (b.key === 'Escape') {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`,
		},
		{
			code: outdent`
				foo.addEventListener('click', function(b) {
					if (b.which > 27) {
					}
					const {keyCode} = b;
					if (keyCode === 32) return 4;
				});
			`,
			errors: [error('which'), error('keyCode')],
		},
		{
			code: outdent`
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
		},
		{
			code: outdent`
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
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 13) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'Enter') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 38) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowUp') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 40) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowDown') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 37) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowLeft') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 39) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === 'ArrowRight') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 221) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ']') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 186) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ';') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 187) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '=') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 188) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ',') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 189) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '-') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 190) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '.') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 191) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '/') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 219) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '[') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 222) {
					}
				});
			`,
			output: outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '\\'') {
					}
				});
			`,
			errors: [error('keyCode')],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			window.addEventListener('click', ({which, another}) => {
				if (which === 23) {
					console.log('Wrong!')
				}
			})
		`,
		outdent`
			foo123.addEventListener('click', event => {
				if (event.keyCode === 27) {
				}
			});
		`,
	],
});
