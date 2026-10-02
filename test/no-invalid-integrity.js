import {createHash} from 'node:crypto';
import {getTester, languages, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const hashes = Object.fromEntries(['sha256', 'sha384', 'sha512'].map(algorithm => [algorithm, `${algorithm}-${createHash(algorithm).update('hello').digest('base64')}`]));
const publicKey = 'ed25519-JrQLj5P/89iXES9+vFgrIy29clF9CC/oPPsw3c5D0bs=';
const jsxOptions = {parserOptions: {ecmaFeatures: {jsx: true}}};
const jsx = value => `<script src="app.js" integrity="${value}" />`;
const html = value => `<script src="app.js" integrity="${value}"></script>`;

const validMetadata = [
	'',
	' \t\n\f\r ',
	`${hashes.sha256} ${hashes.sha384} ${hashes.sha512}`,
	`${hashes.sha256} ${hashes.sha256}`,
	`${publicKey} ${hashes.sha256}`,
	`${hashes.sha256} sha25-abc future-unknown garbage`,
	` \t${hashes.sha256}\r\n${hashes.sha384}\f `,
	`${hashes.sha256}?`,
	`${hashes.sha384}?foo=bar?spam=eggs`,
	`${publicKey}?future-option`,
	// The grammar permits zero to two padding characters, regardless of canonical padding.
	...Object.values({...hashes, ed25519: publicKey}).flatMap(value => {
		const unpadded = value.replace(/=+$/v, '');
		return [unpadded, `${unpadded}=`, `${unpadded}==`];
	}),
	...Object.values({...hashes, ed25519: publicKey}).map(value => value.replaceAll('+', '-').replaceAll('/', '_')),
	// Mixed alphabets and nonzero unused trailing bits are accepted.
	hashes.sha384.replace('+', '-'),
	`sha256-${'A'.repeat(42)}B=`,
];

const invalidMetadata = [
	'sha25-abc',
	'md5-abc sha1-abc',
	'garbage',
	`SHA256-${hashes.sha256.slice(7)}`,
	'sha-256-abc',
	'sha256',
	'sha256-',
	'sha256-?option',
	'sha256-abc',
	'ed25519-abc',
	'sha256-...',
	`sha256-${'A'.repeat(42)}!`,
	`sha256-${'A'.repeat(42)}é`,
	`sha256-${'A'.repeat(20)}=${'A'.repeat(23)}`,
	`${hashes.sha256}==`,
	`${hashes.sha384}===`,
	`${hashes.sha512}=`,
	`${hashes.sha256}?option\u0000`,
	`${hashes.sha256}?option\u007F`,
	`${hashes.sha256}?optioné`,
	`${hashes.sha256}\u00A0${hashes.sha384}`,
	`${hashes.sha256},${hashes.sha384}`,
	`${hashes.sha512} sha256-abc`,
	`${hashes.sha256} ed25519-abc`,
	`${publicKey} sha384-abc`,
	'sha256-abc sha384-abc ed25519-abc',
	...Object.entries({...hashes, ed25519: publicKey}).flatMap(([algorithm, value]) => {
		const digest = value.slice(algorithm.length + 1).replace(/=+$/v, '');
		return [`${algorithm}-${digest.slice(1)}`, `${algorithm}-${digest}A`];
	}),
];

test.snapshot({
	testerOptions: {languageOptions: jsxOptions},
	valid: [
		...validMetadata.map(value => jsx(value)),
		'<script />',
		'<script integrity />',
		'<script integrity={123} />',
		'<script integrity={undefined} />',
		'<script integrity={null} />',
		'<script integrity={true} />',
		'<script integrity={getIntegrity()} />',
		'<script integrity={`sha256-${digest}`} />', // eslint-disable-line no-template-curly-in-string
		'<script integrity={template`sha256-abc`} />',
		'<script integrity={integrity} />',
		'let integrity = "sha256-abc"; <script integrity={integrity} />',
		'const properties = {integrity: "sha256-abc"}; properties.integrity = ""; <script integrity={properties.integrity} />',
		'<script integrity={integrity} />; const integrity = "sha256-abc";',
		'<Script integrity="sha256-abc" />',
		'<custom-script integrity="sha256-abc" />',
		'<components.script integrity="sha256-abc" />',
		'<svg:script integrity="sha256-abc" />',
		'<img integrity="sha256-abc" />',
		'<script INTEGRITY="sha256-abc" />',
		'<script integrity="sha256-abc" {...properties} />',
		'<script integrity="sha256-abc" integrity="" />',
		'<script {...properties} />',
		`<link integrity={"${hashes.sha384}"} />`,
		`const integrity = "${hashes.sha256}"; <script integrity={integrity} />`,
		`<script integrity="${hashes.sha256.replace('+', '&#43;')}" />`,
		{code: `<script integrity={"${hashes.sha256}" as string} />`, languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		...invalidMetadata.map(value => jsx(value)),
		'<link rel="stylesheet" integrity="sha256-abc" />',
		'<script integrity="sha256-abc" />',
		'<script {...properties} integrity="sha256-abc" />',
		'<script integrity="" {...properties} integrity="sha256-abc" />',
		'<script integrity="" integrity="sha256-abc" />',
		'<script integrity={"sha256-abc"} />',
		'<script integrity={`sha256-abc`} />',
		'<script integrity={"sha256-" + "abc"} />',
		'const integrity = "sha256-abc"; <script integrity={integrity} />',
		'<script integrity="sha256&#45;abc" />',
		'<script integrity={/* Keep this comment. */ "sha256-abc"} />',
		{code: '<script integrity={"sha256-abc" as string} />', languageOptions: {parser: parsers.typescript}},
		{code: 'const integrity = "sha256-abc"; <script integrity={integrity!} />', languageOptions: {parser: parsers.typescript}},
		{code: '<script integrity={"sha256-abc" satisfies string} />', languageOptions: {parser: parsers.typescript}},
	],
});

test.snapshot({
	testerOptions: {languageOptions: {parser: parsers.html}},
	valid: [
		...Object.values(hashes).map(value => html(value)),
		html(publicKey),
		'<script></script>',
		'<script integrity></script>',
		html(''),
		html(' \t\r\n\f '),
		html(`${hashes.sha256} future-unknown`),
		html(`${hashes.sha384}?foo?bar`),
		`<SCRIPT INTEGRITY='${hashes.sha256}'></SCRIPT>`,
		`<script integrity=${hashes.sha256}></script>`,
		`<link integrity=${hashes.sha384}>`,
		`<link integrity="${hashes.sha384.replaceAll('+', '&#43;').replaceAll('/', '&#47;')}">`,
		html(`${hashes.sha256}&#32;${hashes.sha384}`),
		'<img integrity="sha256-abc">',
		'<custom-script integrity="sha256-abc"></custom-script>',
		'<textarea><script integrity="sha256-abc"></script></textarea>',
		'<title><link integrity="sha256-abc"></title>',
		'<script integrity="" integrity="sha256-abc"></script>',
		html('{{integrity}}'),
		html('{% integrity %}'),
		html('<%= integrity %>'),
		html('${integrity}'), // eslint-disable-line no-template-curly-in-string
		html('sha256-{{digest}}'),
		{code: html('[[integrity]]'), languageOptions: {parserOptions: {templateEngineSyntax: {'[[': ']]'}}}},
		{code: '<script {{name}}="sha256-abc"></script>', languageOptions: {parserOptions: {templateEngineSyntax: {'{{': '}}'}}}},
		{code: '<link integrity=sha256-AAAA/[[digest]]>', languageOptions: {parserOptions: {templateEngineSyntax: {'[[': ']]'}}}},
		{code: '<link integrity=sha256-AAAA/[[digest]]>', languageOptions: {parserOptions: {templateEngineSyntax: [{open: '[[', close: ']]'}]}}},
		// The parser can omit attributes after an unquoted URL containing a slash.
		'<script src=https://example.test/app.js integrity="sha256-abc"></script>',
	],
	invalid: [
		html('sha256-abc'),
		html('sha25-abc'),
		html('ed25519-abc'),
		html('sha256-abc sha384-abc'),
		'<SCRIPT INTEGRITY="sha256-abc"></SCRIPT>',
		'<link rel="stylesheet" href="style.css" integrity="sha384-abc">',
		'<link rel="preload" integrity="sha256-abc">',
		'<link rel="modulepreload" integrity="sha512-abc">',
		'<script integrity="sha256-abc" integrity=""></script>',
		'<script integrity=sha256-a/b==></script>',
		'<script integrity="sha256&#45;abc"></script>',
		'<script integrity="sha256-abc&#32;sha384-abc"></script>',
		`<script integrity=${hashes.sha256}/></script>`,
		{code: html('sha256-abc'), languageOptions: {parserOptions: {templateEngineSyntax: {'{{': '}}'}}}},
	],
});

test({
	testerOptions: languages.html,
	valid: [
		`<link integrity="${hashes.sha256}">`,
		{code: '<link integrity="[[integrity]]">', languageOptions: {templateEngineSyntax: {'[[': ']]'}}},
		{code: '<link integrity=sha256-AAAA/[[digest]]>', languageOptions: {templateEngineSyntax: [{open: '[[', close: ']]'}]}},
	],
	invalid: [
		{code: '<link integrity="sha256-abc">', errors: [{messageId: 'invalid', suggestions: 0}]},
		{code: '<script integrity="sha256-abc0"></script>', languageOptions: {templateEngineSyntax: [{open: '[[', close: ']]'}]}, errors: [{messageId: 'invalid', suggestions: 0}]},
	],
});

// Regular rule-tester cases assert that diagnostics do not offer autofixes or suggestions.
test({
	testerOptions: {languageOptions: jsxOptions},
	valid: [],
	invalid: [
		{code: jsx('sha256-abc'), errors: [{messageId: 'invalid', suggestions: 0}]},
		{code: jsx('sha25-abc'), errors: [{messageId: 'unrecognized', suggestions: 0}]},
		{code: jsx('sha256-abc sha384-abc'), errors: [{messageId: 'invalid'}, {messageId: 'invalid'}]},
		{code: 'const integrity = "sha256-abc" as const; <script integrity={integrity} />', languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'invalid', suggestions: 0}]},
	],
});

test({
	testerOptions: {languageOptions: {parser: parsers.html}},
	valid: [],
	invalid: ['"', '\'', '`', '<'].map(character => {
		const value = `${hashes.sha256}${character}broken`;
		return {
			code: `<script integrity=${value}></script>`,
			errors: [{messageId: 'invalid', column: 19, endColumn: 19 + value.length, suggestions: 0}],
		};
	}),
});
