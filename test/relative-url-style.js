/* eslint-disable no-template-curly-in-string */
import nodeTest from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester, languages, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'URL("./foo", base)',
		'new URL(...["./foo"], base)',
		'new URL(["./foo"], base)',
		'new URL("./foo")',
		'new URL("./foo", base, extra)',
		'new URL("./foo", ...[base])',
		'new NOT_URL("./foo", base)',
		'new NOT_URL("./", base)',
		'new URL("./", base)',
		'new URL("./", "https://example.com/a/b/c.html")',
		outdent`
			const base = {value: 'https://example.com/a/b'};
			Object.defineProperty(base, 'value', {get() { return 'https://example.com/a/b'; }});
			new URL('./?query', base.value);
		`,
		outdent`
			const base = {value: 'https://example.com/a/b/'};
			Object.defineProperty(base, 'value', {get() { return 'https://example.com/a/b'; }});
			new URL('./?query', base.value);
		`,
		'const base = new URL("./", import.meta.url)',
		'new URL',
		'new URL(0, base)',
		// Not checking this case
		'new globalThis.URL("./foo", base)',
		'const foo = "./foo"; new URL(foo, base)',
		'const foo = "/foo"; new URL(`.${foo}`, base)',
		'new URL(`.${foo}`, base)',
		'new URL(".", base)',
		'new URL(".././foo", base)',
		// We don't check cooked value
		'new URL(`\\u002E/${foo}`, base)',
		// We don't check escaped string
		String.raw`new URL("\u002E/foo", base)`,
		String.raw`new URL('\u002E/foo', base)`,
		// Template literals that are not the URL argument are ignored
		'new URL("foo", `./${base}`)',
		'foo(`./${bar}`)',
	],
	invalid: [
		'new URL("./foo", base)',
		`const base = {value: 'https://example.com/'};
Object.defineProperty(base, 'value', {get() { return 'https://example.com/a/b/'; }});
new URL('./foo', base.value);`,
		'new URL(\'./foo\', base)',
		'new URL("././a", base)',
		'new URL(`./${foo}`, base)',
		'new URL("./", "https://example.com/a/b/")',
	],
});

const alwaysAddDotSlashOptions = ['always'];
test.snapshot({
	valid: [
		'URL("foo", base)',
		'new URL(...["foo"], base)',
		'new URL(["foo"], base)',
		'new URL("foo")',
		'new URL("foo", base, extra)',
		'new URL("foo", ...[base])',
		'new NOT_URL("foo", base)',
		'new URL("", base)',
		'new URL("", "https://example.com/a/b.html")',
		'/* 2 */ new URL',
		'new URL(0, base2)',
		// Not checking this case
		'new globalThis.URL("foo", base)',
		'new URL(`${foo}`, base2)',
		'new URL(`.${foo}`, base2)',
		'new URL(".", base2)',
		'new URL("//example.org", "https://example.com")',
		'new URL("//example.org", "ftp://example.com")',
		'new URL("ftp://example.org", "https://example.com")',
		'new URL("https://example.org:65536", "https://example.com")',
		'new URL("/", base)',
		'new URL("/foo", base)',
		'new URL("../foo", base)',
		'new URL(".././foo", base)',
		String.raw`new URL("C:\foo", base)`,
		String.raw`new URL("\u002E/foo", base)`,
		String.raw`new URL("\u002Ffoo", base)`,
	].map(code => ({code, options: alwaysAddDotSlashOptions})),
	invalid: [
		'new URL("foo", base)',
		'new URL(\'foo\', base)',
		'new URL("", "https://example.com/a/b/")',
	].map(code => ({code, options: alwaysAddDotSlashOptions})),
});

test({
	valid: [
		'new URL(`./?query`, "https://example.com/a/b.html")',
		'new URL(`./#section`, "https://example.com/a/b.html")',
		'new URL(`./`, "https://example.com/a/b.html")',
		'new URL(`./http\\u003Afoo`, base)',
		'new URL(`\\u002E/foo`, base)',
		...['.', '..', './file', '../file', '.?query', '..#section', String.raw`.\\file`, String.raw`..\\file`, '?query', '#section'].map(url => ({
			code: `new URL("${url}", base)`,
			options: ['always'],
		})),
		{code: 'new URL(`\\u003Fquery`, base)', options: ['always']},
		{code: 'new URL(`https\\u003Afoo`, base)', options: ['always']},
		{code: 'new URL(``, "https://example.com/a/b.html")', options: ['always']},
	],
	invalid: [
		...[
			{code: 'new URL(`./file`, base)', output: 'new URL(`file`, base)'},
			{code: 'new URL(`./f\\u006Fo`, base)', output: 'new URL(`f\\u006Fo`, base)'},
			{code: String.raw`new URL("./f\u006Fo", base)`, output: String.raw`new URL("f\u006Fo", base)`},
			{code: 'new URL(`./?query`, "https://example.com/a/b/")', output: 'new URL(`?query`, "https://example.com/a/b/")'},
			{code: 'new URL(`./#section`, "https://example.com/a/b/")', output: 'new URL(`#section`, "https://example.com/a/b/")'},
			{code: 'new URL(`./`, "https://example.com/a/b/")', output: 'new URL(``, "https://example.com/a/b/")'},
		].map(testCase => ({...testCase, errors: [{messageId: 'never'}]})),
		...[
			{code: 'new URL(`file`, base)', output: 'new URL(`./file`, base)'},
			{code: 'new URL(`f\\u006Fo`, base)', output: 'new URL(`./f\\u006Fo`, base)'},
			{code: 'new URL(`\\u002Eenv`, base)', output: 'new URL(`./\\u002Eenv`, base)'},
			{code: 'new URL(``, "https://example.com/a/b/")', output: 'new URL(`./`, "https://example.com/a/b/")'},
			...['.env', '.github/workflow.yml', '..hidden/file'].map(url => ({
				code: `new URL("${url}", base)`,
				output: `new URL("./${url}", base)`,
			})),
		].map(testCase => ({...testCase, options: ['always'], errors: [{messageId: 'always'}]})),
	],
});

