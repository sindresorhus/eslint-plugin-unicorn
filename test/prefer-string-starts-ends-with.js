import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {transpileModule, ScriptTarget} from 'typescript';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {{decodeURI: () => string[]}} value */ function run(value) { return value.decodeURI().indexOf("a") === 0; }',
			'/** @param {Date} value */ function run(value) { return value.toJSON().indexOf("2026") === 0; }',
			'/** @param {?Date} value */ function run(value) { return value.toISOString().indexOf("2026") === 0; }',
			'/** @param {{toISOString: () => number[]}} value */ function run(value) { return value.toISOString().indexOf(2026) === 0; }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			...['encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent', 'atob', 'btoa'].map(name => ({
				filename: 'file.ts',
				code: `/** @param {unknown} value */ function run(value) { return ${name}(value).indexOf("a") === 0; }`,
				output: `/** @param {unknown} value */ function run(value) { return ${name}(value).startsWith("a"); }`,
				errors: [{messageId: 'prefer-starts-with-indexOf'}],
			})),
			{
				filename: 'file.ts',
				code: '/** @param {Date} value */ function run(value) { return value.toISOString().indexOf("2026") === 0; }',
				output: '/** @param {Date} value */ function run(value) { return value.toISOString().startsWith("2026"); }',
				errors: [{messageId: 'prefer-starts-with-indexOf'}],
			},
		],
	});
}

test({
	valid: [
		'/** @param {number[]} value */ function run(value) { return value.indexOf("a") === 0; }',
	],
	invalid: [{
		code: '/** @param {string} value */ function run(value) { return value.indexOf("a") === 0; }',
		output: '/** @param {string} value */ function run(value) { return value.startsWith("a"); }',
		errors: [{messageId: 'prefer-starts-with-indexOf'}],
	}],
});

test({
	valid: [],
	invalid: [
		['(/* keep */ "abc").indexOf("a") === 0;', '(/* keep */ "abc").startsWith("a");'],
		['"abc".indexOf((/* keep */ "a")) !== 0;', '!"abc".startsWith((/* keep */ "a"));'],
		['"abc".slice(-1) === (/* keep */ "c");', '"abc".endsWith((/* keep */ "c"));'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [],
	invalid: [
		...[
			['0 === (("abc" /* keep */)).indexOf("a");', '(("abc" /* keep */)).startsWith("a");'],
			['"abc".slice(0, 1) != ("a" // keep\r\n);', '!"abc".startsWith(("a" // keep\r\n));'],
			['before()\n0 === (/* keep */ "abc").indexOf("a");', 'before()\n;(/* keep */ "abc").startsWith("a");'],
		].map(([code, output]) => ({code, output, errors: 1})),
		...[
			['(text as /* keep */ string).indexOf("a") === 0;', '(text as /* keep */ string).startsWith("a");'],
			[
				'function f(text: string, prefix: string) { return text.slice(0, prefix.length) === (prefix as /* keep */ string); }',
				'function f(text: string, prefix: string) { return text.startsWith((prefix as /* keep */ string)); }',
			],
		].map(([code, output]) => ({
			code, output, languageOptions: {parser: parsers.typescript}, errors: 1,
		})),
		...[
			'"abc"./* discard */indexOf("a") === 0;',
			'"abc".indexOf(/* discard */ "a") === 0;',
			'("abc".indexOf("a") /* discard */) === 0;',
			'"abc".slice(0, /* discard */ 1) === (/* keep */ "a");',
			'"abc".slice(0, 1) /* discard */ === (/* keep */ "a");',
		].map(code => ({code, errors: 1})),
	],
});

test({
	valid: [],
	invalid: [
		['/^a/.test({value: "abc"}.value);', '({value: "abc"}.value).startsWith(\'a\');'],
		['/c$/.test({value: "abc"}.value);', '({value: "abc"}.value).endsWith(\'c\');'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

const linter = new Linter();
const keywordConfig = {
	plugins: {unicorn: {rules: {'prefer-string-starts-ends-with': rule}}},
	rules: {'unicorn/prefer-string-starts-ends-with': 'error'},
};

const getSliceSuggestion = (t, code, languageOptions) => {
	const {output, fixed, messages} = linter.verifyAndFix(code, {...keywordConfig, ...(languageOptions && {languageOptions})});
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const [{fix}] = messages[0].suggestions;
	const suggestion = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.deepStrictEqual(linter.verify(suggestion, {...keywordConfig, ...(languageOptions && {languageOptions})}), []);
	return suggestion;
};

const getKeywordOutput = (t, code, languageOptions) => {
	const {output, fixed, messages} = linter.verifyAndFix(code, {...keywordConfig, ...(languageOptions && {languageOptions})});
	t.assert.strictEqual(fixed, true);
	t.assert.deepStrictEqual(messages, []);
	return output;
};

nodeTest('comment-preserving string boundary edits evaluate operands once in order', t => {
	for (const [expression, expectedEvents] of [
		['String(read(/* receiver */)).indexOf(String(search(/* search */))) === 0;', ['receiver', 'search']],
		['String(read(/* receiver */)).slice(0, 1) === (/* search */ "a");', ['receiver']],
		['String(read(/* receiver */)).slice(-1) !== (/* search */ "a");', ['receiver']],
	]) {
		const output = getKeywordOutput(t, expression);
		for (const value of ['abc', 'xbc', '']) {
			const execute = source => {
				const events = [];
				const result = runInNewContext(source, {
					read() {
						events.push('receiver');
						return value;
					},
					search() {
						events.push('search');
						return 'a';
					},
				});
				t.assert.deepStrictEqual(events, expectedEvents);
				return result;
			};

			t.assert.strictEqual(execute(output), execute(expression));
		}
	}
});

nodeTest('comment-preserving reversed string boundary edits remain suggestions when value capture changes', t => {
	const code = 'let needle: string = "a"; function read() { needle = "ab"; return "ab"; } (/* search */ needle) === String(read(/* receiver */)).slice(0, needle.length);';
	const output = getSliceSuggestion(t, code, {parser: parsers.typescript.implementation});
	t.assert.strictEqual(output, 'let needle: string = "a"; function read() { needle = "ab"; return "ab"; } String(read(/* receiver */)).startsWith((/* search */ needle));');
	const execute = source => runInNewContext(transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}}).outputText);
	t.assert.strictEqual(execute(code), false);
	t.assert.strictEqual(execute(output), true);
});

const sliceCase = (code, output, options) => ({
	code,
	...options,
	output,
	errors: [{messageId: output.includes('.endsWith(') ? 'prefer-ends-with-slice' : 'prefer-starts-with-slice'}],
});

for (const operator of ['===', '!==', '==', '!=']) {
	nodeTest(`reversed slice suggestions expose the changed value capture for ${operator}`, t => {
		const code = outdent`
			const events = [];
			let needle: string = "a";
			function value() { events.push("receiver"); needle = "ab"; return "ab"; }
			const result = needle ${operator} String(value()).slice(0, needle.length);
			JSON.stringify({result, events});
		`;
		const suggestion = getSliceSuggestion(t, code, {parser: parsers.typescript.implementation});
		const negate = operator.includes('!');
		const expected = outdent`
			const events = [];
			let needle: string = "a";
			function value() { events.push("receiver"); needle = "ab"; return "ab"; }
			const result = ${negate ? '!' : ''}String(value()).startsWith(needle);
			JSON.stringify({result, events});
		`;
		t.assert.strictEqual(suggestion, expected);
		const execute = source => runInNewContext(transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}}).outputText);
		t.assert.strictEqual(execute(code), JSON.stringify({result: negate, events: ['receiver']}));
		t.assert.strictEqual(execute(suggestion), JSON.stringify({result: !negate, events: ['receiver']}));
	});
}

