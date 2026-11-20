import {getTester, languages, parsers} from './utils/test.js';

const {test, ruleId} = getTester(import.meta);

test.snapshot({
	testerOptions: {languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
	valid: [
		'<span title="&copy;">&nbsp;&#x2060;&#39;&#x27E8;</span>;',
		'<span>&#160 &#xA0 &#X00A0; &#xG0; &amp;#160;</span>;',
		String.raw`const reference = "&#160 &#xG0; &#x1F929; \u0026#x2060;"; // &#169;`,
		'<span title="&#x000000A0;">&#000000160;&#x100A0;</span>;',
		'import data from "./data.json" with {"&#169;": "first", "&copy;": "second"};',
		{
			code: 'const label: JSX.Element = <span title="&#000000160;">&#x2060;</span>;',
			filename: 'file.tsx',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'<span>&#xA0;</span>;',
		'<span title="Copyright &#169;">A&#160;B&#x2060;</span>;',
		'<Label /* note */ title=\'&#34;&#38;\'>&#60;&#62;</Label>;',
		'<>\r\n  😀&#00000160;&#x00000a0;\r\n  &#x2329;&#x232A;\r\n</>;',
		{
			code: 'const label: JSX.Element = <span title="&#xA9;">&#8212;{"&#160;"}</span>;',
			filename: 'file.tsx',
			languageOptions: {parser: parsers.typescript},
		},
		'<span title="&#38;#169;">&#38;#160;</span>;',
		'<span title={"&#160;"} hidden>{"&#xA0;"}{/* &#169; */}</span>;',
		'const html = "<span>&#160;</span>";',
		'const html = tag`&#169;${name}&#xA0; &#${number};`;', // eslint-disable-line no-template-curly-in-string
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'const reference = "&#x2060;";',
			errors: [{
				messageId: ruleId,
				suggestions: [{messageId: 'replace', output: 'const reference = "&NoBreak;";'}],
			}],
		},
	],
});

test.snapshot({
	testerOptions: {languageOptions: {parser: parsers.vue}},
	valid: [
		'<template><p :title="\'&#169;\'">{{ "&#160;" }}</p><style>.example::after {content: "&#169;"}</style></template>',
		'<template><p title="&copy;">&NoBreak; &#x1F929;</p><!-- &#160; --></template>',
		'<template><svg><script type="application/json">{"label":"&#169;"}</script></svg></template>',
	],
	invalid: [
		'<template><p title="Copyright &#169;" data-space=&#160>A&#x2060;B</p></template>',
		'<template><textarea>&#160</textarea><p title="&copyx &#128">&#169</p></template><script>const label = "&#160;";</script>',
	],
});

test.svelte({
	valid: [
		{code: '<style>.example::after {content: "&#169;"}</style><p title="{label}" style:color="&#169;">&NoBreak;</p><!-- &#160; -->', filename: 'example.svelte'},
		{code: '<div><iFrame><span>&#169;</span></iFrame><script>&#160;</script></div>', filename: 'example.svelte'},
	],
	invalid: [
		{
			code: '<p title="Copyright &#169;" data-space=&#160>A&#x2060;B</p><textarea>&#169;</textarea>',
			filename: 'example.svelte',
			errors: 4,
			output: '<p title="Copyright &copy;" data-space=&nbsp;>A&NoBreak;B</p><textarea>&copy;</textarea>',
		},
		{
			code: '<p title="A&#160{label ?? \'&#169;\'}&#x2060;B"></p>',
			filename: 'example.svelte',
			errors: [
				{messageId: ruleId},
				{
					messageId: ruleId,
					suggestions: [{messageId: 'replace', output: '<p title="A&#160{label ?? \'&copy;\'}&#x2060;B"></p>'}],
				},
				{messageId: ruleId},
			],
			output: '<p title="A&nbsp;{label ?? \'&#169;\'}&NoBreak;B"></p>',
		},
	],
});

const htmlCase = code => ({code, filename: 'example.html', language: languages.html});
const markdownCase = (code, language = 'markdown/commonmark') => ({
	code,
	filename: 'example.md',
	language: {...languages.markdown, language},
});

const disabledHtmlPrefix = '<!-- eslint-disable-next-line rule-to-test/prefer-named-character-references -->\r\n<p>&#169;</p>\r\n';

test({
	testerOptions: {language: languages.html.language, plugins: languages.html.plugins},
	valid: [],
	invalid: [
		{
			code: '<p><b title="&#169;">a</p><p>b</p>',
			filename: 'example.html',
			errors: [{messageId: ruleId}],
			output: '<p><b title="&copy;">a</p><p>b</p>',
		},
		{
			code: `\uFEFF${disabledHtmlPrefix}<script aria-label="&#000000169;">const label = '&#169;';</script>\r\n<p data-tab=&#9; title=next>&#x000000A0;</p>`,
			filename: 'example.html',
			errors: 3,
			output: `\uFEFF${disabledHtmlPrefix}<script aria-label="&copy;">const label = '&#169;';</script>\r\n<p data-tab=&Tab; title=next>&nbsp;</p>`,
		},
		{
			code: '<svg><use href="#&#169;" xlink:href="#&#xA0;"/></svg>',
			filename: 'example.html',
			errors: 2,
			output: '<svg><use href="#&copy;" xlink:href="#&nbsp;"/></svg>',
		},
		{
			code: '<p title="A&#x2060Z" data-space=&#160>A&#169B &#xA0B &#128</p>',
			filename: 'example.html',
			errors: 4,
			output: '<p title="A&NoBreak;Z" data-space=&nbsp;>A&copy;B &#xA0B &euro;</p>',
		},
	],
});

test({
	testerOptions: {
		language: 'markdown/gfm',
		plugins: languages.markdown.plugins,
		languageOptions: {frontmatter: 'yaml'},
	},
	valid: [],
	invalid: [
		{
			code: '---\rtitle: "Copyright &#169;"\r---\r\r> 1. Copyright &#169;\r>    A&#160;B',
			filename: 'example.md',
			errors: [
				{messageId: ruleId, line: 5, column: 16},
				{messageId: ruleId, line: 6, column: 7},
			],
			output: '---\rtitle: "Copyright &#169;"\r---\r\r> 1. Copyright &copy;\r>    A&nbsp;B',
		},
	],
});

test({
	testerOptions: {language: 'markdown/commonmark', plugins: languages.markdown.plugins},
	valid: [{code: '![`a](b &#169;`](/a&#160; "Copyright &#169;")', filename: 'example.md'}],
	invalid: [
		{
			code: '[A&#169;]\n\n[A&#169;]: /a&#160;b "Copyright &#169;"',
			filename: 'example.md',
			errors: 2,
			output: '[A&#169;]\n\n[A&#169;]: /a&nbsp;b "Copyright &copy;"',
		},
		{
			code: '![`&#169;`](</a&#x2060;b.png> "Copyright &#169;")',
			filename: 'example.md',
			errors: 2,
			output: '![`&#169;`](</a&NoBreak;b.png> "Copyright &copy;")',
		},
		{
			code: '[![Preview](/image&#160;.png)](/page&#169;)',
			filename: 'example.md',
			errors: 2,
			output: '[![Preview](/image&nbsp;.png)](/page&copy;)',
		},
	],
});

test.snapshot({
	valid: [
		htmlCase('<p title="&copy;">&NoBreak; &#x2329; &#x1F929; &#xG0 &# &#x;</p>'),
		htmlCase('<!-- &#160 --><script>const message = "&#160";</script><style>p::before {content: "&#160;"}</style><xmp><b title="&#160;">&#160;</b></xmp><noscript>&#160;</noscript>'),
		htmlCase('<svg><![CDATA[&#160; <span>&#169;</span>]]></svg><plaintext>&#160;</plaintext><p title="&#160;">&#160;</p>'),
		htmlCase('<span title="{{ &#160; }}">{% &#169; %}</span>{{ render(\'<b>&#160;</b>\') }}'),
		...['\r', '\u2028', '\u2029'].map(lineEnding => htmlCase(`${disabledHtmlPrefix.replaceAll('\r\n', () => lineEnding)}<p>&#169;</p>`)),
		...[{'[[': ']]'}, [{open: '[[', close: ']]'}]].map(templateEngineSyntax => ({
			...htmlCase('[[render(\'<b>&#169;</b>\')]]<p>&#160;</p>'),
			languageOptions: {templateEngineSyntax},
		})),
		{
			...htmlCase('<custom>&#160;<p title="&#169;">&#160;</p></custom>'),
			languageOptions: {rawContentTags: ['custom']},
		},
		markdownCase('`&#160;`\n\n```html\n<p>&#160;</p>\n```\n\n<div>&#160;</div>'),
		markdownCase(String.raw`\&#160; &#00000160; &#x00000A0; &#160 &#xA0 &nbsp; &#128; &#x2329;`),
		markdownCase('[&#160;] [**&#160;**]\n\n[&#160;]: /original\n[**&nbsp;**]: /alternate'),
		markdownCase('<https://example.com/&#160;> and www.example.com/&#160;z', 'markdown/gfm'),
		markdownCase('[^&#160;]\n\n[^&nbsp;]: Note', 'markdown/gfm'),
		markdownCase('&#169; Visit &#104;ttps://example.com.', 'markdown/gfm'),
		{code: '/* &#160; */ a { background: url(/image&#169;); }', language: languages.css},
		{code: '{"&#169;": 160, "alreadyNamed": "&nbsp;"}', language: languages.json},
		{code: '"&#169;": 1\n"&copy;": 2', language: languages.soml},
		{code: '"&#169;" = 1\n"&copy;" = 2', language: languages.toml},
		{code: '"&#169;": 1\n"&copy;": 2\nempty: > # &#160;', language: languages.yaml},
	],
	invalid: [
		htmlCase('<p title="Copyright &#169;" data-space=&#X00A0;>A&#x2060;B &#128;</p>'),
		htmlCase('<template><textarea>\n  &#160;<b title="&#169;">text</b></textarea></template>'),
		{
			...htmlCase('---\ntitle: A&#160;B\n---\n<p>&#160;</p>'),
			languageOptions: {frontmatter: true},
		},
		htmlCase('<p>&#x27E8;</p><script>const literal = "&#x27E8;";</script><svg><![CDATA[&#x27E8;]]></svg>'),
		markdownCase('# A&#x2060;B\r\n\r\n> Price &#X20AC; and \\&#160;\r\n> Space \\\\&#160;'),
		markdownCase('[A&#169;B](/&#160;)'),
		markdownCase('| Cell |\n| - |\n| Left\\|right &#x1D504; and \\&#160; |', 'markdown/gfm'),
		markdownCase('www.example.com/&#160; and Copyright &#169;', 'markdown/gfm'),
		{
			...markdownCase('$&#160;$ and &#169;'),
			languageOptions: {math: true},
		},
		markdownCase(String.raw`Render &#9; and &#10;, then \&#160;, &#x110000;.`, 'markdown/gfm'),
		markdownCase('Copyright &#169; <span title="&#169;">A&#160;B</span>'),
		{code: 'a { content: "&#x2060;"; background: url("/image&#169;"); --label: "&#160;"; }', language: languages.css},
		{code: '{"label": "&#x2060;"}', language: languages.json},
		{code: '{"label": "&#160;" /* &#169; */}', language: languages.jsonc},
		{code: '{label: \'&#160;\',}', language: languages.json5},
		{code: 'label: "&#x2060;"', language: languages.soml},
		{code: 'literal = \'&#x2060;\'\nmultiline = """&#160;"""', language: languages.toml},
		{code: 'label: | # &#169;\r\n  &#x2060;\r\nother: text &#160; # &#169;', language: languages.yaml},
		markdownCase(String.raw`[Guide](/a&#x2060;b "Copyright &#169; and \&#160;") and [](/&#160;)`),
		markdownCase('> [Guide](\n> </guide/&#160;>\n> "Copyright &#169;"\n> )', 'markdown/gfm'),
		markdownCase('> | Image |\n> | - |\n> | ![Guide](/a&#160;b.png "Copyright &#169;") |', 'markdown/gfm'),
		{code: '? &key "&#169;"\n: 1\nlabel: &text "&#x2060;"', language: languages.yaml},
	],
});
