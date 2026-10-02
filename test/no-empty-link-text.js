import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const markdownCases = code => ['markdown/commonmark', 'markdown/gfm'].map(language => ({
	code,
	filename: 'example.md',
	language: {...languages.markdown, language},
}));

test.snapshot({
	valid: [
		'[Website](https://example.com)',
		'[ Website ](https://example.com)',
		'[*Website*](https://example.com)',
		'[**Website**](https://example.com)',
		'[***Website***](https://example.com)',
		'[~~Website~~](https://example.com)',
		'[`website`](https://example.com)',
		'[`&nbsp;`](https://example.com)',
		'[$ $](https://example.com)',
		'[&amp;](https://example.com)',
		String.raw`[\&nbsp;](https://example.com)`,
		'[** **](https://example.com)',
		'[![Build](badge.svg)](https://example.com)',
		'[![ Build ](badge.svg)](https://example.com)',
		'[*![Build](badge.svg)*](https://example.com)',
		'[![](icon.svg) ![Build](badge.svg)](https://example.com)',
		'[![](icon.svg) Website](https://example.com)',
		'[Website ![   ](icon.svg)](https://example.com)',
		'[Website]()',
		'[Website](#)',
		'[Website][destination]\n\n[destination]: https://example.com',
		'[destination][]\n\n[destination]: https://example.com',
		'[destination]\n\n[destination]: https://example.com',
		'[![Build][badge]](https://example.com)\n\n[badge]: badge.svg',
		'[![Build][badge]][destination]\n\n[badge]: badge.svg\n[destination]: https://example.com',
		'[<span></span>](https://example.com)',
		'[<img src="icon.svg" alt="Website">](https://example.com)',
		'[*<span></span>*](https://example.com)',
		'[![](icon.svg) *<span></span>*](https://example.com)',
		'[<span></span>][destination]\n\n[destination]: https://example.com',
		'[<!-- label -->](https://example.com)',
		'<a href="https://example.com"></a>',
		'[ ][missing]',
		'![   ](image.png)',
		'![][image]\n\n[image]: image.png',
		'[unused]: https://example.com',
		'`[](https://example.com)`',
		'```md\n[](https://example.com)\n```',
		'    [](https://example.com)',
		'<https://example.com>',
		'<hello@example.com>',
	].flatMap(code => markdownCases(code)),
	invalid: [
		'[](https://example.com)',
		'[   ](https://example.com)',
		'[\t](https://example.com)',
		'[ \n ](https://example.com)',
		'[ \r\n ](https://example.com)',
		'[&nbsp;](https://example.com)',
		'[&#32;&#xA0;](https://example.com)',
		'[*&nbsp;*](https://example.com)',
		'[**&nbsp;**](https://example.com)',
		'[***&nbsp;***](https://example.com)',
		'[` `](https://example.com)',
		'[  \n](https://example.com)',
		'[\\\n](https://example.com)',
		'[![](badge.svg)](https://example.com)',
		'[![   ](badge.svg)](https://example.com)',
		'[![&nbsp;](badge.svg)](https://example.com)',
		'[![**&nbsp;**](badge.svg)](https://example.com)',
		'[*![](badge.svg)*](https://example.com)',
		'[![](badge.svg) ` `](https://example.com)',
		'[![ ](first.svg) ![](second.svg)](https://example.com)',
		'[](https://example.com "Website")',
		'[![](badge.svg "Build")](https://example.com)',
		'[]()',
		'[](#)',
		'[][destination]\n\n[destination]: https://example.com',
		'[ ][destination]\n\n[destination]: https://example.com',
		'[&nbsp;][]\n\n[&nbsp;]: https://example.com',
		'[&nbsp;]\n\n[&nbsp;]: https://example.com',
		'[**&nbsp;**][destination]\n\n[destination]: https://example.com',
		'[![][badge]](https://example.com)\n\n[badge]: badge.svg',
		'[![   ][badge]][destination]\n\n[badge]: badge.svg\n[destination]: https://example.com',
		'[Website](https://example.com) [](first)\n\nText [ ](second)',
		'[ ](first) [<span></span>](second) [](third)',
		'[![&nbsp;][]](https://example.com)\n\n[&nbsp;]: badge.svg',
		'[![&nbsp;]](https://example.com)\n\n[&nbsp;]: badge.svg',
		'[![` `](image.png)](https://example.com)',
	].flatMap(code => markdownCases(code)),
});

test.snapshot({
	valid: [
		{code: '[~~&nbsp;~~](https://example.com)', language: languages.markdown},
		{
			code: '[[^note]](https://example.com)\n\n[^note]: A footnote',
			language: {...languages.markdown, language: 'markdown/gfm'},
		},
	],
	invalid: [
		{
			code: '[~~&nbsp;~~](https://example.com)',
			language: {...languages.markdown, language: 'markdown/gfm'},
		},
	],
});

test.snapshot({
	testerOptions: {languageOptions: {math: true}},
	valid: [
		'[$x$](https://example.com)',
		'[$&nbsp;$](https://example.com)',
		'[*$x$*](https://example.com)',
	].flatMap(code => markdownCases(code)),
	invalid: [
		'[$ $](https://example.com)',
		'[*$ $*](https://example.com)',
	].flatMap(code => markdownCases(code)),
});

test.snapshot({
	testerOptions: {languageOptions: {frontmatter: 'yaml'}},
	valid: [],
	invalid: markdownCases('---\ntitle: "[](https://example.com)"\n---\n\n[](https://example.com)'),
});