nodeTest('left-side slice calls retain their autofixes and evaluation order', t => {
	for (const operator of ['===', '!==', '==', '!=']) {
		const code = 'let needle: string = "a"; function value() { needle = "ab"; return "ab"; } '
			+ `String(value()).slice(0, needle.length) ${operator} needle;`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {...keywordConfig, languageOptions: {parser: parsers.typescript.implementation}});
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		const execute = source => runInNewContext(transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}}).outputText);
		t.assert.strictEqual(execute(output), execute(code));
	}
});

const keywordBodies = [
	['return', expression => `return${expression};`],
	['throw', expression => `try { throw${expression}; } catch (value) { return value; }`],
	['yield', expression => `function* values() { yield${expression}; } return values().next().value;`],
	['case', expression => `switch (true) { case${expression}: return true; default: return false; }`],
	['of', expression => `for (const value of${expression} ? [true] : [false]) { return value; }`],
];

test({
	valid: [],
	invalid: [
		sliceCase(
			'const text = "abc"; const element = <div>{"a" === text.slice(0, 1)}</div>;',
			'const text = "abc"; const element = <div>{text.startsWith("a")}</div>;',
			{languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		),
		sliceCase('const text = "abc";\r\n("c") === (text).slice(-1);', 'const text = "abc";\r\n(text).endsWith(("c"));'),
		...[
			['const text: string = "abc"; "a" === (text as string).slice(0, 1);', 'const text: string = "abc"; (text as string).startsWith("a");'],
			['const text: string = "abc"; "c" !== text!.slice(-1);', 'const text: string = "abc"; !text!.endsWith("c");'],
			['const text: string = "abc"; "a" === (text satisfies string).slice(0, 1);', 'const text: string = "abc"; (text satisfies string).startsWith("a");'],
		].map(([code, output]) => sliceCase(code, output, {languageOptions: {parser: parsers.typescript}})),
		{
			code: 'let needle: string = "a"; function value() { needle = "ab"; return "ab"; } needle === String(value()).slice(0, needle.length);',
			filename: 'file.ts',
			languageOptions: {parser: parsers.typescript.implementation, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
			errors: [{
				messageId: 'prefer-starts-with-slice',
				suggestions: [{
					messageId: 'prefer-string-starts-ends-with/slice-suggestion',
					output: 'let needle: string = "a"; function value() { needle = "ab"; return "ab"; } String(value()).startsWith(needle);',
				}],
			}],
		},
	],
});

for (const expression of ['/^a/.test(text)', '/c$/.test(text)', '(0) === text.indexOf("a")', '("a") === text.slice(0, 1)', '("c") === text.slice(-1)']) {
	for (const [keyword, createBody] of keywordBodies) {
		nodeTest(`string boundary keyword edits preserve ${keyword}: ${expression}`, t => {
			const code = `const text = "abc"; function run() { ${createBody(expression)} } run();`;
			const output = getKeywordOutput(t, code);
			t.assert.strictEqual(runInNewContext(code), true);
			t.assert.strictEqual(runInNewContext(output), true, output);
		});
	}
}

for (const [keyword, createBody] of keywordBodies) {
	for (const suggestionIndex of [0, 1, 2]) {
		nodeTest(`string boundary keyword suggestions preserve ${keyword}: suggestion ${suggestionIndex + 1}`, t => {
			const code = `function run(text) { ${createBody('/^a/.test(text)')} } run("abc");`;
			const messages = linter.verify(code, keywordConfig);
			t.assert.strictEqual(messages.length, 1);
			t.assert.strictEqual(messages[0].suggestions.length, 3);
			const {fix} = messages[0].suggestions[suggestionIndex];
			const output = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			t.assert.strictEqual(runInNewContext(code), true);
			t.assert.strictEqual(runInNewContext(output), true, output);
			t.assert.deepStrictEqual(linter.verify(output, keywordConfig), []);
		});
	}
}

nodeTest('string boundary autofixes preserve typeof, void, and in grouping', t => {
	for (const expression of ['/^a/.test(text)', '(0) === text.indexOf("a")', '("a") === text.slice(0, 1)']) {
		for (const [body, expected] of [
			[`return typeof(${expression});`, 'boolean'],
			[`return void(${expression});`, undefined],
			[`const result = []; for (const key in${expression} ? {matched: 1} : {}) { result.push(key); } return JSON.stringify(result);`, '["matched"]'],
			[`return (${expression})in{true: 1};`, true],
		]) {
			const code = `const text = "abc"; function run() { ${body} } run();`;
			const output = getKeywordOutput(t, code);
			t.assert.strictEqual(runInNewContext(code), expected);
			t.assert.strictEqual(runInNewContext(output), expected, output);
		}
	}
});

nodeTest('regex boundary autofixes preserve direct typeof and void keyword spacing', t => {
	for (const [keyword, expected] of [['typeof', 'boolean'], ['void', undefined]]) {
		const code = `const text = "abc"; ${keyword}/^a/.test(text);`;
		const output = getKeywordOutput(t, code);
		t.assert.strictEqual(output, `const text = "abc"; ${keyword} text.startsWith('a');`);
		t.assert.strictEqual(runInNewContext(code), expected);
		t.assert.strictEqual(runInNewContext(output), expected);
	}
});

nodeTest('string boundary autofixes preserve awaited expressions', async t => {
	await Promise.all(['/^a/.test(text)', '((0) === text.indexOf("a"))', '(("a") === text.slice(0, 1))'].map(async expression => {
		const code = `const text = "abc"; async function run() { return await${expression}; } run();`;
		const output = getKeywordOutput(t, code);
		t.assert.strictEqual(await runInNewContext(code), true);
		t.assert.strictEqual(await runInNewContext(output), true, output);
	}));
});

nodeTest('string boundary autofixes preserve single evaluation of sequence receivers', t => {
	for (const expression of ['/^a/.test((calls++, "abc"))', '(0) === (calls++, "abc").indexOf("a")', '("a") === (calls++, "abc").slice(0, 1)']) {
		const code = `let calls = 0; function run() { return${expression}; } const found = run(); JSON.stringify({calls, found});`;
		const output = expression.includes('.slice(') ? getSliceSuggestion(t, code) : getKeywordOutput(t, code);
		t.assert.strictEqual(runInNewContext(code), '{"calls":1,"found":true}');
		t.assert.strictEqual(runInNewContext(output), '{"calls":1,"found":true}', output);
	}
});

nodeTest('TypeScript string boundary keyword edits preserve assertions and CRLF', t => {
	for (const expression of ['/^a/.test(text!)', '(0) === (text as string).indexOf("a")', '("a") === (text satisfies string).slice(0, 1)', '("c") === (<string>text).slice(-1)']) {
		const code = `const text: string = "abc";\r\nfunction run() {\r\n  return${expression};\r\n}\r\nrun();`;
		const output = getKeywordOutput(t, code, {parser: parsers.typescript.implementation});
		const execute = source => runInNewContext(transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}}).outputText);
		t.assert.strictEqual(execute(code), true);
		t.assert.strictEqual(execute(output), true);
		t.assert.strictEqual(output.split('\r\n').length, code.split('\r\n').length);
	}
});

