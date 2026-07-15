import {isRegExp} from 'node:util/types';
import {onRoot} from './utils/index.js';

const MESSAGE_ID = 'prefer-https';
const messages = {
	[MESSAGE_ID]: 'Prefer HTTPS over HTTP.',
};

const URL_PATTERN = /(?<![\w+\-.])(?<protocol>https?):\/\/(?<authority>[^\s!"#'(),/;<>?\\\]`{}]+)[^\s!"'(),;<>\\\]`{}]*/giu;

// These URIs are opaque identifiers defined to use the `http:` scheme. They are not network requests and must not be rewritten.
const IGNORED_IDENTIFIER_URIS = new Set([
	// W3C markup / DOM
	'http://www.w3.org/2000/svg',
	'http://www.w3.org/1999/xhtml',
	'http://www.w3.org/1999/xlink',
	'http://www.w3.org/2000/xmlns/',
	'http://www.w3.org/XML/1998/namespace',
	'http://www.w3.org/1998/Math/MathML',
	'http://www.w3.org/2001/XInclude',
	'http://www.w3.org/2005/07/scxml',
	// W3C XSL / Schema
	'http://www.w3.org/1999/XSL/Transform',
	'http://www.w3.org/1999/XSL/Format',
	'http://www.w3.org/2001/XMLSchema',
	'http://www.w3.org/2001/XMLSchema-instance',
	// XPath / XQuery
	'http://www.w3.org/2005/xpath-functions',
	'http://www.w3.org/2005/xqt-errors',
	// XML security transforms
	'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
	'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments',
	'http://www.w3.org/TR/1999/REC-xpath-19991116',
	'http://www.w3.org/TR/1999/REC-xslt-19991116',
	// SOAP / WSDL
	'http://schemas.xmlsoap.org/soap/envelope/',
	'http://schemas.xmlsoap.org/soap/encoding/',
	'http://schemas.xmlsoap.org/wsdl/',
	'http://www.w3.org/2003/05/soap-envelope',
	'http://www.w3.org/2003/05/soap-encoding',
	// Atom / RSS / Dublin Core
	'http://www.w3.org/2005/Atom',
	'http://purl.org/rss/1.0/',
	'http://purl.org/dc/elements/1.1/',
	'http://purl.org/dc/terms/',
	// Build tools
	'http://schemas.microsoft.com/developer/msbuild/2003',
	// Sitemap
	'http://www.sitemaps.org/schemas/sitemap/0.9',
]);
const IGNORED_URI_PATTERNS = [
	// XML security
	/^http:\/\/www\.w3\.org\/\d{4}\/(?:\d{2}\/)?(?:xmldsig(?:-more|\d+)?|xmlenc\d*|xml-exc-c14n|decrypt)#/v,
	/^http:\/\/www\.w3\.org\/\d{4}\/(?:\d{2}\/)?(?:xmldsig-filter\d+|xml-c14n\d+)(?:#.*)?$/v,
	// Vocabulary terms
	/^http:\/\/www\.w3\.org\/(?:1999\/02\/22-rdf-syntax-ns|2000\/01\/rdf-schema|2001\/XMLSchema|2002\/07\/owl|2004\/02\/skos\/core|2005\/xqt-errors|ns\/(?:dcat|prov|shacl))#.*$/v,
	/^http:\/\/www\.w3\.org\/2005\/xpath-functions(?:#.*|\/(?:array|map|math)(?:#.*)?)$/v,
	/^http:\/\/purl\.org\/(?:rss\/1\.0|dc\/(?:elements\/1\.1|terms))\/[\w\-]+$/v,
	// Android resources
	/^http:\/\/schemas\.android\.com\/(?:apk\/(?:res\/(?:android|[A-Za-z]\w*(?:\.[A-Za-z]\w*)+)|res-auto)|aapt|tools)$/v,
	// Build and framework identifiers
	/^http:\/\/maven\.apache\.org\/(?:EXTENSIONS|METADATA|POM|SETTINGS|TOOLCHAINS)\/\d+(?:\.\d+)+$/v,
	/^http:\/\/www\.springframework\.org\/schema\/[\w\-]+(?:\/[\w\-]+)*$/v,
];

function getHostname(authority) {
	try {
		const url = new URL(`http://${authority}`);
		return url.hostname;
	} catch {}
}

function hasPublicTld(hostname) {
	let hostnameEnd = hostname.length;
	while (hostname[hostnameEnd - 1] === '.') {
		hostnameEnd -= 1;
	}

	const lastDotIndex = hostname.lastIndexOf('.', hostnameEnd - 1);
	const tld = hostname.slice(lastDotIndex + 1, hostnameEnd);

	return lastDotIndex !== -1 && /[a-z]/iu.test(tld);
}

function shouldReport(authority) {
	const hostname = getHostname(authority);

	return Boolean(hostname && hasPublicTld(hostname));
}

function isXmlNamespaceValue(text, matchIndex) {
	// 30 chars covers `xmlns:somePrefix="` with a prefix up to 22 chars long.
	const preceding = text.slice(Math.max(0, matchIndex - 30), matchIndex);
	// The negative lookbehind prevents matching names ending in "xmlns" (e.g. notxmlns, $xmlns, or data-xmlns).
	// [\w.-]+ covers XML NCNames, which allow hyphens and dots (e.g. xmlns:xsl-fo).
	return /(?<![\w#$\-.:])xmlns(?::[\w\-.]+)?\s*=\s*["']?$/i.test(preceding);
}

function isIgnoredByPattern(url, patterns) {
	return patterns.some(regexp => {
		regexp.lastIndex = 0;
		const isMatch = regexp.test(url);
		regexp.lastIndex = 0;

		return isMatch;
	});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const ignoredUrls = new Set();
	const ignoredUrlPatterns = [];

	for (const value of context.options[0].ignore) {
		if (isRegExp(value)) {
			ignoredUrlPatterns.push(value);
			continue;
		}

		if (!value.startsWith('http://')) {
			throw new TypeError('String values in the `ignore` option must start with `http://`.');
		}

		ignoredUrls.add(value);
	}

	let isChecked = false;

	onRoot(context, node => {
		if (isChecked) {
			return;
		}

		isChecked = true;

		const {sourceCode} = context;
		const {text} = sourceCode;

		for (const match of text.matchAll(URL_PATTERN)) {
			// The scanner is case-insensitive to consume complete URLs, but only lowercase `http://` is reported.
			if (match.groups.protocol !== 'http') {
				continue;
			}

			const start = match.index;
			const url = match[0];

			if (
				IGNORED_IDENTIFIER_URIS.has(url)
				|| isIgnoredByPattern(url, IGNORED_URI_PATTERNS)
				|| ignoredUrls.has(url)
				|| isIgnoredByPattern(url, ignoredUrlPatterns)
				|| isXmlNamespaceValue(text, start)
			) {
				continue;
			}

			if (!shouldReport(match.groups.authority)) {
				continue;
			}

			const end = start + 'http://'.length + match.groups.authority.length;

			context.report({
				node,
				loc: {
					start: sourceCode.getLocFromIndex(start),
					end: sourceCode.getLocFromIndex(end),
				},
				messageId: MESSAGE_ID,
				fix: fixer => fixer.replaceTextRange([start, start + 4], 'https'),
			});
		}
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			ignore: {
				type: 'array',
				uniqueItems: true,
				description: 'Exact URLs and regular expressions to ignore.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer HTTPS over HTTP.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{ignore: []}],
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
