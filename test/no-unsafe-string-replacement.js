import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: parsers.typescript,
		parserOptions: {project: false, projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		String.raw`text.replaceAll("\t", " ".repeat(4))`,
		String.raw`text.replaceAll("\t", "\u00A0".repeat(4))`,
		'text.replace("pattern", "".repeat(count))',
		'text.replace("pattern", " ".repeat(count))',
		'text.replace("pattern", " ".repeat(getCount()))',
		// Repeat counts must not be evaluated; static evaluation of this expression can exhaust resources.
		'text.replace("pattern", " ".repeat(2n ** 100000000000n))',
		'text.replace("pattern", " ".repeat())',
		'text.replace("pattern", " ".repeat(...counts))',
		'text.replace("pattern", " ".repeat(4, extra))',
		'text.replace("pattern", ` `.repeat(count))',
		{
			code: 'text.replace("pattern", ((" " as string).repeat(count)) satisfies string)',
			languageOptions: {parser: parsers.typescript},
		},
		'template.replace("{url}", "https://example.com")',
		'template.replace("{url}", `https://example.com`)',
		'template.replace("{url}", String.raw`https://example.com`)',
		'template.replace("{url}", () => htmlEscape(url))',
		'template.replace("{url}", function () { return htmlEscape(url); })',
		'text.replace(/pattern/, replacer); function replacer() { return replacement; }',
		'const replacer = () => replacement; text.replaceAll(/pattern/g, replacer);',
		'function replacer() { return replacement; } const alias = replacer; const callback = alias; text.replace(/pattern/, callback);',
		'/** @param {function(string): string} replacer */ function run(replacer) { text.replace(/pattern/, replacer); }',
		'/** @type {(() => string) | undefined} */ const replacer = () => replacement; text.replace(/pattern/, replacer);',
		{
			code: 'function run(text: string, replacer: (match: string) => string) { text.replace(/pattern/, replacer); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Replacer = {(match: string): string; label: string}; function run(text: string, replacer: Replacer) { text.replace(/pattern/, replacer); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function replacer<Value>(match: Value) { return String(match); } text.replace(/pattern/, replacer<string>);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function replacer<Value>(match: Value) { return String(match); } const callback = replacer<string>; text.replace(/pattern/, callback);',
			languageOptions: {parser: parsers.typescript},
		},
		'element.classList.replace(oldClass, newClass);',
		'const tokens = element.classList; tokens.replace(oldClass, newClass);',
		'/** @param {DOMTokenList} tokens */ function run(tokens) { tokens.replace(oldClass, newClass); }',
		{
			code: 'function run(tokens: DOMTokenList, oldClass: string, newClass: string) { tokens.replace(oldClass, newClass); }',
			languageOptions: {parser: parsers.typescript},
		},
		'const editor = {replace(range, text) {}}; editor.replace(range, text);',
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
		typeAware(outdent`
			interface TextEditorEdit {
				replace(range: {start: number; end: number}, text: string): void;
			}
			declare const editor: {edit(callback: (edit: TextEditorEdit) => void): void};
			declare const range: {start: number; end: number};
			declare const replacement: string;
			editor.edit(edit => edit.replace(range, replacement));
		`),
		typeAware(outdent`
			function change(value: string | DOMTokenList, replacement: string) {
				if (typeof value !== 'string') {
					value.replace('old', replacement);
				}
			}
		`),
		typeAware(outdent`
			interface Replacer {
				(match: string): string;
			}
			declare const text: string;
			declare const callbacks: {replaceMatch: Replacer};
			text.replace(/pattern/, callbacks.replaceMatch);
		`),
		typeAware(outdent`
			declare const text: string;
			declare const replacement: unknown;
			text.replace(/pattern/, replacement as (match: string) => string);
		`),
		typeAware(outdent`
			declare const text: string;
			function replacer(match: string) { return match; }
			const callback: any = replacer;
			text.replace(/pattern/, callback);
		`),
		typeAware(outdent`
			declare const text: string;
			declare const replacement: string;
			let callback: string | (() => string) = replacement;
			callback = () => replacement;
			text.replace(/pattern/, callback);
		`),
		typeAware(outdent`
			declare const text: string;
			let callback: () => string = () => 'old';
			function update(next: () => string) {
				callback = next;
			}
			text.replace(/pattern/, callback);
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
		'text.replace("pattern", replacement.repeat(4))',
		// Static `String.raw` tagged templates are only supported as direct replacements.
		'text.replace("pattern", String.raw` `.repeat(4))',
		'text.replace("pattern", " ".repeat?.(4))',
		'text.replace("pattern", " "?.repeat(4))',
		'text.replace("pattern", " "["repeat"](4))',
		'text.replace("pattern", `$`.repeat(count))',
		'text.replace("pattern", `\\u0024`.repeat(2))',
		'text.replace("pattern", `${prefix}`.repeat(2))', // eslint-disable-line no-template-curly-in-string
		'text.replaceAll("pattern", "$&".repeat(2))',
		// Repeat counts are deliberately ignored, so an unsafe receiver stays invalid even when the result would be empty.
		'text.replace("pattern", "$&".repeat(0))',
		'text.replace("pattern", "&$".repeat(2))',
		String.raw`text.replace("pattern", "\u0024".repeat(2))`,
		'template.replace("{url}", {"toString": () => url})',
		'function replacer() { return ""; } replacer = replacement; text.replace(/pattern/, replacer);',
		'function replacer() { return ""; } function run(replacer) { text.replace(/pattern/, replacer); }',
		typeAware('declare const text: string; declare const replacement: string; text.replace(/pattern/, replacement);'),
		typeAware('declare const labels: {classList: string}; declare const replacement: string; labels.classList.replace(/pattern/, replacement);'),
		'labels.classList.replaceAll(pattern, replacement);',
		typeAware('declare const labels: {classList: string | DOMTokenList}; declare const replacement: string; labels.classList.replace("old", replacement);'),
		'let replacer = () => ""; replacer = replacement; const callback = replacer; text.replace(/pattern/, callback);',
		typeAware('declare const text: String; declare const replacement: string; text.replaceAll("old", replacement);'),
		{
			code: 'function run(text: string, replacement: new () => object) { text.replace(/pattern/, replacement); }',
			languageOptions: {parser: parsers.typescript},
		},
		'const labels = {classList: "old"}; labels.classList.replace("old", replacement);',
		typeAware('const text = new String("old"); declare const replacement: string; text.replaceAll("old", replacement);'),
		{
			code: 'function run(text: string, replacement: string | ((match: string) => string)) { text.replace(/pattern/, replacement); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Replacement = {new(): object}; function run(text: string, replacement: Replacement) { text.replace(/pattern/, replacement); }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const text: string; declare const callback: any; text.replace(/pattern/, callback);'),
		'/** @param {() => string} callback */ function run(callback) { callback = replacement; text.replace(/pattern/, callback); }',
		typeAware(outdent`
			declare const text: string;
			declare const replacement: string;
			let callback: string | (() => string) = () => replacement;
			function update() {
				callback = replacement;
			}
			update();
			text.replace(/pattern/, callback);
		`),
		typeAware(outdent`
			declare const text: string;
			declare const replacement: string | ((match: string) => string);
			if (typeof replacement === 'function') {
				text.replace(/pattern/, replacement);
			} else {
				text.replace(/pattern/, replacement);
			}
		`),
	],
});
