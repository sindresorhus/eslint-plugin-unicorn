import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const regexpEscapePattern = String.raw`[.*+?^${'$'}{}()|[\]\\]`;
const regexpEscapeLiteral = `/${regexpEscapePattern}/g`;
const regexpEscapeLiteralWithoutGlobal = `/${regexpEscapePattern}/`;
const regexpEscapeLiteralWithIgnoreCase = `/${regexpEscapePattern}/gi`;
const regexpEscapeLiteralWithSticky = `/${regexpEscapePattern}/gy`;
const regexpEscapeLiteralWithSlash = String.raw`/[.*+?^${'$'}{}()|[\]\\/]/g`;
const reorderedRegexpEscapeLiteral = String.raw`/[\]\\.*+?^${'$'}{}()|[]/g`;
const partialRegexpEscapeLiteral = '/[.*+?^$]/g';
const sevenCharacterRegexpEscapeLiteral = '/[.*+?^$(]/g';
const eightCharacterRegexpEscapeLiteral = '/[.*+?^$()]/g';
const lodashRegexpEscapeLiteral = String.raw`/[\\^${'$'}.*+?()[\]{}|]/g`;
const escapeStringRegexpLiteral = String.raw`/[|\\{}()[\]^${'$'}+*?.]/g`;
const dashSlashRegexpEscapeLiteral = String.raw`/[-\/\\^${'$'}*+?.()|[\]{}]/g`;
const escapedDashRegexpEscapeLiteral = String.raw`/[\/\-\\^${'$'}*+?.()|[\]{}]/g`;
const trailingDashRegexpEscapeLiteral = String.raw`/[\/\\^${'$'}*+?.()|[\]{}-]/g`;
const dashRangeRegexpLiteral = '/[)-|.*+?^$]/g';
const unescapedClosingBracketRegexpLiteral = String.raw`/[.*+?^${'$'}{}()|]\[\]\\]/g`;
const regexpEscapeReplacement = String.raw`'\\$&'`;
const differentRegexpEscapeReplacement = String.raw`'\\$0'`;
const functionReplacement = String.raw`match => '\\' + match`;
const doubleQuotedRegexpEscapeReplacement = String.raw`"\\$&"`;

test.snapshot({
	valid: [
		'const escaped = RegExp.escape(string);',
		`const escaped = string.replace(${regexpEscapeLiteralWithoutGlobal}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteralWithSticky}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${partialRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${sevenCharacterRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${dashRangeRegexpLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${unescapedClosingBracketRegexpLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteral}, '$&');`,
		`const escaped = string.replace(${regexpEscapeLiteral}, ${differentRegexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteral}, ${functionReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteral}, \`\\\\$&\`);`,
		`const escaped = string.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement}, extra);`,
		`const escaped = string.replaceAll(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string[replace](${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string['replace'](${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string?.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace?.(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		'function escapeStringRegexp(string) { return string; } const escaped = escapeStringRegexp(string);',
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp(...string);',
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp();',
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp(string, extra);',
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp?.(string);',
		'import escapeStringRegexp from \'escape-string-regexp\'; function foo(escapeStringRegexp) { return escapeStringRegexp(string); }',
		'import lodash from \'lodash\'; const escaped = lodash.escapeRegExp?.(string);',
		'import lodash from \'lodash\'; const escaped = lodash[escapeRegExp](string);',
		'import lodash from \'lodash\'; function foo(lodash) { return lodash.escapeRegExp(string); }',
		'const _ = {escapeRegExp}; const escaped = _.escapeRegExp(string);',
		'const lodash = {escapeRegExp}; const escaped = lodash.escapeRegExp(string);',
		{
			code: `function foo(collection: {replace(pattern: RegExp, replacement: string): string}) { return collection.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement}); }`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		`const escaped = string.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteralWithIgnoreCase}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteralWithSlash}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${reorderedRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${eightCharacterRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${lodashRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${escapeStringRegexpLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${dashSlashRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${escapedDashRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${trailingDashRegexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = object.value.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = getString().replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = (string).replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = (0, string).replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`const escaped = string.replace(${regexpEscapeLiteral}, ${doubleQuotedRegexpEscapeReplacement});`,
		`const escaped = string.replace(/* pattern */ ${regexpEscapeLiteral}, ${regexpEscapeReplacement});`,
		`class StringSubclass extends String { method() { return super.replace(${regexpEscapeLiteral}, ${regexpEscapeReplacement}); } }`,
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp(string);',
		'import escapeRegex from \'escape-string-regexp\'; const escaped = escapeRegex(string);',
		'const escapeStringRegexp = require(\'escape-string-regexp\'); const escaped = escapeStringRegexp(string);',
		'import escapeRegExp from \'lodash.escaperegexp\'; const escaped = escapeRegExp(string);',
		'const escapeRegExp = require(\'lodash.escaperegexp\'); const escaped = escapeRegExp(string);',
		'import escapeRegExp from \'lodash/escapeRegExp\'; const escaped = escapeRegExp(string);',
		'const escapeRegExp = require(\'lodash/escapeRegExp\'); const escaped = escapeRegExp(string);',
		'import {escapeRegExp} from \'lodash-es\'; const escaped = escapeRegExp(string);',
		'import {escapeRegExp as escapeRegex} from \'lodash\'; const escaped = escapeRegex(string);',
		'const {escapeRegExp} = require(\'lodash\'); const escaped = escapeRegExp(string);',
		'import lodash from \'lodash\'; const escaped = lodash.escapeRegExp(string);',
		'import * as lodash from \'lodash-es\'; const escaped = lodash.escapeRegExp(string);',
		'const lodash = require(\'lodash\'); const escaped = lodash.escapeRegExp(string);',
		'const escaped = _.escapeRegExp(string);',
		'import escapeStringRegexp from \'escape-string-regexp\'; const escaped = escapeStringRegexp(/* string */ string);',
	],
});
