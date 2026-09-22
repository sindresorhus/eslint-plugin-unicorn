import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const commonmark = code => ({code, filename: 'example.md', language: languages.markdown});
const gfm = code => ({
	code,
	filename: 'example.md',
	language: {...languages.markdown, language: 'markdown/gfm'},
});

test.snapshot({
	valid: [
		commonmark('[Website](https://example.com) [Email](mailto:hello@example.com) ![Image](data:image/png;base64,abc)'),
		commonmark('[Link](https://example.com "javascript:alert(1)")'),
		commonmark('The text javascript:alert(1) is not a link.'),
		commonmark('`[Link](javascript:alert(1))`'),
		commonmark('```md\n[Link](javascript:alert(1))\n```'),
		commonmark('<a href="javascript:alert(1)">Link</a>'),
		commonmark('[Safe][destination]\n\n[destination]: https://example.com'),
		commonmark('[Other scheme](javascriptx:alert(1)) [Relative](./javascript:alert(1))'),
		gfm('[Website](https://example.com)'),
	],
	invalid: [
		commonmark('[Link](javascript:alert(1))'),
		commonmark('![Image](javascript:alert(1))'),
		commonmark('<javascript:alert(1)>'),
		commonmark('[Link](<javascript:alert(1)>)'),
		commonmark('[Link](JaVaScRiPt:alert(1))'),
		commonmark('[Link](javasc&#114;ipt:alert(1))'),
		commonmark('[Link](javascript&#58;alert(1))'),
		commonmark(String.raw`[Link](javascript\:alert(1))`),
		commonmark('[Link](java&#9;script:alert(1))'),
		commonmark('[Link](java&#10;script:alert(1))'),
		commonmark('[Link](<&#9;javascript:alert(1)>)'),
		commonmark('[First](javascript:alert(1)) [Second](javascript:alert(2))'),
		commonmark('[Link][destination]\n[Again][destination]\n\n[destination]: javascript:alert(1)'),
		commonmark('![Image][destination]\n\n[destination]: javascript:alert(1)'),
		commonmark('[unused]: javascript:alert(1)'),
		commonmark('[destination]: java&#9;script:alert(1)'),
		gfm('[Link](javascript:alert(1))'),
		gfm('![Image](javascript:alert(1))'),
		gfm('<javascript:alert(1)>'),
		gfm('<JaVaScRiPt:alert(1)>'),
		gfm('[unused]: javascript:alert(1)'),
	],
});
