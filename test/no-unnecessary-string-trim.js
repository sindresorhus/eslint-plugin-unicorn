import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo.trimStart().startsWith("-")',
		'foo.trimEnd().endsWith("-")',
		'foo.trim().includes("-")',
		'foo.trim().startsWith("-", 1)',
		'foo.trim().endsWith("-", 1)',
		'foo.trim(" ").startsWith("-")',
		'foo.trim().startsWith(prefix)',
		'foo.trim().endsWith(suffix)',
		'foo.trim().startsWith("foo ")',
		'foo.trim().startsWith(`foo `)',
		'foo.trim().endsWith(" foo")',
		'foo.trim().endsWith(` foo`)',
		'const prefix = "foo "; foo.trim().startsWith(prefix)',
		'const suffix = " foo"; foo.trim().endsWith(suffix)',
		'foo.trim().startsWith("foo" + " ")',
		'foo.trim().startsWith(/foo/)',
		'foo.trim().endsWith(Symbol("foo"))',
		'const value = {trim() { return "ok"; }}; value.trim().startsWith("o")',
		'const value = []; value.trim().startsWith("-")',
		'const value = 1; value.trim().startsWith("-")',
		{
			code: 'foo.trim().startsWith("foo " as const)',
			languageOptions: {parser: parsers.typescript},
		},
		'foo.trim().startsWith(...argumentsArray)',
		'foo.trim().endsWith(...argumentsArray)',
		'foo.trim().startsWith("-", ...positions)',
		'foo.trim().endsWith("-", ...positions)',
		'foo.trim().startsWith?.("-")',
		'foo.trim().endsWith?.("-")',
		'foo.trim?.().startsWith("-")',
		'foo.trim?.().endsWith("-")',
		'foo?.trim().startsWith("-")',
		'foo.trim()?.startsWith("-")',
		'foo?.trim()?.startsWith("-")',
		'foo?.trim().endsWith("-")',
		'foo.trim()?.endsWith("-")',
		'foo?.trim()?.endsWith("-")',
		'foo?.bar.trim().startsWith("-")',
		'(foo?.bar).trim().startsWith("-")',
		'(foo?.bar).baz.trim().startsWith("-")',
		'foo.trim()["startsWith"]("-")',
		'foo["trim"]().startsWith("-")',
		'trim().startsWith("-")',
		'foo.trim.startsWith("-")',
		'new foo.trim().startsWith("-")',
		{
			code: 'function foo(value: number[]) { value.trim().startsWith("-"); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'foo.trim().startsWith("-")',
		'foo.trim().endsWith("-")',
		'foo.trim().startsWith()',
		'foo.trim().endsWith()',
		'" foo ".trim().startsWith("f")',
		'" foo ".trim().endsWith("o")',
		'foo.trim().startsWith(" foo")',
		'foo.trim().endsWith("foo ")',
		'foo.trim().startsWith(`foo`)',
		'foo.trim().endsWith(`foo`)',
		'const prefix = "foo"; foo.trim().startsWith(prefix)',
		'const suffix = "foo"; foo.trim().endsWith(suffix)',
		'foo.trim().startsWith("foo" + "bar")',
		'foo.trim().startsWith(undefined)',
		'foo.trim().endsWith(void 0)',
		'const search = undefined; foo.trim().startsWith(search)',
		'foo.trim().startsWith(123)',
		'foo.trim().endsWith(false)',
		'foo.trim().startsWith(null)',
		'foo.trim().endsWith(1n)',
		'(foo).trim().startsWith("-")',
		'(foo.trim()).startsWith("-")',
		outdent`
			if (foo.trim().startsWith("-")) {
				bar();
			}
		`,
		outdent`
			foo
				// comment
				.trim/* comment */()
				.startsWith("-")
		`,
		{
			code: 'function foo(value: string) { value.trim().endsWith("-"); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string) { value.trim().startsWith("-" as const); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string) { value.trim().endsWith("-" satisfies string); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
