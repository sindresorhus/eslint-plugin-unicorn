import test from 'ava';
import {Linter} from 'eslint';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import html from '@html-eslint/eslint-plugin';
import unicorn from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const MESSAGE = 'Prefer HTTPS over HTTP.';
const RULE_ID = 'unicorn/prefer-https';
const LANGUAGE_PLUGINS = {
	css,
	json,
	markdown,
	html,
};

const XML_SECURITY_URIS = [
	'http://www.w3.org/2000/09/xmldsig#',
	'http://www.w3.org/2000/09/xmldsig#base64',
	'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
	'http://www.w3.org/2000/09/xmldsig#hmac-sha1',
	'http://www.w3.org/2000/09/xmldsig#Manifest',
	'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
	'http://www.w3.org/2000/09/xmldsig#sha1',
	'http://www.w3.org/2001/04/xmldsig-more#',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha1',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#hmac-sha512',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
	'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
	'http://www.w3.org/2001/04/xmldsig-more#sha384',
	'http://www.w3.org/2001/04/xmlenc#sha256',
	'http://www.w3.org/2001/04/xmlenc#sha512',
	'http://www.w3.org/2001/10/xml-exc-c14n#',
	'http://www.w3.org/2001/10/xml-exc-c14n#WithComments',
	'http://www.w3.org/2002/07/decrypt#XML',
	'http://www.w3.org/2007/05/xmldsig-more#',
	'http://www.w3.org/2007/05/xmldsig-more#MGF1',
	'http://www.w3.org/2007/05/xmldsig-more#rsa-pss',
	'http://www.w3.org/2007/05/xmldsig-more#sha1-rsa-MGF1',
	'http://www.w3.org/2007/05/xmldsig-more#sha256-rsa-MGF1',
	'http://www.w3.org/2007/05/xmldsig-more#sha384-rsa-MGF1',
	'http://www.w3.org/2007/05/xmldsig-more#sha512-rsa-MGF1',
];

const XML_SECURITY_URI_PREFIXES = [
	'http://www.w3.org/2000/09/xmldsig#',
	'http://www.w3.org/2001/04/xmldsig-more#',
	'http://www.w3.org/2001/04/xmlenc#',
	'http://www.w3.org/2001/10/xml-exc-c14n#',
	'http://www.w3.org/2002/07/decrypt#',
	'http://www.w3.org/2007/05/xmldsig-more#',
];

const XML_SECURITY_IDENTIFIER_NAMES = [
	'xmldsig',
	'xmldsig-more',
	'xmlenc',
	'xml-exc-c14n',
	'decrypt',
];