for (const style of ['never', 'always']) {
	const prefix = style === 'never' ? './' : '';
	const replacementPrefix = style === 'never' ? '' : './';
	const languageOptions = {parser: parsers.typescript};
	test({
		valid: [
			`new URL("${prefix}file" satisfies string, base)`,
			`new URL(("${prefix}file" satisfies string) as string, base)`,
			`new URL(("${prefix}file" satisfies string)!, base)`,
			`new URL(("${prefix}file" as string) satisfies string, base)`,
			`new URL(\`${prefix}file\` satisfies string, base)`,
			'new URL("./?query" as string, "https://example.com/a/b.html" as const)',
		].map(code => ({code, options: [style], languageOptions})),
		invalid: [
			...['as string', '!', 'as const'].map(wrapper => ({
				code: `new URL("${prefix}file" ${wrapper}, base)`,
				output: `new URL("${replacementPrefix}file" ${wrapper}, base)`,
			})),
			{code: `new URL(<string>"${prefix}file", base)`, output: `new URL(<string>"${replacementPrefix}file", base)`},
			{code: `new URL(("${prefix}file" as string)!, base)`, output: `new URL(("${replacementPrefix}file" as string)!, base)`},
			{code: `new URL("${prefix}file" /* keep */ as string, base)`, output: `new URL("${replacementPrefix}file" /* keep */ as string, base)`},
			{code: `new URL(\`${prefix}file\` as string, base)`, output: `new URL(\`${replacementPrefix}file\` as string, base)`},
			{code: `new URL("${prefix}file" as string, "https://example.com/a/b/" as const)`, output: `new URL("${replacementPrefix}file" as string, "https://example.com/a/b/" as const)`},
		].map(testCase => ({
			...testCase, options: [style], languageOptions, errors: [{messageId: style}],
		})),
	});
}

test({
	valid: [
		{code: 'new URL((`./${name}` satisfies string) as string, base)', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		{
			code: 'new URL(`./${name}` as string, base)',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'never', suggestions: [{messageId: 'remove', output: 'new URL(`${name}` as string, base)'}]}],
		},
	],
});

test({
	valid: [],
	invalid: ['https://example.com/image.png', '?query'].map(value => ({
		code: `new URL(\`./\${"${value}"}\`, base)`,
		errors: [{
			messageId: 'never',
			suggestions: [{messageId: 'remove', output: `new URL(\`\${"${value}"}\`, base)`}],
		}],
	})),
});

const hiddenPathMarkupCases = [
	{
		language: languages.css,
		plain: '@import ".github/style.css"; a { background: url(".env.png"); mask-image: image-set("..hidden.png" 1x); }',
		prefixed: '@import "./.github/style.css"; a { background: url("./.env.png"); mask-image: image-set("./..hidden.png" 1x); }',
	},
	{
		language: languages.html,
		plain: '<a href=".env">link</a><img srcset=".github/small.png 1x, ..hidden.png 2x">',
		prefixed: '<a href="./.env">link</a><img srcset="./.github/small.png 1x, ./..hidden.png 2x">',
	},
	...[languages.markdown, {...languages.markdown, language: 'markdown/gfm'}].map(language => ({
		language,
		plain: '[link](.env)\n![image](.github/diagram.png)\n\n[reference]: ..hidden.md',
		prefixed: '[link](./.env)\n![image](./.github/diagram.png)\n\n[reference]: ./..hidden.md',
	})),
];

test({
	valid: [
		{code: '@import "../style.css"; a { background: url(".?query"); }', language: languages.css},
		{code: '<a href="..#section">link</a><img srcset="./small.png 1x, ../large.png 2x">', language: languages.html},
		{code: '[link](.?query)\n![image](../diagram.png)\n\n[reference]: ..#section', language: languages.markdown},
	].map(({code, language}) => ({
		code, language: language.language, plugins: language.plugins, options: ['always'],
	})),
	invalid: hiddenPathMarkupCases.flatMap(({language, plain, prefixed}) => ['never', 'always'].map(style => ({
		code: style === 'never' ? prefixed : plain,
		output: style === 'never' ? plain : prefixed,
		language: language.language,
		plugins: language.plugins,
		options: [style],
		errors: 3,
	}))),
});

const nonRelativeUrls = ['https://example.com/image.png', '//example.com/image.png', '/image.png', '#section', '?query', 'data:image/png;base64,abc', '../image.png', './', './?query', './#section', './https://example.com/image.png'];

