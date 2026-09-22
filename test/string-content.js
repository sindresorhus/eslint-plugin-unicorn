import outdent from 'outdent';
import {getTester, parsers, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const SUGGESTION_MESSAGE_ID = 'replace';

const patterns = {
	unicorn: {
		suggest: '🦄',
	},
	awesome: {
		suggest: '😎',
	},
	quote: {suggest: '\'"'},
};

const noToYesPattern = {
	no: {
		suggest: 'yes',
	},
};

const createError = (match, suggest) => [
	{
		message: `Prefer \`${suggest}\` over \`${match}\`.`,
		suggestions: undefined,
	},
];

const createSuggestionError = (match, suggest, output) => [
	{
		message: `Prefer \`${suggest}\` over \`${match}\`.`,
		suggestions: [
			{
				messageId: SUGGESTION_MESSAGE_ID,
				data: {
					match,
					suggest,
				},
				output,
			},
		],
	},
];

test({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'const foo = "";',
		...[
			// `Literal` string
			'const foo = \'🦄\';',
			// Not `a string`
			'const foo = 0;',
			// Not `Literal`
			'const foo = bar;',
			/* eslint-disable no-template-curly-in-string */
			// `TemplateLiteral`
			'const foo = `🦄`',
			// Should not escape
			'const foo = `\\`\\${1}`',
			// Ignored
			outdent`
				const foo = gql\`{
					field(input: 'no')
				}\`;
			`,
			outdent`
				const foo = styled.div\`
					background: url('no')
				\`;
			`,
			outdent`
				const foo = html\`
					<div class='test'>no</div>
				\`;
			`,
			outdent`
				const foo = sql\`
					SELECT * FROM users WHERE email = 'no'
				\`;
			`,
			outdent`
				const foo = svg\`
					<svg xmlns="http://www.w3.org/2000/svg"><text>no</text></svg>
				\`;
			`,
			/* eslint-enable no-template-curly-in-string */
		].map(code => ({
			code,
			options: [{patterns: noToYesPattern}],
		})),
		// `caseSensitive` - default (true) should not match different case
		{
			code: 'const foo = "NO"',
			options: [{patterns: noToYesPattern}],
		},
	],
	invalid: [
		// `Literal` string
		{
			code: 'const foo = \'no\'',
			output: 'const foo = \'yes\'',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// Custom patterns
		{
			code: 'const foo = \'unicorn\'',
			output: 'const foo = \'🦄\'',
			options: [{patterns}],
			errors: createError('unicorn', '🦄'),
		},
		// Escape single quote
		{
			code: 'const foo = \'quote\'',
			output: String.raw`const foo = '\'"'`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: String.raw`const foo = '\\quote\\'`,
			output: String.raw`const foo = '\\\'"\\'`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		// Escape double quote
		{
			code: 'const foo = "quote"',
			output: String.raw`const foo = "'\""`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: String.raw`const foo = "\\quote\\"`,
			output: String.raw`const foo = "\\'\"\\"`,
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		// Not fix
		{
			code: 'const foo = "unicorn"',
			options: [{patterns: {unicorn: {...patterns.unicorn, fix: false}}}],
			errors: createSuggestionError(
				'unicorn',
				'🦄',
				'const foo = "🦄"',
			),
		},
		// Conflict patterns
		{
			code: 'const foo = "a"',
			output: 'const foo = "A"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A'),
		},
		{
			code: 'const foo = "A"',
			output: 'const foo = "a"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('A', 'a'),
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "AA"',
			options: [{patterns: {a: 'A', A: 'a'}}],
			errors: createError('a', 'A'),
		},
		{
			code: 'const foo = "aA"',
			output: 'const foo = "aa"',
			options: [{patterns: {A: 'a', a: 'A'}}],
			errors: createError('A', 'a'),
		},

		// Escaped pattern
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "_______"',
			options: [{patterns: {'.': '_'}}], // <- not escaped
			errors: createError('.', '_'),
		},
		{
			code: 'const foo = "foo.bar"',
			output: 'const foo = "foo_bar"',
			options: [{patterns: {'\\.': '_'}}], // <- escaped
			errors: createError(String.raw`\.`, '_'),
		},

		// Custom message
		{
			code: 'const foo = "foo"',
			output: 'const foo = "bar"',
			options: [{patterns: {foo: {suggest: 'bar', message: '`bar` is better than `foo`.'}}}],
			errors: [{message: '`bar` is better than `foo`.'}],
		},

		// Should not crash on multiline string
		// https://github.com/avajs/ava/blob/7f99aef61f3aed2389ca9407115ad4c9aecada92/test/assert.js#L1477
		{
			code: String.raw`const foo = "no\n"`,
			output: String.raw`const foo = "yes\n"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// https://github.com/sindresorhus/execa/blob/df08cfb2d849adb31dc764ca3ab5f29e5b191d50/test/error.js#L20
		{
			code: String.raw`const foo = "no\r"`,
			output: String.raw`const foo = "yes\r"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},

		/* eslint-disable no-template-curly-in-string */
		// `TemplateLiteral`
		{
			code: 'const foo = `no`',
			output: 'const foo = `yes`',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// `TemplateElement` position
		{
			code: 'const foo = `no${foo}no${foo}no`',
			output: 'const foo = `yes${foo}yes${foo}yes`',
			options: [{patterns: noToYesPattern}],
			errors: Array.from({length: 3}, () => createError('no', 'yes')[0]),
		},
		{
			code: 'const foo = `no\r\n${foo}no`',
			output: 'const foo = `yes\r\n${foo}yes`',
			options: [{patterns: noToYesPattern}],
			errors: Array.from({length: 2}, () => createError('no', 'yes')[0]),
		},
		// Escape
		{
			code: 'const foo = `foo_foo`',
			output: 'const foo = `bar\\`bar_bar\\`bar`',
			options: [{patterns: {foo: 'bar`bar'}}],
			errors: createError('foo', 'bar`bar'),
		},
		{
			code: 'const foo = `foo_foo`',
			output: 'const foo = `\\${bar}_\\${bar}`',
			options: [{patterns: {foo: '${bar}'}}],
			errors: createError('foo', '${bar}'),
		},
		{
			code: 'const foo = `$foo`', // <-- not escaped $
			output: 'const foo = `\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}'),
		},
		{
			code: 'const foo = `\\\\$foo`', // <-- escaped $
			output: 'const foo = `\\\\\\${bar}`',
			options: [{patterns: {foo: '{bar}'}}],
			errors: createError('foo', '{bar}'),
		},
		// Not ignored tag
		{
			code: 'const foo = notIgnoredTag`no`',
			output: 'const foo = notIgnoredTag`yes`',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const foo = html\`
					<div>no</div>
				\`;
				const bar = notIgnoredTag\`no\`;
			`,
			output: outdent`
				const foo = html\`
					<div>no</div>
				\`;
				const bar = notIgnoredTag\`yes\`;
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: ['TaggedTemplateExpression TemplateElement'],
			}],
			errors: createError('no', 'yes'),
		},

		// Object is not `Identifier`
		{
			code: outdent`
				const foo = 'styled'[div]\`
					background: url('no')
				\`;
			`,
			output: outdent`
				const foo = 'styled'[div]\`
					background: url('yes')
				\`;
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const foo = bar.html\`
					background: url('no')
				\`;
			`,
			output: outdent`
				const foo = bar.html\`
					background: url('yes')
				\`;
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		/* eslint-enable no-template-curly-in-string */
		{
			code: outdent`
				const foo = <div className='
					no
				' />
			`,
			output: outdent`
				const foo = <div className='
					yes
				' />
			`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		// JSX attribute values can't use backslash escapes; encode the delimiter quote as an HTML entity
		{
			code: 'const foo = <div className=\'quote\' />',
			output: 'const foo = <div className=\'&#39;"\' />',
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: 'const foo = <div className="quote" />',
			output: 'const foo = <div className="\'&quot;" />',
			options: [{patterns}],
			errors: createError('quote', '\'"'),
		},
		{
			code: outdent`
				const description = 'no';
				const title = 'no';
			`,
			output: outdent`
				const description = 'yes';
				const title = 'no';
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: ['VariableDeclarator[id.name="description"] > Literal'],
			}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const description = \`no\`;
				const title = \`no\`;
			`,
			output: outdent`
				const description = \`yes\`;
				const title = \`no\`;
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: ['VariableDeclarator[id.name="description"] TemplateElement'],
			}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const metadata = {
					description: 'no',
					title: 'no',
				};
			`,
			output: outdent`
				const metadata = {
					description: 'yes',
					title: 'no',
				};
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: ['Property[key.name="description"] > Literal'],
			}],
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				type FeatureMeta = {
					description: 'no';
					title: 'no';
				};
			`,
			output: outdent`
				type FeatureMeta = {
					description: 'yes';
					title: 'no';
				};
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: ['TSPropertySignature[key.name="description"] TSLiteralType > Literal'],
			}],
			languageOptions: {
				parser: parsers.typescript,
			},
			errors: createError('no', 'yes'),
		},
		{
			code: outdent`
				const description = 'no';
				const title = 'no';
			`,
			output: outdent`
				const description = 'yes';
				const title = 'no';
			`,
			options: [{
				patterns: noToYesPattern,
				selectors: [
					'VariableDeclarator[id.name="description"] > Literal',
					'VariableDeclarator[id.name=/description/] > Literal',
				],
			}],
			errors: createError('no', 'yes'),
		},

		// `caseSensitive: false`
		{
			code: 'const foo = "End of Day"',
			output: 'const foo = "EOD"',
			options: [{patterns: {'end of day': {suggest: 'EOD', caseSensitive: false}}}],
			errors: createError('end of day', 'EOD'),
		},
		{
			code: 'const foo = "END OF DAY"',
			output: 'const foo = "EOD"',
			options: [{patterns: {'end of day': {suggest: 'EOD', caseSensitive: false}}}],
			errors: createError('end of day', 'EOD'),
		},
		// Multiple case variants in one string
		{
			code: 'const foo = "no No NO"',
			output: 'const foo = "yes yes yes"',
			options: [{patterns: {no: {suggest: 'yes', caseSensitive: false}}}],
			errors: createError('no', 'yes'),
		},
		// `caseSensitive: false` with `fix: false`
		{
			code: 'const foo = "NO"',
			options: [{patterns: {no: {suggest: 'yes', caseSensitive: false, fix: false}}}],
			errors: createSuggestionError(
				'no',
				'yes',
				'const foo = "yes"',
			),
		},
		// `caseSensitive: false` with template literal
		{
			code: 'const foo = `NO`',
			output: 'const foo = `yes`',
			options: [{patterns: {no: {suggest: 'yes', caseSensitive: false}}}],
			errors: createError('no', 'yes'),
		},
	],
});

test({
	testerOptions: {
		language: languages.toml.language,
		plugins: languages.toml.plugins,
	},
	valid: [
		{code: 'value = "no"', filename: 'example.toml'},
		...[
			'value = "yes"',
			'value = "NO"',
			'# no\n"no" = 1\n[table]\n\'no\'.value = true\n[no-table]\nvalue = 1979-05-27T07:32:00Z',
			'value = [1, 1.5, true, 1979-05-27, 07:32:00]',
			'["no"]\nvalue = { "no" = false }',
		].map(code => ({code, filename: 'example.toml', options: [{patterns: noToYesPattern}]})),
	],
	invalid: [
		...[
			'value = "no"',
			'value = \'no\'',
			'value = """no"""',
			'value = \'\'\'no\'\'\'',
			String.raw`value = "\u006E\u006F"`,
		].map(code => ({
			code,
			output: 'value = "yes"',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		})),
		{
			code: 'value = """\nno\nnext line""" # no',
			output: String.raw`value = "yes\nnext line" # no`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: 'value = \'\'\'\nno\nnext line\'\'\'',
			output: String.raw`value = "yes\nnext line"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: String.raw`value = '\no'`,
			output: String.raw`value = "\\yes"`,
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: 'value = "no"',
			output: String.raw`value = "'\"\\\n\r\t\b\f\u0000\u001f\u007F"`,
			options: [{patterns: {no: '\'"\\\n\r\t\b\f\u0000\u001F\u007F'}}],
			errors: createError('no', '\'"\\\n\r\t\b\f\u0000\u001F\u007F'),
		},
		{
			code: 'value = "unicorn"',
			output: 'value = "🦄"',
			options: [{patterns}],
			errors: createError('unicorn', '🦄'),
		},
		{
			code: 'value = ["no", { "no" = [\'no\'] }]',
			output: 'value = ["yes", { "no" = ["yes"] }]',
			options: [{patterns: noToYesPattern}],
			errors: [...createError('no', 'yes'), ...createError('no', 'yes')],
		},
		{
			code: 'description = "no"\ntitle = "no"',
			output: 'description = "yes"\ntitle = "no"',
			options: [{
				patterns: noToYesPattern,
				selectors: [
					'TOMLKeyValue[key.keys.0.name="description"] > TOMLValue',
					'TOMLKeyValue[key.keys.0.name=/description/] > TOMLValue',
				],
			}],
			errors: createError('no', 'yes'),
		},
		{
			code: 'value = "no No NO"',
			output: 'value = "yes yes yes"',
			options: [{patterns: {no: {suggest: 'yes', caseSensitive: false}}}],
			errors: createError('no', 'yes'),
		},
		{
			code: 'value = "no"',
			output: 'value = "yes"',
			options: [{patterns: {no: {suggest: 'yes', message: 'Use yes.'}}}],
			errors: [{message: 'Use yes.'}],
		},
		{
			code: 'value = \'\'\'NO\'\'\'',
			options: [{patterns: {no: {suggest: 'yes', fix: false, caseSensitive: false}}}],
			errors: createSuggestionError('no', 'yes', 'value = "yes"'),
		},
		...[true, false].map(fix => ({
			code: 'value = "no"',
			options: [{patterns: {no: {suggest: '\uD800', fix}}}],
			errors: createError('no', '\uD800'),
		})),
	].map(testCase => ({filename: 'example.toml', ...testCase})),
});

for (const languageName of ['json', 'jsonc', 'json5']) {
	const {language, plugins} = languages[languageName];
	test({
		testerOptions: {language, plugins},
		valid: [
			'"no"',
			{code: '["yes", 1, true, null]', options: [{patterns: noToYesPattern}]},
		].map(testCase => ({name: `${languageName}: ${typeof testCase === 'string' ? testCase : testCase.code}`, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
		invalid: [
			{
				code: String.raw`{"no": ["\u006eo"]}`,
				output: '{"yes": ["yes"]}',
				options: [{patterns: noToYesPattern}],
				errors: [...createError('no', 'yes'), ...createError('no', 'yes')],
			},
			{
				code: '"no"',
				output: String.raw`"\"\\\n\u0000"`,
				options: [{patterns: {no: '"\\\n\u0000'}}],
				errors: createError('no', '"\\\n\u0000'),
			},
			{
				code: '"NO"',
				options: [{patterns: {no: {suggest: 'yes', fix: false, caseSensitive: false}}}],
				errors: createSuggestionError('no', 'yes', '"yes"'),
			},
		].map(testCase => ({name: `${languageName}: ${testCase.code}`, ...testCase})),
	});
}

test.snapshot({
	valid: [],
	invalid: [{code: String.raw`{'\u006eo': 'no'}`, language: languages.json5, options: [{patterns: noToYesPattern}]}],
});

test({
	testerOptions: {language: languages.json5.language, plugins: languages.json5.plugins},
	valid: [],
	invalid: [{
		code: '\'no\'',
		output: '"yes\u2028\u2029"',
		options: [{patterns: {no: 'yes\u2028\u2029'}}],
		errors: createError('no', 'yes\u2028\u2029'),
	}],
});

test.snapshot({
	valid: [
		'a { content: "yes"; font-family: no; } /* no */',
		'.no { --no: no; }',
		{code: 'a { content: "no"; }', options: []},
		{code: 'a { content: "no"; }', options: [{patterns: noToYesPattern, selectors: ['Url']}]},
	].map(testCase => ({language: languages.css, options: [{patterns: noToYesPattern}], ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
	invalid: [
		'a { content: "no"; font-family: "no"; }',
		'a[data-name="no"] { background: url(no.png); }',
		String.raw`a { content: "\6e o"; background: url("\6e o.png"); }`,
		'a { content: \'no\'; background: url( no.png ); }',
		{code: 'a { content: "no"; background: url(no); }', options: [{patterns: {no: '\'"\\\n\r\f\t() a'}}]},
		{code: 'a { content: "NO"; background: url(no); }', options: [{patterns: {no: {suggest: 'yes', fix: false, caseSensitive: false}}}]},
		{code: 'a { content: "no"; background: url(no); }', options: [{patterns: noToYesPattern, selectors: ['Url']}]},
		{code: '{unquoted: "no", "no": \'no\'}', language: languages.json5},
	].map(testCase => ({language: languages.css, options: [{patterns: noToYesPattern}], ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
});

test({
	testerOptions: {language: languages.css.language, plugins: languages.css.plugins},
	valid: [],
	invalid: [true, false].flatMap(fix => ['\u0000', '\uD800'].map(suggest => ({
		name: `CSS unrepresentable replacement ${JSON.stringify(suggest)}, fix: ${fix}`,
		code: 'a { content: "no"; background: url(no); }',
		options: [{patterns: {no: {suggest, fix}}}],
		errors: [...createError('no', suggest), ...createError('no', suggest)],
	}))),
});

test({
	testerOptions: {language: languages.css.language, plugins: languages.css.plugins},
	valid: [
		{code: 'a { --message: "no"; --image: url(no); }', options: [{patterns: noToYesPattern}]},
	],
	invalid: [true, false].map(fix => ({
		name: `CSS URL comment preservation, fix: ${fix}`,
		code: 'a { background: url("no"/* keep */); }',
		options: [{patterns: {no: {suggest: 'yes', fix}}}],
		errors: createError('no', 'yes'),
	})),
});

test({
	testerOptions: {language: languages.yaml.language, plugins: languages.yaml.plugins},
	valid: [
		'value: |\n  no\n',
		'value: >\n  no\n',
		'value: !!str no',
		'value: [1, true, null]',
		'# no\nvalue: yes',
	].map(code => ({code, options: [{patterns: noToYesPattern}]})),
	invalid: [
		...['value: no', 'value: \'no\''].map(code => ({
			code,
			output: 'value: "yes"',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		})),
		{
			code: 'no: ["no"] # no',
			output: '"yes": ["yes"] # no',
			options: [{patterns: noToYesPattern}],
			errors: [...createError('no', 'yes'), ...createError('no', 'yes')],
		},
		{
			code: String.raw`value: &message "\u006eo"`,
			output: 'value: &message "yes"',
			options: [{patterns: noToYesPattern}],
			errors: createError('no', 'yes'),
		},
		{
			code: 'value: NO',
			options: [{patterns: {no: {suggest: 'yes', caseSensitive: false, fix: false}}}],
			errors: createSuggestionError('no', 'yes', 'value: "yes"'),
		},
		{
			code: 'value: no',
			output: String.raw`value: "\"\\\n\u0000\u007f\u0085\u2028\uffff"`,
			options: [{patterns: {no: '"\\\n\u0000\u007F\u0085\u2028\uFFFF'}}],
			errors: createError('no', '"\\\n\u0000\u007F\u0085\u2028\uFFFF'),
		},
		{
			code: 'value: no',
			options: [{patterns: {no: '\uD800'}}],
			errors: createError('no', '\uD800'),
		},
	],
});
