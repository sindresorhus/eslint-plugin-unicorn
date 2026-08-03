import test from 'ava';
import {Linter} from 'eslint';
import {parsers, getTester} from './utils/test.js';

const {test: ruleTest, rule} = getTester(import.meta);

ruleTest.snapshot({
	valid: [
		'const value = () => foo;',
		'const value = () =>\n\t\tfoo;',
		'const value = () => {\n\t\tfoo();\n\t\treturn bar;\n\t};',
		'const value = () => { /* Keep this block. */ return foo; };',
		'const value = () => { return; };',
		'const value = () => /* Keep this comment. */\n\t\tfoo(\n\t\t\tbar,\n\t\t);',
		'const value = () => foo(\n\t\t/* Keep this comment. */\n\t\tbar,\n\t);',
		'export const value = () => foo;',
		'const value = () => {\n\t\treturn {\n\t\t\tfoo: bar,\n\t\t};\n\t};',
		'const value = () => {\n\t\treturn (\n\t\t\tfoo\n\t\t);\n\t};',
		'const value = () => {\n\t\treturn (foo,\n\t\t\tbar);\n\t};',
		'const value = () => { return (\u2028foo\u2028); };',
		'const value = () => { return (\u2029foo\u2029); };',
	],
	invalid: [
		'const value = () => foo(\n\t\tbar,\n\t);',
		'const value = () =>\n\tfoo(\n\t\tbar,\n\t);',
		'const value = () => (\n\t\tfoo\n\t);',
		'const value = () => (\n\t\tfoo(\n\t\t\tbar,\n\t\t)\n\t);',
		'const value = () => ({\n\t\tfoo: bar,\n\t});',
		'const value = () => ({\n\tfoo: bar,\n});',
		'const value = () =>\n\t({\n\t\tfoo: bar,\n\t});',
		'const value = () => `foo\nbar`;',
		'const value = () => {\n\t\treturn foo;\n\t};',
		'const value = () => {\n\t\treturn {};\n\t};',
		'const value = () => {\n\t\treturn (foo, bar);\n\t};',
		'const value = () => {\n\t\treturn foo, bar;\n\t};',
		'for (const value = () => {\n\t\treturn foo in bar;\n\t}; ; ) {}',
		'const values = [\n\t\t() => foo(\n\t\t\tbar,\n\t\t),\n\t\t() => {\n\t\t\treturn baz;\n\t\t},\n\t];',
		'const value = () => {\n\t\treturn foo;\n\t}\n[bar];',
		'const value = () => {\n\t\treturn this;\n\t}\n[bar];',
		'const value = () => {\n\t\treturn function () {};\n\t}\n[bar];',
		'const value = () => {\n\t\treturn foo;\n\t}\n/bar/.test(value);',
		'const value = () => {\n\t\treturn foo;\n\t}\n`bar`;',
		'const value = () => { return foo; } ** bar;',
		String.raw`const value = () => 'foo\
bar';`,
	],
});