for (const method of ['canParse', 'parse']) {
	for (const style of ['never', 'always']) {
		const prefix = style === 'never' ? './' : '';
		const replacementPrefix = style === 'never' ? '' : './';
		test({
			valid: [
				`URL.${method}("${prefix}image.png")`,
				`URL.${method}("${prefix}image.png", base, extra)`,
				`URL.${method}(...["${prefix}image.png"], base)`,
				`URL.${method}("${prefix}image.png", ...[base])`,
				`URL["${method}"]("${prefix}image.png", base)`,
				`URL?.${method}("${prefix}image.png", base)`,
				`URL.${method}?.("${prefix}image.png", base)`,
				`Other.${method}("${prefix}image.png", base)`,
				`globalThis.URL.${method}("${prefix}image.png", base)`,
				`new URL.${method}("${prefix}image.png", base)`,
				`URL.${method}(image, base)`,
				`URL.${method}(42, base)`,
				`URL.${method}("${prefix}C|/image.png", import.meta.url)`,
				`URL.${method}("${prefix}C|/image.png", "file:///a/b.html")`,
				`URL.${method}("${prefix}?query", base)`,
				...(style === 'always' ? [`URL.${method}(\`\${image}\`, base)`] : []),
				{
					code: `URL.${method}("${prefix}image.png" satisfies string, base)`,
					languageOptions: {parser: parsers.typescript},
				},
			].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), options: [style]})),
			invalid: [
				{
					code: `URL.${method}("${prefix}image.png", base)`,
					output: `URL.${method}("${replacementPrefix}image.png", base)`,
				},
				{
					code: `URL.${method}(\`${prefix}image.png\`, base)`,
					output: `URL.${method}(\`${replacementPrefix}image.png\`, base)`,
				},
				{
					code: String.raw`URL.${method}("${prefix}f\u006Fo.png", base)`,
					output: String.raw`URL.${method}("${replacementPrefix}f\u006Fo.png", base)`,
				},
				{
					code: `URL.${method}("${prefix}?query", "https://example.com/a/b/")`,
					output: `URL.${method}("${replacementPrefix}?query", "https://example.com/a/b/")`,
				},
				{
					code: `URL.${method}("${prefix}C|/image.png", "https://example.com/a/b.html")`,
					output: `URL.${method}("${replacementPrefix}C|/image.png", "https://example.com/a/b.html")`,
				},
				{
					code: `URL.${method}(("${prefix}image.png" /* keep */ as string)!, base)`,
					output: `URL.${method}(("${replacementPrefix}image.png" /* keep */ as string)!, base)`,
					languageOptions: {parser: parsers.typescript},
				},
			].map(testCase => ({...testCase, options: [style], errors: [{messageId: style}]})),
		});
	}

	test({
		valid: [],
		invalid: [{
			code: `URL.${method}(\`./\${image}\`, base)`,
			errors: [{messageId: 'never', suggestions: [{messageId: 'remove', output: `URL.${method}(\`\${image}\`, base)`}]}],
		}],
	});
}

for (const style of ['never', 'always']) {
	nodeTest(`normalizes URLs after prefer-url-can-parse fixes: ${style}`, t => {
		const prefix = style === 'never' ? './' : '';
		const replacementPrefix = style === 'never' ? '' : './';
		const code = `function validate(base) { try { new URL("${prefix}image.png", base); return true; } catch { return false; } }`;
		const output = `function validate(base) { return URL.canParse("${replacementPrefix}image.png", base); }`;
		const rules = [
			['unicorn/relative-url-style', ['error', style]],
			['unicorn/prefer-url-can-parse', 'error'],
		];
		const linter = new Linter();
		for (const entries of [rules, rules.toReversed()]) {
			const config = {plugins: {unicorn}, languageOptions: {globals: {URL: 'readonly'}}, rules: Object.fromEntries(entries)};
			const result = linter.verifyAndFix(code, config);
			t.assert.strictEqual(result.output, output);
			t.assert.deepStrictEqual(result.messages, []);
			t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
		}
	});
}

for (const style of ['never', 'always']) {
	const prefix = style === 'never' ? './' : '';
	test({
		valid: [
			{
				code: String.raw`@import "${prefix}http\3A example.com"; a { background: url("${prefix}\3F query"); mask-image: image-set("${prefix}\23 fragment" 1x); }`,
				language: languages.css.language,
				plugins: languages.css.plugins,
			},
			...[languages.markdown, {...languages.markdown, language: 'markdown/gfm'}].map(language => ({
				code: [
					`[entity](${prefix}http&colon;example.com)`,
					`![entity](${prefix}&#63;query)`,
					String.raw`[escaped](${prefix}http\:example.com)`,
					String.raw`![escaped](${prefix}\#fragment)`,
					'',
					`[reference]: ${prefix}http&colon;example.com`,
				].join('\n'),
				language: language.language,
				plugins: language.plugins,
			})),
		].map(testCase => ({...testCase, options: [style]})),
		invalid: [],
	});
}

for (const style of ['never', 'always']) {
	const prefix = style === 'never' ? './' : '';
	const replacementPrefix = style === 'never' ? '' : './';
	test({
		valid: [
			...['base', 'import.meta.url', '"file:///D:/project/index.js"'].flatMap(base => [
				{code: `new URL("${prefix}C|/asset", ${base})`},
				{code: `new URL(\`${prefix}C|/asset\`, ${base})`},
			]),
			{code: `a { background: url("${prefix}C|/asset") }`, language: languages.css},
			{code: `<img src="${prefix}C|/asset" srcset="${prefix}C|/small.png 1x">`, language: languages.html},
			...[languages.markdown, {...languages.markdown, language: 'markdown/gfm'}].map(language => ({
				code: `[link](${prefix}C|/asset)\n![image](${prefix}C|/image.png)\n\n<img src="${prefix}C|/asset">`,
				language,
			})),
		].map(({language, ...testCase}) => ({
			...testCase,
			...(language && {language: language.language, plugins: language.plugins}),
			options: [style],
		})),
		invalid: [
			{
				code: `new URL("${prefix}C|/asset", "https://example.com/a/b.html")`,
				output: `new URL("${replacementPrefix}C|/asset", "https://example.com/a/b.html")`,
			},
			{
				code: `new URL("${prefix}image.png", "file:///D:/project/index.js")`,
				output: `new URL("${replacementPrefix}image.png", "file:///D:/project/index.js")`,
			},
		].map(testCase => ({...testCase, options: [style], errors: [{messageId: style}]})),
	});
}