test({
	valid: [],
	invalid: [
		{
			code: 'const text = "abc"; function run() { return/* keep *//^a/.test(text); }',
			output: 'const text = "abc"; function run() { return/* keep */text.startsWith(\'a\'); }',
			errors: 1,
		},
		{
			code: 'const text = "abc"; function run() { return(/^a/).test(text); }',
			output: 'const text = "abc"; function run() { return (text).startsWith(\'a\'); }',
			errors: 1,
		},
		{
			code: 'const text = "abc"; function run() { return!/^a/.test(text); }',
			output: 'const text = "abc"; function run() { return!text.startsWith(\'a\'); }',
			errors: 1,
		},
		{
			code: 'const text = "abc"; function run() { return(0) !== text.indexOf("a"); }',
			output: 'const text = "abc"; function run() { return !text.startsWith("a"); }',
			errors: 1,
		},
		sliceCase('const text = "abc"; function run() { return("c") !== text.slice(-1); }', 'const text = "abc"; function run() { return !text.endsWith(("c")); }'),
		...[
			['const text = "abc"; function run() { return /c$/.test(text); }', 'const text = "abc"; function run() { return text.endsWith(\'c\'); }'],
			['const text = "abc"; function run() { return\t(0) === text.indexOf("a"); }', 'const text = "abc"; function run() { return\ttext.startsWith("a"); }'],
			['const text = "abc"; function run() { return/* keep */("a") === text.slice(0, 1); }', 'const text = "abc"; function run() { return/* keep */text.startsWith(("a")); }'],
		].map(([code, output]) => ({code, output, errors: 1})),
		{
			code: 'const text = "abc"; const element = <div>{(0) === text.indexOf("a")}</div>;',
			output: 'const text = "abc"; const element = <div>{text.startsWith("a")}</div>;',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
			errors: 1,
		},
		{
			code: 'const text = "abc"; function run() { return(0) /* keep */ === text.indexOf("a"); }',
			errors: 1,
		},
		{
			code: 'const text = "abc"; function run() { return("a") /* keep */ === text.slice(0, 1); }',
			errors: 1,
		},
	],
});