ruleTest({
	valid: [
		'const value = () => { return (foo /* Keep this comment. */); };',
	],
	invalid: [{
		code: 'const value = () => {\n\t\treturn {foo: bar}.foo;\n\t};',
		output: 'const value = () => ({foo: bar}.foo);',
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = () => {\n\t\treturn {foo: bar}[key];\n\t};',
		output: 'const value = () => ({foo: bar}[key]);',
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = () => {\n\t\treturn foo;\n\t}\n(foo);',
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = () => {\n\t\treturn foo;\n\t}\n+bar;',
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = () => {\n\t\treturn foo;\n\t}\n-bar;',
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn (foo, bar) as Foo;\n\t};',
		output: 'const value = (): Foo => ((foo, bar) as Foo);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn (foo, bar) satisfies Foo;\n\t};',
		output: 'const value = (): Foo => ((foo, bar) satisfies Foo);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn (foo, bar)!;\n\t};',
		output: 'const value = (): Foo => ((foo, bar)!);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn ((foo, bar) as Foo)!;\n\t};',
		output: 'const value = (): Foo => (((foo, bar) as Foo)!);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn <Foo>foo, bar;\n\t};',
		output: 'const value = (): Foo => (<Foo>foo, bar);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = (): Foo => {\n\t\treturn <Foo>(foo, bar);\n\t};',
		output: 'const value = (): Foo => <Foo>(foo, bar);',
		languageOptions: {parser: parsers.typescript},
		errors: [{messageId: 'useImplicitReturn'}],
	}, {
		code: 'const value = () => foo(\n\t() => {\n\t\treturn bar;\n\t},\n);',
		output: 'const value = () => {\n\treturn foo(\n\t\t() => {\n\t\t\treturn bar;\n\t\t},\n\t);\n};',
		errors: [
			{messageId: 'useExplicitReturn'},
			{messageId: 'useImplicitReturn'},
		],
	}, {
		code: 'const value = () =>\n\t`foo\nbar`;',
		output: 'const value = () => {\n\treturn `foo\nbar`;\n};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const value = () => foo(\r\n\t\tbar,\r\n\t);',
		output: 'const value = () => {\r\n\treturn foo(\r\n\t\t\tbar,\r\n\t\t);\r\n};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const values = [\r\t() => foo(\r\t\tbar,\r\t),\r];',
		output: 'const values = [\r\t() => {\r\t\treturn foo(\r\t\t\tbar,\r\t\t);\r\t},\r];',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const first = 1;\nconst value = () => foo(\r\n\t\tbar,\r\n\t);',
		output: 'const first = 1;\nconst value = () => {\r\n\treturn foo(\r\n\t\t\tbar,\r\n\t\t);\r\n};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const value = () => foo(\r\n\t\tbar,\n\t\tbaz,\r\n\t);',
		output: 'const value = () => {\r\n\treturn foo(\r\n\t\t\tbar,\n\t\t\tbaz,\r\n\t\t);\r\n};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const value = () => foo(\u2028\t\tbar,\u2028\t);',
		output: 'const value = () => {\u2028\treturn foo(\u2028\t\t\tbar,\u2028\t\t);\u2028};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const value = () => foo(\u2029\t\tbar,\u2029\t);',
		output: 'const value = () => {\u2029\treturn foo(\u2029\t\t\tbar,\u2029\t\t);\u2029};',
		errors: [{messageId: 'useExplicitReturn'}],
	}, {
		code: 'const value = () => foo(\r\t\tbar,\r\t);',
		output: 'const value = () => {\r\treturn foo(\r\t\t\tbar,\r\t\t);\r};',
		errors: [{messageId: 'useExplicitReturn'}],
	}],
});

test('fixes nested arrows in multiple passes', t => {
	const code = 'const value = () => foo(\n\t() => {\n\t\treturn bar;\n\t},\n);';
	const linter = new Linter({configType: 'flat'});
	const result = linter.verifyAndFix(code, {
		languageOptions: {ecmaVersion: 'latest'},
		plugins: {
			test: {
				rules: {
					'consistent-arrow-return-style': rule,
				},
			},
		},
		rules: {
			'test/consistent-arrow-return-style': 'error',
		},
	});

	t.is(result.output, 'const value = () => {\n\treturn foo(\n\t\t() => bar,\n\t);\n};');
	t.deepEqual(result.messages, []);
});

ruleTest.snapshot({
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
		'const Div = () => <div />;',
		'const Div = () => {\n\t\treturn (\n\t\t\t<>\n\t\t\t\t<div />\n\t\t\t</>\n\t\t);\n\t};',
	],
	invalid: [
		'const Div = () => (\n\t\t<>\n\t\t\t<div />\n\t\t</>\n\t);',
		'const Div = () => (\n\t<div>\n\t\ttext\n\t</div>\n);',
		'const value = () => {\n\t\treturn foo;\n\t}\n<div />;',
	],
});

ruleTest({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [],
	invalid: [{
		code: 'const Div = () =>\n\t<div>\n\t\ttext\n\t</div>;',
		output: 'const Div = () => {\n\treturn <div>\n\t\ttext\n\t</div>;\n};',
		errors: [{messageId: 'useExplicitReturn'}],
	}],
});

ruleTest.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'const value = (input: string): string => input;',
		'const value = (input: string): string =>\n\t\tinput;',
	],
	invalid: [
		'const value = (input: string): string => getValue(\n\t\tinput,\n\t);',
		'const value = (\n\tcallback: (\n\t\tinput: string,\n\t) => string,\n): string => getValue(\n\t\tinput,\n\t);',
		'const value = (input: string): string => {\n\t\treturn input;\n\t};',
		'const value = (): Foo => {\n\t\treturn {} as Foo;\n\t};',
		'const value = (): Foo => {\n\t\treturn {} satisfies Foo;\n\t};',
		'const value = (): Foo => {\n\t\treturn {}!;\n\t};',
	],
});