test.snapshot({
	valid: [
		{code: 'a { background: url("./{{ assetPath }}") }'},
		{code: '@import "./{{ assetPath }}";'},
		{code: 'a { background: url("{{ assetPath }}") }', options: ['always']},
		{code: '@import "{{ assetPath }}";', options: ['always']},
	].map(testCase => ({...testCase, language: languages.css, languageOptions: {templateEngineSyntax: {'{{': '}}'}}})),
	invalid: [],
});

test.snapshot({
	valid: nonRelativeUrls.flatMap(url => ['never', 'always'].map(style => ({code: `a { background: url("${url}") }`, options: [style], language: languages.css}))),
	invalid: [
		{code: 'a { background: url(./image.png) }'},
		{code: 'a { background: image-set("./small.png" 1x, "./large.png" 2x) }'},
		{code: 'a { background: -webkit-image-set("small.png" 1x) }', options: ['always']},
		{code: 'a { background: image-set("small.png" 1x type("image/png")) }', options: ['always']},
		{code: 'a { background: url( "./image.png" ) }'},
		{code: String.raw`a { background: url("./a\20 b.png") }`},
		{code: 'a { background: url(image.png) }', options: ['always']},
		{code: String.raw`a { background: url("a\20 b.png") }`, options: ['always']},
		{code: '@import url("./style.css");'},
	].map(testCase => ({...testCase, language: languages.css})),
});

test.snapshot({
	valid: [
		{code: '@namespace svg url("./svg"); svg|a {}'},
		{code: String.raw`@\6e amespace svg url("./svg"); svg|a {}`},
		{code: '@namespace svg url("svg"); svg|a {}', options: ['always']},
		{code: '@document url("./page.html") { a {} }'},
		{code: '@document url("page.html") { a {} }', options: ['always']},
		{code: '@supports (background: image-set("./missing.png" 1x)) {}'},
		{code: '@import "./style.css" supports(background: image-set("./missing.png" 1x));', options: ['always']},
	].map(testCase => ({...testCase, language: languages.css})),
	invalid: [
		{code: '@document url("./page.html") { a { background: url("./image.png"); } }'},
		{code: '@media screen { a { background: url("image.png"); } }', options: ['always']},
	].map(testCase => ({...testCase, language: languages.css})),
});

test.snapshot({
	valid: [
		...nonRelativeUrls.flatMap(url => ['never', 'always'].map(style => ({code: `<a href="${url}">link</a>`, options: [style]}))),
		{code: '<div data-src="./image.png"></div>'},
		{code: '<a href="&period;/page.html">link</a>'},
	].map(testCase => ({...testCase, language: languages.html})),
	invalid: [
		{code: '<a href="./page.html?a=1&amp;b=2">link</a>'},
		{code: '<img SRC="./image.png">'},
		{code: '<video poster="./poster.png"></video>'},
		{code: '<a href=./page.html>link</a>'},
		{code: '<a href="  ./page.html  ">link</a>'},
		{code: '<img src="image.png">', options: ['always']},
		{code: '<a href=page.html>link</a>', options: ['always']},
	].map(testCase => ({...testCase, language: languages.html})),
});

test.snapshot({
	valid: [
		...nonRelativeUrls.flatMap(url => ['never', 'always'].map(style => ({code: `@import "${url}";`, options: [style]}))),
		{code: 'a { content: "./image.png"; }'},
		{code: '@namespace svg "./namespace";'},
		{code: String.raw`@import "\2e /style.css";`},
	].map(testCase => ({...testCase, language: languages.css})),
	invalid: [
		{code: '@import "./style.css";'},
		{code: String.raw`@\69mport "./style.css";`},
		{code: String.raw`@\69mport url("./style.css");`},
		{code: '@IMPORT /* keep */ \'./style.css\' layer(theme) screen;'},
		{code: String.raw`@import "./my\20 style.css" supports(display: grid);`},
		{code: '@import "style.css";', options: ['always']},
		{code: String.raw`@import "my\20 style.css";`, options: ['always']},
	].map(testCase => ({...testCase, language: languages.css})),
});

test.snapshot({
	valid: [
		...nonRelativeUrls.flatMap(url => ['never', 'always'].map(style => ({code: `<img srcset="${url} 1x">`, options: [style]}))),
		{code: '<img srcset="image.png 1x, image@2x.png 2x">'},
		{code: '<img srcset="./image.png 1x, ./image@2x.png 2x">', options: ['always']},
		{code: '<img srcset="./image.png?a=1&amp;b=2 1x, ./other.png 2x">'},
		{code: '<img srcset="./image.png&#32;1x,&#32;./other.png&#32;2x">'},
		{code: '<img srcset="./{{ assetPath }} 1x, ./other.png 2x">', languageOptions: {templateEngineSyntax: {'{{': '}}'}}},
		{code: '<img srcset=./{{assetPath}}>', languageOptions: {templateEngineSyntax: {'{{': '}}'}}},
		{code: '<img data-srcset="./image.png 1x">'},
		{code: '<img srcset="./,image.png 1x, ./,,large.png 2x">'},
		{code: '<img srcset=./,image.png,./other.png>'},
		{code: '<img srcset="./,image.png 1x">', options: ['always']},
		{code: '<img srcset="./ 1x, ./\t2x">'},
	].map(testCase => ({...testCase, language: languages.html})),
	invalid: [
		{code: '<img srcset="./image.png 1x, ./image@2x.png 2x">'},
		{code: '<link rel="preload" as="image" imagesrcset="./small.png 1x, ./large.png 2x">'},
		{code: '<link rel="preload" as="image" imagesrcset="small.png 1x, large.png 2x">', options: ['always']},
		{code: '<source SRCSET=" ./small.png 320w,\n\t./large.png 640w ">'},
		{code: '<img srcset="data:image/png;base64,abc 1x, ./large.png 2x">'},
		{code: '<img srcset="./one.png, ./two.png">'},
		{code: '<img srcset=./images/one.png>'},
		{code: '<img srcset="small.png 320w, large.png 640w">', options: ['always']},
		{code: '<img srcset="data:image/png;base64,abc 1x, large.png 2x">', options: ['always']},
		{code: '<img srcset="image,one.png 1x, image,two.png 2x">', options: ['always']},
		{code: '<img srcset=./%2Cimage.png>'},
		{code: '<img srcset=././,image.png>'},
		{code: '<img srcset="./,image.png 1x, ./other.png 2x">'},
		{code: '<img srcset=,image.png>', options: ['always']},
		{code: '<img srcset=" ,\timage.png 1x, , large.png 2x">', options: ['always']},
	].map(testCase => ({...testCase, language: languages.html})),
});

