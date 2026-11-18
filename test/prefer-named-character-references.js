import {getTester, languages, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
	valid: [
		'<span title="&copy;">&nbsp;&#x2060;&#39;&#x27E8;</span>;',
		'<span>&#160 &#xA0 &#X00A0; &#xG0; &amp;#160;</span>;',
		'<span title={"&#160;"} hidden>{"&#xA0;"}{/* &#169; */}</span>;',
		'const html = "<span>&#160;</span>";',
		'<span title="&#x000000A0;">&#000000160;&#x100A0;</span>;',
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
			errors: [{messageId: 'prefer-named-character-references'}],
			output: '<p><b title="&copy;">a</p><p>b</p>',
		},
		{
			code: `${disabledHtmlPrefix}<script aria-label="&#169;">const label = '&#169;';</script>\r\n<p data-tab=&#9; title=next>&#160;</p>`,
			filename: 'example.html',
			errors: 3,
			output: `${disabledHtmlPrefix}<script aria-label="&copy;">const label = '&#169;';</script>\r\n<p data-tab=&Tab; title=next>&nbsp;</p>`,
		},
	],
});

test.snapshot({
	valid: [
		htmlCase('<p title="&copy;">&NoBreak; &#x2329; &#x1F929; &#160</p>'),
		htmlCase('<!-- &#160; --><script>const message = "&#160;";</script><style>p::before {content: "&#160;"}</style><xmp><b title="&#160;">&#160;</b></xmp><noscript>&#160;</noscript>'),
		htmlCase('<svg><![CDATA[&#160; <span>&#169;</span>]]></svg><plaintext>&#160;</plaintext><p title="&#160;">&#160;</p>'),
		htmlCase('<span title="{{ &#160; }}">{% &#169; %}</span>{{ render(\'<b>&#160;</b>\') }}'),
		...['\r', '\u2028', '\u2029'].map(lineEnding => htmlCase(`${disabledHtmlPrefix.replaceAll('\r\n', () => lineEnding)}<p>&#169;</p>`)),
		{
			...htmlCase('[[render(\'<b>&#169;</b>\')]]'),
			languageOptions: {templateEngineSyntax: [{open: '[[', close: ']]'}]},
		},
		{
			...htmlCase('<custom>&#160;<p title="&#169;">&#160;</p></custom>'),
			languageOptions: {rawContentTags: ['custom']},
		},
		markdownCase('`&#160;`\n\n```html\n<p>&#160;</p>\n```\n\n<div>&#160;</div>'),
		markdownCase(String.raw`\&#160; &#00000160; &#x00000A0; &#160 &nbsp; &#128; &#x2329;`),
		markdownCase('[&#160;] [**&#160;**]\n\n[&#160;]: /original\n[**&nbsp;**]: /alternate'),
		markdownCase('<https://example.com/&#160;> and www.example.com/&#160;z', 'markdown/gfm'),
		markdownCase('[^&#160;]\n\n[^&nbsp;]: Note', 'markdown/gfm'),
		markdownCase('&#169; Visit &#104;ttps://example.com.', 'markdown/gfm'),
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
		markdownCase('| Cell |\n| - |\n| &#x1D504; |', 'markdown/gfm'),
		markdownCase('www.example.com/&#160; and Copyright &#169;', 'markdown/gfm'),
		{
			...markdownCase('$&#160;$ and &#169;'),
			languageOptions: {math: true},
		},
		markdownCase(String.raw`Render &#9; and &#10;, then \&#160;, &#x110000;.`, 'markdown/gfm'),
		markdownCase('Copyright &#169; <span title="&#169;">A&#160;B</span>'),
	],
});
