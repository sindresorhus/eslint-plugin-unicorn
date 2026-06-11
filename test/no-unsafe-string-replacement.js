import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'template.replace("{url}", "https://example.com")',
		'template.replace("{url}", `https://example.com`)',
		'template.replace("{url}", () => htmlEscape(url))',
		'template.replace("{url}", function () { return htmlEscape(url); })',
		'template.replaceAll("{url}", "https://example.com")',
		'template.replaceAll("{url}", `https://example.com`)',
		'template.replaceAll("{url}", () => htmlEscape(url))',
		'template.replaceAll("{url}", function () { return htmlEscape(url); })',
		'template.replace("{url}", "$` onerror=alert(1) ")',
		'template.replace("{url}")',
		'template.replace(...argumentsArray)',
		'template.replace("{url}", ...replacement)',
		'template[replace]("{url}", replacement)',
		'template["replace"]("{url}", replacement)',
		'template.notReplace("{url}", replacement)',
		'replace("{url}", replacement)',
	],
	invalid: [
		'template.replace("{url}", htmlEscape(url))',
		'template.replaceAll("{url}", htmlEscape(url))',
		'template.replace("{url}", replacement)',
		'template.replace("{url}", replacement, extraArgument)',
		'template.replace("{url}", options.replacement)',
		'template.replace("{url}", String(url))',
		'template.replace("{url}", `${url}`)', // eslint-disable-line no-template-curly-in-string
		'template.replace("{url}", url ? htmlEscape(url) : "")',
		'template.replace("{url}", {toString() { return url; }})',
		'template.replace("{url}", (htmlEscape(url), url))',
		'async function foo() { template.replace("{url}", htmlEscape(await url)); }',
		'template?.replace("{url}", replacement)',
		'template.replace?.("{url}", replacement)',
		[
			'template.replace(',
			'\t"{url}",',
			'\t/* comment */ htmlEscape(url)',
			')',
		].join('\n'),
	],
});