test.snapshot({
	valid: nonRelativeUrls.flatMap(url => ['never', 'always'].map(style => ({code: `[link](${url})`, options: [style], language: languages.markdown}))),
	invalid: [
		{code: '[link](./page.md)'},
		{code: '![image](./image.png "title")'},
		{code: '[link](<./page with spaces.md>)'},
		{code: String.raw`[link](./page\(1\).md)`},
		{code: '[link][reference]\n\n[reference]: ./page.md'},
		{code: '[link](page.md)', options: ['always']},
		{code: '![image](image.png)', options: ['always']},
		{code: '[link](<page with spaces.md>)', options: ['always']},
	].map(testCase => ({...testCase, language: languages.markdown})),
});

test.snapshot({
	valid: [
		{code: 'a { background: url(\u00A0./image.png) }', language: languages.css},
		{code: '<a href="\u00A0./page.html">link</a>', language: languages.html},
		{code: '<a href="&#32;./page.html">link</a>', language: languages.html},
		{code: '<img src="./{{ assetPath }}">', language: languages.html, languageOptions: {templateEngineSyntax: {'{{': '}}'}}},
		{code: '[![image](./image.png)](./page.md)', language: languages.markdown, options: ['always']},
		{code: '[link](&period;/page.md)', language: languages.markdown},
	],
	invalid: [
		{code: '[nested [label]](./page.md)', language: languages.markdown},
		{code: '[label `](./page.md)`](./page.md)', language: languages.markdown},
		{code: String.raw`[label \]](./page.md)`, language: languages.markdown},
		{code: '[link](./page.md)', language: {...languages.markdown, language: 'markdown/gfm'}},
		{code: '[![image](./image.png)](./page.md)', language: languages.markdown},
	],
});

const markdownLanguages = [languages.markdown, {...languages.markdown, language: 'markdown/gfm'}];