const MESSAGE_STARTS_WITH = 'prefer-starts-with';
const MESSAGE_ENDS_WITH = 'prefer-ends-with';
const FIX_TYPE_STRING_CASTING = 'useStringCasting';
const FIX_TYPE_OPTIONAL_CHAINING = 'useOptionalChaining';
const FIX_TYPE_NULLISH_COALESCING = 'useNullishCoalescing';

const validRegex = [
	/foo/,
	/^foo$/,
	/^foo+/,
	/foo+$/,
	/^[,af]/,
	/[,af]$/,
	/^\w/,
	/\w$/,
	/^foo./,
	/foo.$/,
	/\^foo/,
	/^foo/i,
	/^foo/m,
	/^foo/im,
	/^A|B/,
	/A|B$/,
	/foo$/y,
	/foo$/gy,
];

const invalidRegex = [
	/^foo/,
	/foo$/,
	/^!/,
	/!$/,
	/^ /,
	/ $/,
	/^foo/y,
	/foo$/g,
];

nodeTest('regex flag conversions preserve matching results', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-string-starts-ends-with': rule}}},
		rules: {'unicorn/prefer-string-starts-ends-with': 'error'},
	};

	for (const pattern of ['^foo', 'foo$']) {
		for (const flags of ['', 'g', 'd', 's', 'u', 'v', 'y', 'gy', 'dsy', 'uy', 'vy']) {
			const code = `/${pattern}/${flags}.test(value)`;
			const {fixed, output, messages} = linter.verifyAndFix(code, config);
			const isStickySuffix = pattern.endsWith('$') && flags.includes('y');

			t.assert.strictEqual(fixed, !isStickySuffix, code);
			t.assert.deepStrictEqual(messages, [], code);
			if (isStickySuffix) {
				t.assert.strictEqual(output, code);
			}

			for (const value of ['', 'foo', 'xfoo', 'foox', 'foofoo', 'foo\n', '\nfoo', '😀foo']) {
				t.assert.strictEqual(runInNewContext(output, {value}), runInNewContext(code, {value}), `${code}: ${JSON.stringify(value)}`);
			}
		}
	}
});

