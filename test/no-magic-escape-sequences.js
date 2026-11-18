/* eslint-disable no-template-curly-in-string -- Test inputs contain template literals. */
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {
		languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
	},
	valid: [
		'const largeCircle = \'\\u{2B24}\'; const message = `Click ${largeCircle} to continue`;',
		'const largeCircle = `\\u{2B24}`; <span>{largeCircle}</span>;',
		String.raw`const grinningFace = '\uD83D\uDE00';`,
		String.raw`const escapeAndNewline = '\u{1B}\n';`,
		'const escapeAndNewline = \'\\u{1B}\\\r\n\\n\';',
		String.raw`log('\n\t\0', '\\xA0\\u00A0\\u{A0}');`,
		'log(`\\\\u00A0`);',
		String.raw`const pattern = /\u{2B24}/u;`,
		'String.raw`\\u{2B24}\\8`;',
		String.raw`<span title="\u{2B24}">&#xA0;</span>;`,
		String.raw`'use \u{2603}'; import './\u{2603}.js'; const object = {'\u{2603}': true};`,
		String.raw`require('./\u03C0.cjs'); import('./\u03C0.js');`,
		'require(`./\\u03C0.cjs`); import(`./\\u03C0${suffix}.js`);',
		{
			code: 'require(\'./\\u03C0.cjs\' as const); import(`./\\u03C0.js` satisfies string);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = \'\\u00A0\' | `\\u00A0`; type Pattern = `\\u00A0${number}`;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Require = import("pkg", {with: {"resolution-mode": "\\u0072equire"}}).Value; type Import = import("pkg", {with: {"resolution-mode": `\\u0069mport`}}).Value;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const space = \'\\u00A0\' as const; const circle = `\\u{2B24}` satisfies string;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<template><span title="\\u{2B24}">{{ \'&#92;\\u{2B24}\' }}{{ `\\u{2B24} &amp;` }}</span></template>',
			languageOptions: {parser: parsers.vue},
		},
	],
	invalid: [
		String.raw`const message = 'Click \u{2B24} to continue';`,
		String.raw`<span>{'\u{2B24}'}</span>;`,
		String.raw`log('\xA0\u2060\u{200B}');`,
		String.raw`let largeCircle = '\u{2B24}';`,
		'const message = `Click \\u{2B24} to continue`;',
		'const message = `${value}\\u{2B24}\\u{00000A0}`;',
		String.raw`log('\\\u00A0');`,
		'const message = `Before\r\n\\u00A0 ${value}\r\n\\u{2B24}`;',
		{
			code: String.raw`const message: string = 'Click \u{2B24}';`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: String.raw`render('\u00A0' as const);`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<template><span :title="\'\\u{2B24}\'">{{ `Click\r\n\\u{2B24}` }}</span></template>',
			languageOptions: {parser: parsers.vue},
		},
		{
			code: 'const label: string = `Click\r\n\\u{2B24}`;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<template>{{ \'Click \\\r\n\\u{2B24}\' }}</template>',
			languageOptions: {parser: parsers.vue},
		},
		String.raw`log('\u{1B}\n');`,
		'tag`\\u{2B24}${"\\u{2B24}"}`;',
		String.raw`const labels = {'\u{2B24}': true, ['\u{2B24}']: false};`,
		String.raw`import('pkg', {with: {type: '\u006Ason'}});`,
		String.raw`new RegExp('\u2028'); loader.require('./\u03C0.js');`,
		String.raw`log('\uD83D\uDE00 smile\u{A0}');`,
	],
});