for (const language of markdownLanguages) {
	test({
		valid: [
			...['> [link](\n> page.md)', '> [reference]:\n> page.md', '> [link](\n> <page.md>)', '> [reference]:\n> <page.md>'].map(code => ({code, options: ['always']})),
			...['./<file>', './<file', String.raw`./\<file>`, './&lt;file&gt;'].flatMap(destination => [
				{code: `[link](${destination})`},
				{code: `![image](${destination})`},
				{code: `[reference]: ${destination}\n\n[link][reference]`},
			]),
			{code: '[link](&lt;file&gt;)\n![image](\\<file>)\n\n[reference]: &lt;file&gt;', options: ['always']},
			{
				code: '![[^`note]](./right.md "`]](./wrong.md")\n\n[^`note]: footnote',
			},
			{
				code: '![[^`note]](right.md "`]](wrong.md")\n\n[^`note]: footnote',
				options: ['always'],
			},
			{
				code: '![$`](./wrong.md "title$](./right.md")',
				languageOptions: {math: true},
			},
			{
				code: '![$`](wrong.md "title$](right.md")',
				options: ['always'],
				languageOptions: {math: true},
			},
		].map(testCase => ({...testCase, language: language.language, plugins: language.plugins})),
		invalid: [
			{
				code: '[link](./%3Cfile%3E)\n![image](./%3Cfile%3E)\n\n[reference]: ./%3Cfile%3E',
				output: '[link](%3Cfile%3E)\n![image](%3Cfile%3E)\n\n[reference]: %3Cfile%3E',
				errors: 3,
			},
			...['[link](\n  page.md)', '- [link](\n  page.md)', '[reference]:\n  page.md', '[link](>page.md)', '[reference]: >page.md'].map(code => ({
				code,
				output: code.replace(/>?page\.md/u, './$&'),
				options: ['always'],
				errors: [{messageId: 'always'}],
			})),
			{
				code: '<svg><image href="./visible.svg" xlink:href="./hidden.svg" /></svg>',
				output: '<svg><image href="visible.svg" xlink:href="./hidden.svg" /></svg>',
				errors: [{messageId: 'never'}],
			},
			{
				code: '<svg><image href="visible.svg" xlink:href="hidden.svg" /></svg>',
				output: '<svg><image href="./visible.svg" xlink:href="hidden.svg" /></svg>',
				options: ['always'],
				errors: [{messageId: 'always'}],
			},
			{
				code: '---\nimage: \'<img src="./metadata.png">\'\n---\n\n$<img src="./math.png">$ <img src="./real.png">',
				output: '---\nimage: \'<img src="./metadata.png">\'\n---\n\n$<img src="./math.png">$ <img src="real.png">',
				languageOptions: {frontmatter: 'yaml', math: true},
				errors: [{messageId: 'never'}],
			},
			{
				code: '---\nimage: \'<img src="metadata.png">\'\n---\n\n$<img src="math.png">$ <img src="real.png">',
				output: '---\nimage: \'<img src="metadata.png">\'\n---\n\n$<img src="math.png">$ <img src="./real.png">',
				options: ['always'],
				languageOptions: {frontmatter: 'yaml', math: true},
				errors: [{messageId: 'always'}],
			},
			{
				code: '🦄\r\n\r\n<div>\r\n<img\r\n src="./image.png"\r\n srcset="./small.png 1x, ./large.png 2x">\r\n</div>',
				output: '🦄\r\n\r\n<div>\r\n<img\r\n src="image.png"\r\n srcset="small.png 1x, large.png 2x">\r\n</div>',
				errors: 3,
			},
			{
				code: '![`API`](./diagram.png)',
				output: '![`API`](diagram.png)',
				languageOptions: {math: true},
				errors: [{messageId: 'never'}],
			},
			{
				code: '![$`](./wrong.md "title$](./right.md")',
				output: '![$`](wrong.md "title$](./right.md")',
				errors: [{messageId: 'never'}],
			},
			{
				code: '[$`](./wrong.md "title$](./right.md")',
				output: '[$`](./wrong.md "title$](right.md")',
				languageOptions: {math: true},
				errors: [{messageId: 'never'}],
			},
			{
				code: '- [`prefer-nesting`](./prefer-nesting.md)',
				output: '- [`prefer-nesting`](prefer-nesting.md)',
				errors: [{messageId: 'never'}],
			},
			{
				code: '![`API`](./diagram.png)',
				output: '![`API`](diagram.png)',
				errors: [{messageId: 'never'}],
			},
			{
				code: '![![moon](./inner.png)](./outer.png)',
				output: '![![moon](./inner.png)](outer.png)',
				errors: [{messageId: 'never'}],
			},
			{
				code: '[![`API`](./diagram.png)](./page.md) <img src="./other.png" srcset="./small.png 1x, ./large.png 2x">',
				output: '[![`API`](diagram.png)](page.md) <img src="other.png" srcset="small.png 1x, large.png 2x">',
				errors: 5,
			},
			{
				code: '[![`API`](diagram.png)](page.md) <img src="other.png" srcset="small.png 1x, large.png 2x">',
				output: '[![`API`](./diagram.png)](./page.md) <img src="./other.png" srcset="./small.png 1x, ./large.png 2x">',
				options: ['always'],
				errors: 5,
			},
			{
				code: '<div>\n<a href="./fake\n\nmasked markdown\n\n<!-- " --><img src="./real">',
				output: '<div>\n<a href="./fake\n\nmasked markdown\n\n<!-- " --><img src="real">',
				errors: [{messageId: 'never'}],
			},
			{
				code: '<div>\n<a href="fake\n\nmasked markdown\n\n<!-- " --><img src="real">',
				output: '<div>\n<a href="fake\n\nmasked markdown\n\n<!-- " --><img src="./real">',
				options: ['always'],
				errors: [{messageId: 'always'}],
			},
		].map(testCase => ({...testCase, language: language.language, plugins: language.plugins})),
	});

	test.snapshot({
		valid: [
			'![`API`](https://example.com/diagram.png)',
			'`![image](./image.png) <img src="./image.png">`',
			'```markdown\n![image](./image.png)\n<img src="./image.png">\n```',
			'    ![image](./image.png) <img src="./image.png">',
			'> ![image](\n> ./image.png)',
			'> <div>\n> <script>\n>\n> <a href="./fake">\n>\n> </script>\n> </div>\n\n<img src="./real">',
			'<!-- <img src="./image.png"> -->',
			'<script>\n\n<img src="./fake.png">\n\n</script>',
			'<textarea>\n\n<img src="./fake.png">\n\n</textarea>',
			'<img data-src="./image.png">',
			'<img src="&period;/image.png">',
			'<img src="&#32;./image.png">',
			'<a href="./&quest;query">link</a>',
			'<a href="./http&colon;foo">link</a>',
			'<img srcset="./one.png?a=1&amp;b=2 1x">',
			'<img srcset="./,one.png 1x">',
			'<img\r\n src="./image.png">',
		].map(code => ({code, language})),
		invalid: [
			{code: '[**bold** and *emphasis*](./page.md "title")'},
			{code: '[<span>label</span>](./page.md)'},
			{code: '[`code`](page.md)', options: ['always']},
			{code: '[![`API`](./diagram.png)](./page.md)'},
			{code: '![nested [brackets] and `](./wrong.png)`](./right.png)'},
			{code: '![<span>API</span>](./diagram.png "title")'},
			{code: '![`API`](<./diagram with spaces.png>)'},
			{code: '![`API`](./diagram\\(1\\).png)'},
			{code: '![![moon](inner.png)](outer.png)', options: ['always']},
			{code: '> ![`API`](./diagram.png)'},
			{code: '- ![`API`](\n  ./diagram.png)'},
			{code: '![](./diagram.png)'},
			{code: '[](./page.md)\n\n[reference]: ./reference.md'},
			{code: '<a HREF="./page.html?a=1&amp;b=2">link</a>'},
			{code: '<div>\n<img src=./image.png>\n</div>'},
			{code: '<video poster=\'./poster.png\'></video>'},
			{code: '<a href="  ./page.html  ">link</a>'},
			{code: '<img src="image.png" srcset="small.png 1x, large.png 2x">', options: ['always']},
			{code: '<a href=page.html>link</a>', options: ['always']},
			{code: '<link imagesrcset="./small.png 320w, ./large.png 640w">'},
			{code: '<img srcset="data:image/png;base64,abc 1x, ./large.png 2x">'},
			{code: '<img srcset="./,one.png 1x, ./two.png 2x">'},
			{code: '<div><script>\n\n<img src="./fake.png">\n\n</script>\n<img src="./real.png">\n</div>'},
			{code: '<div><textarea>\n\n<img src="./fake.png">\n\n</textarea>\n<img src="./real.png">\n</div>'},
			{code: '<template><img src="./image.png"></template>'},
			{code: '<img src="./first.png" src="./second.png">'},
			{code: '🦄 <img src="./image.png">'},
		].map(testCase => ({...testCase, language})),
	});
}

