import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const SUGGESTION_MESSAGE_ID = 'prefer-keyboard-event-key/suggestion';

const error = key => ({
	messageId: 'prefer-keyboard-event-key',
	data: {name: key},
});

const errorWithSuggestion = (key, keyboardKey, output) => ({
	...error(key),
	suggestions: [{
		messageId: SUGGESTION_MESSAGE_ID,
		data: {key: keyboardKey},
		output,
	}],
});

test({
	valid: [
		{
			code: 'element.addEventListener("click", (event: MouseEvent) => event.keyCode);',
			languageOptions: {parser: parsers.typescript},
		},
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
			const {a: keyCode} = e;
		});`,
		`foo.addEventListener('click', e => {
			const {a: charCode} = e;
		});`,
		`foo.addEventListener('click', e => {
			const {a: which} = e;
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
		`editor.on('keyup', (editor, event) => {
			if (event.keyCode === 27) {}
		});`,
		{
			code: outdent`
				const input = <input onClick={event => {
					if (event.keyCode === 27) {}
				}} />;
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
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
			// Loose `==` comparison is handled like `===`
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.keyCode == 27) {}
				});
			`,
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key == 'Escape') {}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.which == 13) {}
				});
			`,
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key == 'Enter') {}
				});
			`,
			errors: [error('which')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.keyCode === 65) {}
				});
			`,
			errors: [errorWithSuggestion('keyCode', 'A', outdent`
				foo.addEventListener('click', event => {
					if (event.key === 'A') {}
				});
			`)],
		},
		// Make sure `\n` is escaped
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.charCode === 10) {}
				});
			`,
			errors: [error('charCode')],
		},
		// `keyCode` 10 is the numpad Enter key, whose `key` is `Enter`, not `\n`
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.keyCode === 10) {}
				});
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				foo.addEventListener('click', event => {
					if (event.which === 91) {}
				});
			`,
			output: outdent`
				foo.addEventListener('click', event => {
					if (event.key === 'Meta') {}
				});
			`,
			errors: [error('which')],
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
					const {keyCode: code, a, b} = e;
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
			errors: [errorWithSuggestion('keyCode', ']', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ']') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 186) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', ';', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ';') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 187) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '=', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '=') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 188) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', ',', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === ',') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 189) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '-', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '-') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 190) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '.', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '.') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 191) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '/', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '/') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 219) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '[', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '[') {
					}
				});
			`)],
		},
		{
			code: outdent`
				foo123.addEventListener('click', event => {
					if (event.keyCode === 222) {
					}
				});
			`,
			errors: [errorWithSuggestion('keyCode', '\'', outdent`
				foo123.addEventListener('click', event => {
					if (event.key === '\\'') {
					}
				});
			`)],
		},
	],
});