ruleTest.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'const url = "https://sindresorhus.com";',
		'const url = "HTTP://sindresorhus.com";',
		'const url = "http://localhost";',
		'const url = "http://example";',
		'const url = "http://127.0.0.1";',
		'const url = "http://[::1]";',
		'const url = "http://example.123";',
		'const url = "http://sindresorhus.com:invalid";',
		'const text = "prefixhttp://sindresorhus.com";',
		'// http://example,',
		'// http://localhost',
		'const element = <a href="https://sindresorhus.com">https://sindresorhus.com</a>;',
		`// eslint-disable-next-line rule-to-test/prefer-https
		// http://sindresorhus.com`,
		// XML namespace URIs are opaque identifiers, not network requests
		'const element = <svg xmlns="http://www.w3.org/2000/svg"></svg>;',
		'const element = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d=""/></svg>;',
		'const element = <html xmlns="http://www.w3.org/1999/xhtml"></html>;',
		'const element = <tag xmlns:ns="http://example.com/ns"></tag>;',
		// Hyphenated NCName prefix (XML allows hyphens in namespace prefixes)
		'const element = <tag xmlns:xsl-fo="http://www.w3.org/1999/XSL/Format"></tag>;',
		// Single-quoted attribute value
		'const element = <svg xmlns=\'http://www.w3.org/2000/svg\'></svg>;',
		// Spaces around the equals sign
		'const element = <svg xmlns = "http://www.w3.org/2000/svg"></svg>;',
		// Well-known namespace URIs are opaque identifiers anywhere they appear, not just in `xmlns=` attributes (e.g. passed to DOM `*NS` methods).
		'const SVG_NAMESPACE = "http://www.w3.org/2000/svg";',
		'document.createElementNS("http://www.w3.org/2000/svg", "svg");',
		'svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", SVG_NAMESPACE);',
		'const ns = "http://www.w3.org/1998/Math/MathML";',
		// Namespace URI ending in a fragment
		'const ns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";',
		// Non-W3C well-known namespaces
		'const ns = "http://schemas.xmlsoap.org/soap/envelope/";',
		'const ns = "http://purl.org/dc/elements/1.1/";',
		'const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";',
		...XML_SECURITY_URIS.map(uri => `const uri = "${uri}";`),
		...XML_SECURITY_URI_PREFIXES.map(uri => `const uri = "${uri}future-algorithm";`),
		...XML_SECURITY_IDENTIFIER_NAMES.map(name => `const uri = "http://www.w3.org/2099/12/${name}#future-algorithm";`),
		'const uri = "http://www.w3.org/2009/xmldsig11#future-algorithm";',
		'const uri = "http://www.w3.org/2009/xmlenc11#future-algorithm";',
		{
			code: 'const uri = "http://example.com/identifier/value";',
			options: [{ignore: ['http://example.com/identifier/value']}],
		},
		{
			code: 'const uri = "http://schemas.example.com/value";',
			options: [{ignore: [/^http:\/\/schemas\.example\.com\//v]}],
		},
		{
			code: 'const uris = ["http://example.com/one", "http://example.com/two"];',
			options: [{ignore: [/^http:\/\/unused\.example\//v, /^http:\/\/example\.com\//gv]}],
		},
		{
			code: 'const url = "http://example.com/identifier/value?format=xml#section";',
			options: [{ignore: [/\?format=xml#section$/v]}],
		},
	],
	invalid: [
		'const url = "http://sindresorhus.com";',
		'const url = `http://sindresorhus.com/path`;',
		'// http://sindresorhus.com',
		'// http://sindresorhus.com,',
		'const element = <a href="http://sindresorhus.com">https://sindresorhus.com</a>;',
		'const element = <a href="https://sindresorhus.com">http://sindresorhus.com</a>;',
		`const urls = [
			"http://sindresorhus.com",
			"http://example.com",
		];`,
		'const url = "http://user:password@sindresorhus.com";',
		'const url = "http://êxample.com";',
		'const url = "http://sindresorhus.com:8080/path";',
		'const url = "http://sindresorhus.com.";',
		// Non-xmlns attribute adjacent to an xmlns attribute must still be flagged
		'const element = <svg xmlns="http://www.w3.org/2000/svg" data-url="http://sindresorhus.com"></svg>;',
		// A longer URL that merely shares a namespace prefix is not a namespace
		'const url = "http://www.w3.org/2000/svg/extra/path";',
		// The bare registry host is not itself a namespace identifier
		'const url = "http://www.w3.org";',
		{
			code: 'const uri = "http://example.com/identifier/value";',
			options: [{ignore: ['http://other.example/identifier/value']}],
		},
		{
			code: 'const uri = "http://example.com/identifier/value/extra";',
			options: [{ignore: ['http://example.com/identifier/value']}],
		},
		{
			code: 'const uri = "http://www.w3.org/2000/09/xmldsig-other#sha1";',
			options: [{ignore: ['http://example.com/identifier/value']}],
		},
	],
});

test('rejects non-HTTP string ignores', t => {
	const linter = new Linter({configType: 'flat'});
	const config = {
		plugins: {unicorn},
		rules: {
			[RULE_ID]: ['error', {ignore: ['example.com']}],
		},
	};

	const error = t.throws(() => linter.verify('const url = "http://example.com";', config));

	t.regex(error.message, /ignore.*start with.*http:\/\//iv);
});

test('does not ignore URLs that do not match a regular expression', t => {
	const code = 'const url = "http://example.com/identifier/value";';
	const config = {
		plugins: {unicorn},
		rules: {
			[RULE_ID]: ['error', {ignore: [/^http:\/\/other\.example\//v]}],
		},
	};
	const linter = new Linter({configType: 'flat'});
	const messages = linter.verify(code, config);
	const result = linter.verifyAndFix(code, config);

	t.is(messages.length, 1);
	t.is(messages[0].message, MESSAGE);
	t.true(result.fixed);
	t.is(result.output, 'const url = "https://example.com/identifier/value";');
});

function createLanguageConfig(language, rule = 'error') {
	const pluginName = language.split('/', 1)[0];

	return {
		files: ['**'],
		language,
		plugins: {
			[pluginName]: LANGUAGE_PLUGINS[pluginName],
			unicorn,
		},
		rules: {
			[RULE_ID]: rule,
		},
	};
}

const languageCases = [
	{
		name: 'CSS',
		filename: 'fixture.css',
		language: 'css/css',
		code: '.logo { background-image: url("http://sindresorhus.com/logo.svg"); }',
		output: '.logo { background-image: url("https://sindresorhus.com/logo.svg"); }',
		errors: 1,
	},
	{
		name: 'JSON',
		filename: 'fixture.json',
		language: 'json/json',
		code: '{"url": "http://sindresorhus.com"}',
		output: '{"url": "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'JSONC',
		filename: 'fixture.jsonc',
		language: 'json/jsonc',
		code: `{
			// http://sindresorhus.com
			"url": "http://example.com"
		}`,
		output: `{
			// https://sindresorhus.com
			"url": "https://example.com"
		}`,
		errors: 2,
	},
	{
		name: 'JSON5',
		filename: 'fixture.json5',
		language: 'json/json5',
		code: '{url: "http://sindresorhus.com"}',
		output: '{url: "https://sindresorhus.com"}',
		errors: 1,
	},
	{
		name: 'HTML',
		filename: 'fixture.html',
		language: 'html/html',
		code: '<a href="http://sindresorhus.com">http://example.com</a>',
		output: '<a href="https://sindresorhus.com">https://example.com</a>',
		errors: 2,
	},
	{
		name: 'CommonMark',
		filename: 'fixture.md',
		language: 'markdown/commonmark',
		code: '[Sindre](http://sindresorhus.com)',
		output: '[Sindre](https://sindresorhus.com)',
		errors: 1,
	},
	{
		name: 'GFM',
		filename: 'fixture.md',
		language: 'markdown/gfm',
		code: '| URL |\n| --- |\n| http://sindresorhus.com |',
		output: '| URL |\n| --- |\n| https://sindresorhus.com |',
		errors: 1,
	},
	{
		name: 'JSON with ignored URL',
		filename: 'fixture.json',
		language: 'json/json',
		code: '{"url": "http://example.com/identifier/value"}',
		output: '{"url": "http://example.com/identifier/value"}',
		errors: 0,
		fixed: false,
		rule: ['error', {ignore: ['http://example.com/identifier/value']}],
	},
];

for (const {name, code, output, language, filename, errors, fixed = true, rule} of languageCases) {
	test(`supports ${name}`, t => {
		const config = createLanguageConfig(language, rule);
		const linter = new Linter({configType: 'flat'});
		const messages = linter.verify(code, config, {filename});
		const result = linter.verifyAndFix(code, config, {filename});

		t.is(result.fixed, fixed);
		t.is(result.output, output);
		t.deepEqual(
			messages.map(({message, ruleId}) => ({message, ruleId})),
			Array.from({length: errors}, () => (
				{
					message: MESSAGE,
					ruleId: RULE_ID,
				}
			)),
		);
	});
}
