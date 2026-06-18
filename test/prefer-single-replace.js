import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Not a chain
		'string.replaceAll(\'a\', \'-\');',
		'string.replace(/a/g, \'-\');',

		// Different replacements
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'+\');',

		// Multi-character string search
		'string.replaceAll(\'ab\', \'-\').replaceAll(\'c\', \'-\');',

		// `String#replace()` with a string only replaces the first occurrence
		'string.replace(\'a\', \'-\').replace(\'b\', \'-\');',

		// Non-global regex
		'string.replace(/a/, \'-\').replace(/b/, \'-\');',

		// Unsafe flags
		'string.replaceAll(/a/gi, \'-\').replaceAll(/b/gi, \'-\');',
		'string.replaceAll(/a/gy, \'-\').replaceAll(/b/gy, \'-\');',
		'string.replaceAll(/a/gu, \'-\').replaceAll(/b/gu, \'-\');',

		// Regex that is not a single literal character
		'string.replace(/ab/g, \'-\').replace(/c/g, \'-\');',
		'string.replace(/./g, \'-\').replace(/a/g, \'-\');',
		String.raw`string.replace(/\d/g, '-').replace(/a/g, '-');`,
		'string.replace(/[ab]/g, \'-\').replace(/c/g, \'-\');',

		// Non-string replacement (could be side-effecting / re-evaluated)
		'string.replaceAll(\'a\', x).replaceAll(\'b\', x);',
		'string.replaceAll(\'a\', () => \'-\').replaceAll(\'b\', () => \'-\');',

		// Replacement reintroduces a searched character
		'string.replaceAll(\'a\', \'a\').replaceAll(\'b\', \'a\');',
		'string.replaceAll(\'a\', \'ab\').replaceAll(\'b\', \'ab\');',

		// Position-dependent replacement patterns (`$\`` prematch, `$'` postmatch)
		'string.replaceAll(\'a\', \'$`\').replaceAll(\'b\', \'$`\');',
		'string.replaceAll(\'a\', "$\'").replaceAll(\'b\', "$\'");',

		// Computed member
		'string[\'replaceAll\'](\'a\', \'-\')[\'replaceAll\'](\'b\', \'-\');',

		// Optional chaining
		'string?.replaceAll(\'a\', \'-\')?.replaceAll(\'b\', \'-\');',

		// Astral character is two UTF-16 code units
		'string.replaceAll(\'😀\', \'-\').replaceAll(\'b\', \'-\');',
	],
	invalid: [
		// Basic
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');',
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\').replaceAll(\'c\', \'-\');',

		// Mixed `replace(/x/g)` and `replaceAll('x')`
		'string.replace(/a/g, \'-\').replaceAll(\'b\', \'-\');',
		'string.replaceAll(\'a\', \'-\').replace(/b/g, \'-\');',

		// Escaped regex character
		String.raw`string.replace(/\./g, '-').replaceAll('a', '-');`,

		// Characters that need escaping inside a character class
		'string.replaceAll(\']\', \'_\').replaceAll(\'^\', \'_\').replaceAll(\'-\', \'_\');',
		String.raw`string.replaceAll('\\', '_').replaceAll('a', '_');`,
		'string.replaceAll(\'/\', \'_\').replaceAll(\'a\', \'_\');',
		String.raw`string.replaceAll('\n', '_').replaceAll('a', '_');`,
		String.raw`string.replaceAll('\u2028', '_').replaceAll('a', '_');`,
		String.raw`string.replaceAll('\u2029', '_').replaceAll('a', '_');`,
		String.raw`string.replace(/\u2028/g, '_').replace(/\u2029/g, '_');`,

		// `^` is only escaped when it would be the first class character
		'string.replaceAll(\'^\', \'_\').replaceAll(\'a\', \'_\');',
		'string.replaceAll(\'a\', \'_\').replaceAll(\'^\', \'_\');',

		// `-` is only escaped when it would form a range
		'string.replaceAll(\'a\', \'_\').replaceAll(\'-\', \'_\').replaceAll(\'b\', \'_\');',
		'string.replaceAll(\'-\', \'_\').replaceAll(\'a\', \'_\');',

		// Empty replacement
		'string.replaceAll(\'a\', \'\').replaceAll(\'b\', \'\');',

		// `m`/`s` flags only affect `^`/`$`/`.`, so they are safe to drop
		'string.replace(/a/gm, \'-\').replace(/b/gm, \'-\');',
		'string.replace(/a/gs, \'-\').replaceAll(\'b\', \'-\');',

		// Duplicate characters are deduped
		'string.replaceAll(\'a\', \'-\').replaceAll(\'a\', \'-\');',

		// Parenthesized base
		'(foo + bar).replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');',

		// Boundary: only the same-replacement run collapses
		'string.replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\').replaceAll(\'c\', \'+\');',

		// Comment inside the chain (reported, not fixed)
		'string.replaceAll(\'a\', \'-\')/* comment */.replaceAll(\'b\', \'-\');',

		// TypeScript
		{code: '(string as string).replaceAll(\'a\', \'-\').replaceAll(\'b\', \'-\');', languageOptions: {parser: parsers.typescript}},
	],
});
