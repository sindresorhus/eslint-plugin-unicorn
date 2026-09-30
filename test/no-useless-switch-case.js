import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			switch (foo) {
				case a:
				case b:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
					break;
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					break;
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
					handleCaseA();
					// Fallthrough
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				default:
					handleDefaultCase();
					break;
				case b:
					handleCaseB();
					break;
			}
		`,
		outdent`
			switch (1) {
					// This is not useless
					case 1:
					default:
							console.log('1')
					case 1:
							console.log('2')
			}
		`,
		{
			code: outdent`
				switch (foo) {
					case undefined:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				switch (foo) {
					case null:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				switch (foo) {
					case null:
					case undefined:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			switch (foo) {
				case undefined:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case null:
				default:
					handleDefaultCase();
					break;
			}
		`,
		{
			code: outdent`
				switch (foo) {
					case a:
					case undefined:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				switch (foo) {
					case undefined:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.js',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				switch (foo) {
					case a:
					default:
						handleDefaultCase();
						break;
				}
			`,
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			switch (foo) {
				case a:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a: {
				}
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a: {
					;;
					{
						;;
						{
							;;
						}
					}
				}
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case (( b ))         :
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case b:
					handleCaseAB();
					break;
				case d:
				case d:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				// eslint-disable-next-line
				case a:
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
		outdent`
			switch (foo) {
				case a:
				// eslint-disable-next-line
				case b:
				default:
					handleDefaultCase();
					break;
			}
		`,
		// `switch` evaluates every case test it reaches, so removing the case would drop the side effect. No suggestion.
		'switch (a) {case probe(): default: break;}',
		'switch (a) {case i++: default: break;}',
		'switch (a) {case (x = 3): default: break;}',
		// A side-effect free test can be removed. Getters are not considered side effects.
		'switch (a) {case obj.property: default: break;}',
		'switch (a) {case b: default: break;}',
		'switch (a) {case "x": default: break;}',
	],
});

// The suggestion removes the whole case, so it is not offered when a comment is in the case
test({
	valid: [],
	invalid: [
		...[
			'switch (foo) {\n\tcase /* keep */ undefined:\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
			'switch (foo) {\n\tcase undefined /* keep */:\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
			'switch (foo) {\n\tcase undefined: { /* keep */ }\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
		].map(code => ({code, errors: [{messageId: 'no-useless-switch-case/error', suggestions: []}]})),
		// A comment after the case is outside the removed range, so it is kept
		{
			code: 'switch (foo) {\n\tcase undefined:\n\t\t/* keep */\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
			errors: [
				{
					messageId: 'no-useless-switch-case/error',
					suggestions: [
						{
							messageId: 'no-useless-switch-case/suggestion',
							output: 'switch (foo) {\n\t\n\t\t/* keep */\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
						},
					],
				},
			],
		},
	],
});

// `case void 0:` is the same value as `case undefined:`
test({
	valid: [
		{
			code: 'switch (foo) {\n\tcase void 0:\n\tdefault:\n\t\thandle();\n\t\tbreak;\n}',
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
});
