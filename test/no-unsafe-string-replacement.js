import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		'template.replace("{url}", "https://example.com")',
		'template.replace("{url}", `https://example.com`)',
		'template.replace("{url}", String.raw`https://example.com`)',
		'template.replace("{url}", () => htmlEscape(url))',
		'template.replace("{url}", function () { return htmlEscape(url); })',
		{
			code: 'template.replace("{url}", "https://example.com" as string)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'template.replace("{url}", "https://example.com" satisfies string)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'template.replace("{url}", "https://example.com"!)',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'template.replace("{url}", <string>"https://example.com")',
			languageOptions: {parser: parsers.typescript},
		},
		'template.replaceAll("{url}", "https://example.com")',
		'template.replaceAll("{url}", `https://example.com`)',
		'string.replaceAll(/(?<symbol>`|\\$(?={))/g, String.raw`\\$<symbol>`)',
		'template.replaceAll("{url}", () => htmlEscape(url))',
		'template.replaceAll("{url}", function () { return htmlEscape(url); })',
		'template.replace("{url}", "$` onerror=alert(1) ")',
		'template.replace("{url}")',
		'template.replace("{url}", replacement, extraArgument)',
		'template.replace(...argumentsArray)',
		'template.replace("{url}", ...replacement)',
		'template[replace]("{url}", replacement)',
		'template["replace"]("{url}", replacement)',
		'template.notReplace("{url}", replacement)',
		'replace("{url}", replacement)',
		'const router = useRouter(); router.replace(pathname, {locale});',
		'const router = useRouter(); const options = {locale}; router.replace(pathname, options);',
		'router.replace(pathname, {locale: nextLocale});',
		{
			code: 'router.replace(pathname, {locale: nextLocale} as RouterOptions);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const options = {locale: nextLocale}; router.replace(pathname, options as RouterOptions);',
			languageOptions: {parser: parsers.typescript},
		},
		// Receiver is provably not a string, so this is not `String#replace`
		{
			code: 'declare const router: {replace(href: string, options: object): void}; router.replace(pathname, {locale});',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(object: {replaceAll(a: string, b: object): void}) { object.replaceAll("{url}", {}); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: number) { value.replace("{url}", replacement); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			declare const pathname: string;
			declare const options: unknown;
			declare function useRouter(): {replace(href: string, options: unknown): void};
			useRouter().replace(pathname, options);
		`),
	],
	invalid: [
		'template.replace("{url}", htmlEscape(url))',
		'template.replaceAll("{url}", htmlEscape(url))',
		'template.replace("{url}", replacement)',
		'template.replace("{url}", options.replacement)',
		// Optional member expression replacement
		'template.replace("{url}", options?.replacement)',
		'template.replace("{url}", String(url))',
		'template.replace("{url}", String.raw`${url}`)', // eslint-disable-line no-template-curly-in-string
		// A non-`String.raw` tagged template is not a known-safe literal
		'template.replace("{url}", css`safe string`)',
		'const String = {raw: () => replacement}; template.replace("{url}", String.raw`ignored`)',
		{
			code: 'template.replace("{url}", htmlEscape(url) as string)',
			languageOptions: {parser: parsers.typescript},
		},
		'template.replace("{url}", `${url}`)', // eslint-disable-line no-template-curly-in-string
		'template.replace("{url}", url ? htmlEscape(url) : "")',
		'template.replace("{url}", {toString() { return url; }})',
		'template.replace("{url}", {toString: () => url})',
		'template.replace("{url}", {valueOf: () => url})',
		'template.replace("{url}", {__proto__: {toString() { return url; }}})',
		'template.replace("{url}", [url])',
		'template.replace("{url}", 1)',
		'template.replace("{url}", (htmlEscape(url), url))',
		'template.replaceAll("{url}", String(++count))',
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