test.snapshot({
	valid: [],
	invalid: [
		'| Image |\n| --- |\n| ![`API`](./diagram.png) <img src="./other.png"> |',
		'Footnote[^note]\n\n[^note]: ![`API`](./diagram.png) <img src="./other.png">',
	].map(code => ({code, language: {...languages.markdown, language: 'markdown/gfm'}})),
});

for (const language of [languages.html, ...markdownLanguages]) {
	test({
		valid: [
			'<form action=""><button formaction="">Submit</button></form>',
			'<blockquote cite=""></blockquote>',
			'<form action="https://example.com/submit"><button formaction="/alternate">Submit</button></form>',
			'<blockquote cite="./?query"></blockquote>',
			'<blockquote cite="&#32;./source"></blockquote>',
			'<object data="./manual.pdf"></object><a ping="./ping" srcdoc="./document">link</a>',
			{code: '<form action="/submit"><button formaction="#alternate">Submit</button></form>', options: ['always']},
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), language: language.language, plugins: language.plugins})),
		invalid: [
			{
				code: '<form ACTION="  ./submit?a=1&amp;b=2  "><button formaction=./alternate>Submit</button></form><blockquote cite="./source">Quote</blockquote>',
				output: '<form ACTION="  submit?a=1&amp;b=2  "><button formaction=alternate>Submit</button></form><blockquote cite="source">Quote</blockquote>',
				errors: 3,
			},
			{
				code: '<form action="submit"><button formaction="alternate">Submit</button></form><q cite="source">Quote</q><ins cite="edit">Added</ins><del cite="edit">Removed</del>',
				output: '<form action="./submit"><button formaction="./alternate">Submit</button></form><q cite="./source">Quote</q><ins cite="./edit">Added</ins><del cite="./edit">Removed</del>',
				options: ['always'],
				errors: 5,
			},
			{
				code: '🦄\r\n<form action=" \t./submit?a=1&amp;b=2 \t">\r\n<button formaction=./alternate>Submit</button>\r\n<blockquote cite="./source">Quote</blockquote>\r\n</form>',
				output: '🦄\r\n<form action=" \tsubmit?a=1&amp;b=2 \t">\r\n<button formaction=alternate>Submit</button>\r\n<blockquote cite="source">Quote</blockquote>\r\n</form>',
				errors: [
					{
						messageId: 'never', line: 2, column: 17, endLine: 2, endColumn: 37,
					},
					{
						messageId: 'never', line: 3, column: 20, endLine: 3, endColumn: 31,
					},
					{
						messageId: 'never', line: 4, column: 19, endLine: 4, endColumn: 27,
					},
				],
			},
			{
				code: '<div>\r\n<img\r\n srcset=" ./small.png 1x, ./large.png 2x " />\r\n</div>',
				output: '<div>\r\n<img\r\n srcset=" small.png 1x, large.png 2x " />\r\n</div>',
				errors: [
					{
						messageId: 'never', line: 3, column: 11, endLine: 3, endColumn: 22,
					},
					{
						messageId: 'never', line: 3, column: 27, endLine: 3, endColumn: 38,
					},
				],
			},
			{
				code: '🦄 <a href="./page.html">link</a>',
				output: '🦄 <a href="page.html">link</a>',
				errors: [{
					messageId: 'never', line: 1, column: 13, endLine: 1, endColumn: 24,
				}],
			},
		].map(testCase => ({...testCase, language: language.language, plugins: language.plugins})),
	});
}

test({
	valid: [
		{code: '<form action="./{{ target }}"><button formaction="./{{ target }}">Submit</button></form><blockquote cite="./{{ target }}"></blockquote>'},
		{code: '<form action="{{ target }}"><button formaction="{{ target }}">Submit</button></form><blockquote cite="{{ target }}"></blockquote>', options: ['always']},
	].map(testCase => ({
		...testCase, language: languages.html.language, plugins: languages.html.plugins, languageOptions: {templateEngineSyntax: {'{{': '}}'}},
	})),
	invalid: [],
});