test.typescript({
	valid: [
		outdent`
			function handleKeyDown(event: KeyboardEvent) {
				if (event.key === 'K') {}
			}
		`,
		outdent`
			function handleClick(event: MouseEvent) {
				if (event.keyCode === 75) {}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				function handleKeyDown(event: KeyboardEvent) {
					if (event.keyCode === 75) {}
				}
			`,
			errors: [
				errorWithSuggestion('keyCode', 'K', outdent`
					function handleKeyDown(event: KeyboardEvent) {
						if (event.key === 'K') {}
					}
				`),
			],
		},
		{
			code: outdent`
				const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
					if (event.which === 13) {}
				};
			`,
			errors: [
				errorWithSuggestion('which', 'Enter', outdent`
					const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
						if (event.key === 'Enter') {}
					};
				`),
			],
		},
		{
			code: outdent`
				const handleKeyPress = (event: KeyboardEvent) => {
					if (event.charCode === 65) {}
				};
			`,
			errors: [
				errorWithSuggestion('charCode', 'A', outdent`
					const handleKeyPress = (event: KeyboardEvent) => {
						if (event.key === 'A') {}
					};
				`),
			],
		},
		{
			code: outdent`
				function handleKeyDown({keyCode}: KeyboardEvent) {
					console.log(keyCode);
				}
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				const handleKeyDown = ({keyCode: code}: KeyboardEvent) => {
					console.log(code);
				};
			`,
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				const input = <input onKeyDown={event => {
					if (event.keyCode === 27) {}
				}} />;
			`,
			filename: 'input.tsx',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			errors: [
				errorWithSuggestion('keyCode', 'Escape', outdent`
					const input = <input onKeyDown={event => {
						if (event.key === 'Escape') {}
					}} />;
				`),
			],
		},
		{
			code: outdent`
				const input = <input onKeyDown={({keyCode}) => {
					console.log(keyCode);
				}} />;
			`,
			filename: 'input.tsx',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			errors: [error('keyCode')],
		},
		{
			code: outdent`
				const input = <input onKeyUp={function (event) {
					if (event.keyCode === 13) {}
				}} />;
			`,
			filename: 'input.tsx',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			errors: [
				errorWithSuggestion('keyCode', 'Enter', outdent`
					const input = <input onKeyUp={function (event) {
						if (event.key === 'Enter') {}
					}} />;
				`),
			],
		},
		{
			code: outdent`
				const input = <input onKeyPress={event => {
					if (event.keyCode === 32) {}
				}} />;
			`,
			filename: 'input.tsx',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
			errors: [
				errorWithSuggestion('keyCode', ' ', outdent`
					const input = <input onKeyPress={event => {
						if (event.key === ' ') {}
					}} />;
				`),
			],
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

// The numeric keypad shares its code points with the main row but has its own `key` values
test({
	valid: [],
	invalid: [
		...[
			96,
			97,
			99,
			103,
			107,
			109,
			111,
		].flatMap(keyCode => [
			{
				code: `element.addEventListener('keydown', event => { if (event.keyCode === ${keyCode}) {} });`,
				errors: 1,
			},
			{
				code: `element.addEventListener('keydown', event => { if (event.which === ${keyCode}) {} });`,
				errors: 1,
			},
		]),
		// A character key depends on Shift, CapsLock, and the keyboard layout, so it is only suggested
		{
			code: 'element.addEventListener(\'keydown\', event => { if (event.keyCode === 65) {} });',
			errors: [errorWithSuggestion('keyCode', 'A', 'element.addEventListener(\'keydown\', event => { if (event.key === \'A\') {} });')],
		},
		// Only a digit or an uppercase letter has a `keyCode` equal to its code point, `192` is the backquote key and `124` is `F13`
		...[
			124,
			192,
			226,
		].map(keyCode => ({
			code: `element.addEventListener('keydown', event => { if (event.keyCode === ${keyCode}) {} });`,
			errors: 1,
		})),
		// `charCode` is the code point of the typed character
		{
			code: 'element.addEventListener(\'keypress\', event => { if (event.charCode === 97) {} });',
			output: 'element.addEventListener(\'keypress\', event => { if (event.key === \'a\') {} });',
			errors: 1,
		},
		{
			code: 'element.addEventListener(\'keypress\', event => { if (event.charCode === 233) {} });',
			output: 'element.addEventListener(\'keypress\', event => { if (event.key === \'é\') {} });',
			errors: 1,
		},
		// `charCode` 112 is `p` and 46 is `.`, not the `F1` and `Delete` keys of `keyCode`
		{
			code: 'element.addEventListener(\'keypress\', event => { if (event.charCode === 112) {} });',
			output: 'element.addEventListener(\'keypress\', event => { if (event.key === \'p\') {} });',
			errors: 1,
		},
		{
			code: 'element.addEventListener(\'keypress\', event => { if (event.charCode === 46) {} });',
			output: 'element.addEventListener(\'keypress\', event => { if (event.key === \'.\') {} });',
			errors: 1,
		},
		{
			code: 'element.addEventListener(\'keypress\', event => { if (event.charCode === 13) {} });',
			output: 'element.addEventListener(\'keypress\', event => { if (event.key === \'Enter\') {} });',
			errors: 1,
		},
		// A named key and the space bar do not depend on the layout
		{
			code: 'element.addEventListener(\'keydown\', event => { if (event.keyCode === 32) {} });',
			output: 'element.addEventListener(\'keydown\', event => { if (event.key === \' \') {} });',
			errors: 1,
		},
	],
});
