/* eslint-disable no-template-curly-in-string */
import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

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

const nonRelativeUrls = ['https://example.com/image.png', '//example.com/image.png', '/image.png', '#section', '?query', 'data:image/png;base64,abc', '../image.png', './', './?query', './#section', './https://example.com/image.png'];

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
			'<svg><image xlink:href="./image.svg" /></svg>',
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
			{code: '🦄\r\n\r\n<div>\r\n<img\r\n src="./image.png"\r\n srcset="./small.png 1x, ./large.png 2x">\r\n</div>'},
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