for (const parser of [undefined, parsers.typescript]) {
	const nativeElementCode = [
		'<><a href="page.html" />',
		'<img src="image.png" srcSet="small.png 1x, large.png 2x" />',
		'<link imageSrcSet="preload.png 1x" /><video poster="poster.png" />',
		'<form action="submit"><button formAction="alternate" /></form><q cite="source" /></>;',
	].join('');
	const prefixedNativeElementCode = [
		'<><a href="./page.html" />',
		'<img src="./image.png" srcSet="./small.png 1x, ./large.png 2x" />',
		'<link imageSrcSet="./preload.png 1x" /><video poster="./poster.png" />',
		'<form action="./submit"><button formAction="./alternate" /></form><q cite="./source" /></>;',
	].join('');
	const jsxOptions = {
		...(parser && {filename: 'test.tsx'}),
		languageOptions: {
			...(parser && {parser}),
			parserOptions: {ecmaFeatures: {jsx: true}},
		},
	};
	test({
		valid: [
			'<Component src="./image.png" href="./page.html" />;',
			'<components.Image src="./image.png" />;',
			'<custom-image src="./image.png" />;',
			'<svg:image src="./image.png" />;',
			'<img xlink:href="./image.svg" SRC="./image.png" srcset="./small.png 1x" imagesrcset="./small.png 1x" />;',
			'<button formaction="./submit" />;',
			'<img srcSet={"./small.png 1x"} imageSrcSet={`./large.png 2x`} />;',
			'<img src={image} srcSet={images} />;',
			'<img src />;',
			'<img src="./&#63;query" />;',
			'<img src="./&quest;query" />;',
			'<img src="./&#63query" />;',
			'<img src="./&#128;.png" />;',
			'<img srcSet="./one.png?a=1&amp;b=2 1x" />;',
			'<object data="./manual.pdf" />;',
			{code: '<img src="https://example.com/image.png" srcSet="/small.png 1x" />;', options: ['always']},
			{code: '<Component src="image.png" />;', options: ['always']},
			{code: '<form action=""><button formAction="" /></form>;', options: ['always']},
		].map(testCase => ({...jsxOptions, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
		invalid: [
			{
				code: prefixedNativeElementCode,
				output: nativeElementCode,
				errors: 9,
			},
			{
				code: nativeElementCode,
				output: prefixedNativeElementCode,
				options: ['always'],
				errors: 9,
			},
			{
				code: '<img src="  ./image.png?a=1&amp;b=2  " />;',
				output: '<img src="  image.png?a=1&amp;b=2  " />;',
				errors: [{
					messageId: 'never', line: 1, column: 13, endLine: 1, endColumn: 36,
				}],
			},
			{
				code: '<img\r\n srcSet=" ./small.png 1x, ./large.png 2x " />;',
				output: '<img\r\n srcSet=" small.png 1x, large.png 2x " />;',
				errors: [
					{
						messageId: 'never', line: 2, column: 11, endLine: 2, endColumn: 22,
					},
					{
						messageId: 'never', line: 2, column: 27, endLine: 2, endColumn: 38,
					},
				],
			},
			{
				code: '<img src="./&#63;query" />; new URL("./&#63;query", base);',
				output: '<img src="./&#63;query" />; new URL("&#63;query", base);',
				errors: 1,
			},
			{
				code: String.raw`<img src="./dir\nfile.png" />;`,
				output: String.raw`<img src="dir\nfile.png" />;`,
				errors: 1,
			},
			{
				code: '<img src="./&#102;ile.png" />;',
				output: '<img src="&#102;ile.png" />;',
				errors: 1,
			},
		].map(testCase => ({...jsxOptions, ...testCase})),
	});

	for (const style of ['never', 'always']) {
		const prefix = style === 'never' ? './' : '';
		const replacementPrefix = style === 'never' ? '' : './';
		test({
			valid: [
				`<img src="${prefix}C|/asset" />;`,
				`<img src={"${prefix}C|/asset"} />;`,
				`<img src={\`${prefix}C|/asset\`} />;`,
				`<Component src={"${prefix}image.png"} />;`,
				`<components.Image src={"${prefix}image.png"} />;`,
				`<custom-image src={"${prefix}image.png"} />;`,
				`<svg:image src={"${prefix}image.png"} />;`,
				`<img srcSet={"${prefix}small.png 1x"} imageSrcSet={\`${prefix}large.png 2x\`} />;`,
				`<img src={\`${prefix}\${image}\`} />;`,
				`<img src={String.raw\`${prefix}image.png\`} />;`,
				'<img src={image} />;',
				'<img src={42} />;',
				'<img src={null} />;',
				...['https://example.com/image.png', '/image.png', '../image.png', '?query', '#section', ''].map(url => `<img src={"${url}"} />;`),
				...(parser
					? [
						`<img src={"${prefix}image.png" as string} />;`,
						`<img src={"${prefix}image.png"!} />;`,
						`<img src={"${prefix}image.png" satisfies string} />;`,
					]
					: []),
				...(style === 'never'
					? [
						String.raw`<img src={"./\u003Fquery"} />;`,
						String.raw`<img src={"\u002E/image.png"} />;`,
						'<img src={"./?query"} />;',
						'<img src={"./#section"} />;',
						'<img src={"./"} />;',
					]
					: [String.raw`<img src={"\u003Fquery"} />;`]),
			].map(code => ({...jsxOptions, code, options: [style]})),
			invalid: [
				...[
					{tag: 'a', name: 'href'},
					{tag: 'img', name: 'src'},
					{tag: 'video', name: 'poster'},
					{tag: 'form', name: 'action'},
					{tag: 'button', name: 'formAction'},
					{tag: 'q', name: 'cite'},
				].map(({tag, name}) => ({
					code: `<${tag} ${name}={"${prefix}image.png"} />;`,
					output: `<${tag} ${name}={"${replacementPrefix}image.png"} />;`,
				})),
				{
					code: `<img src={\`${prefix}image.png\`} />;`,
					output: `<img src={\`${replacementPrefix}image.png\`} />;`,
				},
				{
					code: `<img src={/* keep */ ("${prefix}image.png") /* also keep */} />;`,
					output: `<img src={/* keep */ ("${replacementPrefix}image.png") /* also keep */} />;`,
				},
				{
					code: `<img src={"${prefix}&quest;query"} />;`,
					output: `<img src={"${replacementPrefix}&quest;query"} />;`,
				},
				{
					code: String.raw`<img src={"${prefix}f\u006Fo.png"} />;`,
					output: String.raw`<img src={"${replacementPrefix}f\u006Fo.png"} />;`,
				},
				{
					code: `<>🦄\r\n<img src={"${prefix}image.png"} />\r\n</>;`,
					output: `<>🦄\r\n<img src={"${replacementPrefix}image.png"} />\r\n</>;`,
				},
			].map(testCase => ({
				...jsxOptions, ...testCase, options: [style], errors: [{messageId: style}],
			})),
		});
	}
}