test({
	valid: [
		'foo.startsWith("bar")',
		'foo.endsWith("bar")',

		// Ensure it doesn't crash:
		'reject(new Error("foo"))',
		'"".test()',
		'test()',
		'test.test()',
		'startWith("bar")',
		'foo()()',

		// `prefer-regexp-test` cases
		'if (foo.match(/^foo/)) {}',
		'if (/^foo/.exec(foo)) {}',

		...validRegex.map(re => `${re}.test(bar)`),

		// `indexOf` — receiver not provably a string
		'foo.indexOf("bar") === 0',
		'foo.indexOf("bar") !== 0',
		'0 === foo.indexOf("bar")',
		// Mutated variable receiver
		'let foo = "hello"; foo = 123; foo.indexOf("h") === 0',
		// `indexOf` — wrong comparison
		'foo.indexOf("bar") === 1',
		'foo.indexOf("bar") > 0',
		'foo.indexOf("bar") >= 0',
		'foo.indexOf("bar") < 0',
		'"foo".indexOf("bar") === -1',
		// `indexOf` — extra arguments
		'"foo".indexOf("bar", 1) === 0',
		// `indexOf` — optional
		'foo?.indexOf("bar") === 0',
		'foo.indexOf?.("bar") === 0',
		'"foo"?.indexOf("bar") === 0',
		'"foo".indexOf?.("bar") === 0',
		// `indexOf` — computed
		'foo["indexOf"]("bar") === 0',
		'"foo"["indexOf"]("bar") === 0',
		// `indexOf` — spread
		'"foo".indexOf(..."bar") === 0',
		// `indexOf` — `new String()` returns an object, not a string primitive
		'new String("foo").indexOf("bar") === 0',
		{
			code: 'function foo(value: number) { /^foo/.test(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(values: string[]) { return values.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: [string]) { return value.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = {indexOf(searchString: string): number}; const value: Value = {} as never; { type Value = string; value.indexOf("x") === 0; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		...invalidRegex.map(re => {
			let messageId = MESSAGE_STARTS_WITH;
			let method = 'startsWith';
			let string = re.source;

			if (string.startsWith('^')) {
				string = string.slice(1);
			} else {
				messageId = MESSAGE_ENDS_WITH;
				method = 'endsWith';
				string = string.slice(0, -1);
			}

			return {
				code: `${re}.test(bar)`,
				output: `bar.${method}('${string}')`,
				errors: [{
					messageId,
					suggestions: [
						{
							messageId: FIX_TYPE_STRING_CASTING,
							output: `String(bar).${method}('${string}')`,
						},
						{
							messageId: FIX_TYPE_OPTIONAL_CHAINING,
							output: `bar?.${method}('${string}')`,
						},
						{
							messageId: FIX_TYPE_NULLISH_COALESCING,
							output: `(bar ?? '').${method}('${string}')`,
						},
					],
				}],
			};
		}),
		{
			code: 'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); /^foo/.test(object.value ? "foo" : value)',
			output: 'const object = {value: true}; Object.defineProperty(object, "value", {get() { return false; }}); (object.value ? "foo" : value).startsWith(\'foo\')',
			errors: [{messageId: MESSAGE_STARTS_WITH, suggestions: 3}],
		},
		// String in variable. Don't autofix known, non-strings which don't have a startsWith/endsWith function.
		{
			code: 'const foo = {}; /^abc/.test(foo);',
			errors: [{messageId: MESSAGE_STARTS_WITH, suggestions: 3}],
		},
		{
			code: 'const foo = 123; /^abc/.test(foo);',
			errors: [{messageId: MESSAGE_STARTS_WITH, suggestions: 3}],
		},
		{
			code: 'const foo = "hello"; /^abc/.test(foo);',
			output: 'const foo = "hello"; foo.startsWith(\'abc\');',
			errors: [{messageId: MESSAGE_STARTS_WITH}],
		},
		{
			code: 'const value = "hello"; /^abc/.test(value satisfies {startsWith(searchString: string): boolean});',
			output: 'const value = "hello"; (value satisfies {startsWith(searchString: string): boolean}).startsWith(\'abc\');',
			errors: [{messageId: MESSAGE_STARTS_WITH}],
			languageOptions: {parser: parsers.typescript},
		},
		// Parenthesized
		{
			code: '/^b/.test((a))',
			output: '(a).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'String((a)).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: '(a)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: '((a) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: '(/^b/).test((a))',
			output: '((a)).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: '(String((a))).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: '((a))?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: '((a) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: 'const fn = async () => /^b/.test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'const fn = async () => String(await foo).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: 'const fn = async () => ((await foo) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
		{
			code: 'const fn = async () => (/^b/).test(await foo)',
			output: 'const fn = async () => (await foo).startsWith(\'b\')',
			errors: [{
				messageId: MESSAGE_STARTS_WITH,
				suggestions: [
					{
						messageId: FIX_TYPE_STRING_CASTING,
						output: 'const fn = async () => (String(await foo)).startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_OPTIONAL_CHAINING,
						output: 'const fn = async () => (await foo)?.startsWith(\'b\')',
					},
					{
						messageId: FIX_TYPE_NULLISH_COALESCING,
						output: 'const fn = async () => ((await foo) ?? \'\').startsWith(\'b\')',
					},
				],
			}],
		},
	],
});

const MESSAGE_INDEX_OF_STARTS_WITH = 'prefer-starts-with-indexOf';
const MESSAGE_SLICE_STARTS_WITH = 'prefer-starts-with-slice';
const MESSAGE_SLICE_ENDS_WITH = 'prefer-ends-with-slice';

// `indexOf` — provably string receivers
test({
	valid: [],
	invalid: [
		// String literal receiver
		{
			code: '"foo".indexOf("f") === 0',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Template literal receiver
		{
			code: '`foo`.indexOf("f") === 0',
			output: '`foo`.startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String() call receiver
		{
			code: 'String(x).indexOf("f") === 0',
			output: 'String(x).startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Negated
		{
			code: '"foo".indexOf("f") !== 0',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Comment outside the copied operands aborts the fix (no autofix)
		{
			code: '"foo".indexOf("f") /* comment */ === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TypeScript non-null assertion as the search argument aborts the fix (no autofix)
		{
			code: 'function foo(s: string) { return s.indexOf(bar!) === 0; }',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
			languageOptions: {parser: parsers.typescript},
		},
		// Reversed comparison
		{
			code: '0 === "foo".indexOf("f")',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Reversed negated
		{
			code: '0 !== "foo".indexOf("f")',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Loose equality
		{
			code: '"foo".indexOf("f") == 0',
			output: '"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Loose inequality
		{
			code: '"foo".indexOf("f") != 0',
			output: '!"foo".startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Static string variable
		{
			code: 'const foo = "hello"; foo.indexOf("h") === 0',
			output: 'const foo = "hello"; foo.startsWith("h")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// `typeof` is always a string
		{
			code: '(typeof foo).indexOf("u") === 0',
			output: '(typeof foo).startsWith("u")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String concatenation
		{
			code: '("a" + b).indexOf("a") === 0',
			output: '("a" + b).startsWith("a")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type annotation
		{
			code: 'function foo(bar: string) { return bar.indexOf("x") === 0; }',
			output: 'function foo(bar: string) { return bar.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type alias
		{
			code: 'type StringAlias = string; function foo(bar: StringAlias) { return bar.indexOf("x") === 0; }',
			output: 'type StringAlias = string; function foo(bar: StringAlias) { return bar.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: as string
		{
			code: '(foo as string).indexOf("x") === 0',
			output: '(foo as string).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: satisfies string
		{
			code: '(foo satisfies string).indexOf("x") === 0',
			output: '(foo satisfies string).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: type assertion
		{
			code: '(<string>foo).indexOf("x") === 0',
			output: '(<string>foo).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// TS: non-null assertion on string variable
		{
			code: 'function foo(bar: string) { return bar!.indexOf("x") === 0; }',
			output: 'function foo(bar: string) { return bar!.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// ASI protection
		{
			code: 'const value: string = "x"\nvalue!.indexOf("x") === 0',
			output: 'const value: string = "x"\nvalue!.startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Conditional expression receiver
		{
			code: '(a ? "foo" : "bar").indexOf("f") === 0',
			output: '(a ? "foo" : "bar").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Sequence expression receiver
		{
			code: '(0, "foo").indexOf("f") === 0',
			output: '(0, "foo").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Parenthesized search value
		{
			code: '"foo".indexOf((0, "f")) === 0',
			output: '"foo".startsWith((0, "f"))',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String.fromCharCode receiver
		{
			code: 'String.fromCharCode(65).indexOf("A") === 0',
			output: 'String.fromCharCode(65).startsWith("A")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// String.fromCodePoint receiver
		{
			code: 'String.fromCodePoint(65).indexOf("A") === 0',
			output: 'String.fromCodePoint(65).startsWith("A")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Parenthesized receiver
		{
			code: '("foo").indexOf("f") === 0',
			output: '("foo").startsWith("f")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// `let` variable receiver
		{
			code: 'let foo = "hello"; foo.indexOf("h") === 0',
			output: 'let foo = "hello"; foo.startsWith("h")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// Non-string argument — reports but does not autofix (startsWith throws on RegExp)
		{
			code: '"foo".indexOf(/f/) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: 'const pattern = /f/; "foo".indexOf(pattern) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: '"foo".indexOf(new RegExp("f")) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: '"foo".indexOf(bar) === 0',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		// ASI protection for a parenthesized receiver
		{
			code: 'foo\n0 === (value as string).indexOf("x")',
			output: 'foo\n;(value as string).startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
		{
			code: 'foo\n0 === ("a" + value).indexOf("a")',
			output: 'foo\n;("a" + value).startsWith("a")',
			errors: [{messageId: MESSAGE_INDEX_OF_STARTS_WITH}],
		},
	],
});

// `slice` comparisons — provably string receivers and search values
test({
	valid: [
		// Receiver not provably a string
		'value.slice(0, 5) === "shark"',
		// Non-string receiver
		'const value = [1, 2, 3]; value.slice(0, 1) === "1"',
		// Optional
		'"shark".slice?.(0, 5) === "shark"',
		'"shark"?.slice(0, 5) === "shark"',
		// Computed
		'"shark"["slice"](0, 5) === "shark"',
		// Spread
		'"shark".slice(...[0, 5]) === "shark"',
		'"shark".slice(0, ...[5]) === "shark"',
		// Wrong bounds
		'"shark".slice(1, 5) === "shark"',
		'"shark".slice(0, 4) === "shark"',
		'"shark".slice(-4) === "shark"',
		'"shark".slice(-5, -1) === "shark"',
		{
			code: 'function foo(value: string, prefix: string, other: string) { return value.slice(0, other.length) === prefix; }',
			languageOptions: {parser: parsers.typescript},
		},
		// Empty dynamic suffix would not be equivalent to `endsWith()`
		'"shark".slice(-0) === ""',
		'const suffix = ""; "shark".slice(-suffix.length) === suffix',
		{
			code: 'function foo(value: string, suffix: string) { return value.slice(-suffix.length) === suffix; }',
			languageOptions: {parser: parsers.typescript},
		},
		// Non-string compared value
		'"shark".slice(0, 5) === 123',
		'"shark".slice(-5) === /shark/',
		// Unknown compared value
		'"shark".slice(0, 5) === prefix',
		outdent`
			const modes = new Set(['foo']);
			modes.clear();
			'foo'.slice(0, 1) === (modes.size ? 'f' : 'foo');
		`,
		outdent`
			const modes = new Set(['foo']);
			modes.clear();
			'foo'.slice(0, 1) === ((modes.size && 'f') || prefix);
		`,
	],
	invalid: [
		// Static prefix
		{
			code: '"shark".slice(0, 5) === "shark"',
			output: '"shark".startsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// Static suffix
		{
			code: '"shark".slice(-5) === "shark"',
			output: '"shark".endsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_ENDS_WITH}],
		},
		// Reversed comparison
		sliceCase('"shark" === "shark".slice(0, 5)', '"shark".startsWith("shark")'),
		// Reversed negated
		sliceCase('"shark" !== "shark".slice(-5)', '!"shark".endsWith("shark")'),
		// Loose equality
		{
			code: '"shark".slice(0, 5) == "shark"',
			output: '"shark".startsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// Negated prefix
		{
			code: '"shark".slice(0, 5) !== "shark"',
			output: '!"shark".startsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// Loose inequality
		{
			code: '"shark".slice(-5) != "shark"',
			output: '!"shark".endsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_ENDS_WITH}],
		},
		// Parenthesized receiver
		{
			code: '("shark").slice(0, 5) === "shark"',
			output: '("shark").startsWith("shark")',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// TypeScript typed dynamic prefix length
		{
			code: 'function foo(value: string, prefix: string) { return value.slice(0, prefix.length) === prefix; }',
			output: 'function foo(value: string, prefix: string) { return value.startsWith(prefix); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// Complex receiver
		{
			code: '("a" + value).slice(0, 1) === "a"',
			output: '("a" + value).startsWith("a")',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// TypeScript non-null assertion on string receiver
		{
			code: 'function foo(value: string) { return value!.slice(0, 1) === "x"; }',
			output: 'function foo(value: string) { return value!.startsWith("x"); }',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// ASI protection
		{
			code: 'const value: string = "x"\nvalue!.slice(0, 1) === "x"',
			output: 'const value: string = "x"\nvalue!.startsWith("x")',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// Parenthesized search value
		{
			code: '"shark".slice(0, 1) === (0, "s")',
			output: '"shark".startsWith((0, "s"))',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		{
			code: '"shark".slice(-1) === (0, "k")',
			output: '"shark".endsWith((0, "k"))',
			errors: [{messageId: MESSAGE_SLICE_ENDS_WITH}],
		},
		// Static non-empty dynamic suffix length
		{
			code: 'const suffix = "ark"; "shark".slice(-suffix.length) === suffix',
			output: 'const suffix = "ark"; "shark".endsWith(suffix)',
			errors: [{messageId: MESSAGE_SLICE_ENDS_WITH}],
		},
		// Comment outside the copied operands aborts the fix
		{
			code: '"shark".slice(0, 5) /* comment */ === "shark"',
			errors: [{messageId: MESSAGE_SLICE_STARTS_WITH}],
		},
		// ASI protection for a parenthesized receiver
		sliceCase('foo\n"x" === (value as string).slice(0, 1)', 'foo\n;(value as string).startsWith("x")', {languageOptions: {parser: parsers.typescript}}),
		sliceCase('foo\n"a" !== ("a" + value).slice(-1)', 'foo\n!("a" + value).endsWith("a")'),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'/^a/.test("string")',
		'/^a/.test((0, "string"))',
		'async function a() {return /^a/.test(await foo())}',
		'/^a/.test(foo + bar)',
		'/^a/.test(foo || bar)',
		'/^a/.test(new SomeString)',
		'/^a/.test(new (SomeString))',
		'/^a/.test(new SomeString())',
		'/^a/.test(new new SomeClassReturnsAStringSubClass())',
		'/^a/.test(new SomeString(/* comment */))',
		'/^a/.test(new SomeString("string"))',
		'/^a/.test(foo.bar)',
		'/^a/.test(foo.bar())',
		'/^a/.test(foo?.bar)',
		'/^a/.test(foo?.bar())',
		// TypeScript non-null assertion as the target gets parenthesized
		{code: '/^a/.test(foo!)', languageOptions: {parser: parsers.typescript}},
		'/^a/.test(`string`)',
		'/^a/.test(tagged`string`)',
		'(/^a/).test((0, "string"))',
		'/^a/.test(true ? a : b)',
		'/a$/.test(a ??= b)',
		'/^a/.test(a || b)',
		'/^a/.test(a && b)',
		'/^a/u.test("string")',
		'/^a/v.test("string")',
		// eslint-disable-next-line no-template-curly-in-string
		'/a$/.test(`${unknown}`)',
		'/a$/.test(String(unknown))',
		outdent`
			/* 1 */
			(
				/* 2 */
				(
					/* 3 */
					/^a/
					/* 4 */
				)
				/* 5 */
			)
			/* 6 */
			. /* 7 */ test /* 8 */ (
				/* 9 */
				(
					/* 10 */
					(
						/* 11 */
						a
						/* 12 */
					)
					/* 13 */
				)
				/* 14 */
			) /* 15 */
		`,
		// The call is the tag of a template on the next line, an optional chain cannot be a tag, so there is no optional-chaining suggestion
		'/^a/.test(foo)\n`tpl`',
		'bar(/^a/.test(foo)`tpl`)',
		// eslint-disable-next-line no-template-curly-in-string
		'`${/^a/.test(foo)`tpl`}`',
		// A parenthesized optional chain can be a tag
		'(/^a/.test(foo))\n`tpl`',
		// eslint-disable-next-line no-template-curly-in-string
		'`${/^a/.test((foo))}`',
	],
});

test({
	valid: [],
	invalid: [
		['({value: "abc"}.value.indexOf("a")) === 0;', '({value: "abc"}.value).startsWith("a");'],
		['({value: "abc"}.value.slice(0, 1)) === "a";', '({value: "abc"}.value).startsWith("a");'],
		['const value = ({value: "abc"}.value.indexOf("a")) === 0;', 'const value = {value: "abc"}.value.startsWith("a");'],
		['({value: "abc"}.value.indexOf("a")) !== 0;', '!{value: "abc"}.value.startsWith("a");'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

test({
	valid: [
		'/** @param {() => ?string} read */ function run(read) { return read().indexOf("a") === 0; }',
		'/** @returns {string} */ async function read() { return source; } read().indexOf("a") === 0;',
	],
	invalid: [{
		code: '/** @param {() => string} read */ function run(read) { return read().indexOf("a") === 0; }',
		output: '/** @param {() => string} read */ function run(read) { return read().startsWith("a"); }',
		errors: [{messageId: 'prefer-starts-with-indexOf'}],
	}],
});

test({
	valid: [
		'/** @type {unknown} */ const value = "text"; const alias = value; alias.indexOf("t") === 0;',
		{
			code: '/** @type {unknown} */ const value = "text"; (value as unknown).indexOf("t") === 0;',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [],
});

test({
	valid: [
		'/** @type {{(): string; (value: number): number}} */ let read; read().indexOf("a") === 0;',
		'/** @type {(() => string) | (() => number)} */ let read; read().indexOf("a") === 0;',
	],
	invalid: [{
		code: '/** @type {{(): string; label: string}} */ let read; read().indexOf("a") === 0;',
		output: '/** @type {{(): string; label: string}} */ let read; read().startsWith("a");',
		errors: [{messageId: 'prefer-starts-with-indexOf'}],
	}, {
		code: '/** @type {(() => string) & {label: string}} */ let read; read().indexOf("a") === 0;',
		output: '/** @type {(() => string) & {label: string}} */ let read; read().startsWith("a");',
		errors: [{messageId: 'prefer-starts-with-indexOf'}],
	}],
});
