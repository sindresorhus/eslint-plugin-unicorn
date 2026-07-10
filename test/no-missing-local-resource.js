import path from 'node:path';
import {fileURLToPath} from 'node:url';
import html from '@html-eslint/eslint-plugin';
import markdown from '@eslint/markdown';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const fixtureDirectory = fileURLToPath(new URL('fixtures/no-missing-local-resource/', import.meta.url));
const markdownFilename = path.join(fixtureDirectory, 'document.md');
const nestedMarkdownFilename = path.join(fixtureDirectory, 'nested', 'document.md');
const htmlFilename = path.join(fixtureDirectory, 'document.html');

const commonMark = {
	language: 'markdown/commonmark',
	plugins: {markdown},
};

const gfm = {
	language: 'markdown/gfm',
	plugins: {markdown},
};

const htmlLanguage = {
	language: 'html/html',
	plugins: {html},
};

const markdownCase = (code, filename = markdownFilename) => ({code, filename, language: commonMark});
const htmlCase = (code, languageOptions) => ({
	code,
	filename: htmlFilename,
	language: htmlLanguage,
	languageOptions,
});

test.snapshot({
	valid: [
		markdownCase('[Guide](./guide.md)\n![Logo](./assets/logo.svg)'),
		markdownCase('[Guide](guide.md)\n[Directory](./directory/)\n[Encoded](./encoded%20name.md)\n[Query](./guide.md?raw=1#heading)\n[Linked](./linked-guide.md)'),
		markdownCase('[Directory](./directory)'),
		markdownCase('[Encoded hash](./encoded%23name.md)'),
		markdownCase('[Encoded separator](./Assets%2FLOGO.svg)'),
		markdownCase('[Parent](../guide.md)', nestedMarkdownFilename),
		{
			code: '[Guide](./guide.md)',
			filename: markdownFilename,
			language: gfm,
		},
		markdownCase('[Guide][guide]\n[Guide again][guide]\n\n[guide]: ./guide.md'),
		markdownCase('[Website](https://example.com)\n[Email](mailto:test@example.com)\n[Fragment](#heading)\n[Root](/guide.md)\n[Protocol relative](//example.com/guide.md)\n[Issue](github:issue/123)\n![Inline data](data:image/svg+xml,%3Csvg%3E)'),
		markdownCase('<img src="./missing.svg">'),
		htmlCase('<a href="./guide.md">Guide</a><img src="./assets/logo.svg"><script src="./app.js"></script><link href="./style.css"><video poster="./poster.jpg"></video>'),
		htmlCase('<img srcset="./assets/logo-1x.png 1x, data:image/svg+xml,%3Csvg%3E 2x, ./assets/logo-2x.png 3x">'),
		htmlCase('<img srcset="./assets/logo-1x.png,./assets/logo-2x.png">'),
		htmlCase('<img srcset="./assets/logo.svg&#32;1x,./assets/logo-2x.png&#x20;2x">'),
		htmlCase('<img srcset="./assets/logo.svg&#' + '0'.repeat(80) + '32;1x, ./assets/logo-2x.png 2x">'),
		htmlCase('<img srcset="./assets/logo-1x.png&#44;./assets/logo-2x.png">'),
		htmlCase('<img srcset="d&#97;ta:image/svg+xml,%3Csvg%3E 1x, ./assets/logo-2x.png 2x">'),
		htmlCase('<img srcset=",./assets/logo-1x.png,, ./assets/logo-2x.png,">'),
		htmlCase('<a href="https://example.com"></a><a href="mailto:test@example.com"></a><a href="#heading"></a><a href="/guide.md"></a><a href="//example.com/guide.md"></a><a href="github:issue/123"></a><img src="data:image/svg+xml,%3Csvg%3E">'),
		htmlCase('<a href="./assets/logo&#46;svg"></a><a href="./assets&sol;logo.svg"></a>'),
		htmlCase('<a href=""></a><img src=" "><video poster=""></video>'),
		htmlCase('<a href="\v./guide.md\v"></a>'),
		htmlCase('<a href="&#9;./guide.md&#10;"></a>'),
		htmlCase('<img src="{{ assetPath }}">', {templateEngineSyntax: {'{{': '}}'}}),
		htmlCase('<img src=./assets/{{ assetPath }}>', {templateEngineSyntax: {'{{': '}}'}}),
		htmlCase('<img srcset="./assets/missing.png 1x, {{ assetPath }} 2x">', {templateEngineSyntax: {'{{': '}}'}}),
	],
	invalid: [
		markdownCase('[Missing](./missing.md)'),
		markdownCase('[Missing](missing.md)'),
		markdownCase('[Logo](./Assets/logo.svg)'),
		markdownCase('![Logo](./Assets/logo.svg)'),
		markdownCase('[Logo](<./Assets/logo.svg> "title")'),
		markdownCase('[Logo](./Assets/logo.svg?raw=1#title)'),
		markdownCase('[Guide][guide]\n[Guide again][guide]\n\n[guide]: ./missing.md'),
		markdownCase('[Guide][guide]\n\n[guide]: ./Assets/logo.svg'),
		markdownCase('[Missing](./missing%)'),
		markdownCase('[Logo](./Assets/logo.svg "./Assets/logo.svg")'),
		markdownCase('[Logo](./Assets/logo.svg "title ]( text")'),
		markdownCase(String.raw`[Logo](./Assets/logo\.svg)`),
		markdownCase(String.raw`[foo \]( ./Assets/logo.svg](./Assets/logo.svg)`),
		markdownCase('[foo `]( ./Assets/logo.svg` bar](./Assets/logo.svg)'),
		markdownCase('[Encoded](./Encoded%20name.md)'),
		markdownCase('[Encoded hash](./Encoded%23name.md)'),
		markdownCase('[Invalid](./guide.md/../guide.md)'),
		htmlCase('<a href="./missing.html"></a><img src="./assets/LOGO.svg">'),
		htmlCase('<a HREF="./missing.html"></a><img SRC="./assets/missing.png"><video POSTER="./missing.jpg"></video>'),
		htmlCase('<a href="\u00A0./guide.md"></a>'),
		htmlCase('<img src=./assets/missing.png>'),
		htmlCase('<img src = ./assets/missing.png>'),
		htmlCase('<img src=./assets/LOGO.svg>'),
		htmlCase('<img src=./assets/LOGO.svg?raw=1>'),
		htmlCase('<img srcset=./assets/logo-1x.png,./assets/missing.png>'),
		htmlCase('<img srcset="./assets/logo-1x.png 1x, ./assets/missing.png 2x, ./assets/logo-2x.png 3x">'),
		htmlCase('<img srcset="./assets/logo.svg&nbsp;1x">'),
		htmlCase('<img srcset="./assets/logo-1x.png, ./assets/LOGO.svg 2x, data:image/svg+xml,%3Csvg%3E 3x">'),
		htmlCase('<a href="./assets/Logo&#46;svg"></a><img srcset="./assets/logo&#46;svg 1x, ./assets/missing&#46;png 2x">'),
		htmlCase('<img src="./assets&sol;missing.png">'),
	],
});
