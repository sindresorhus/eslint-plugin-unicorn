import {onRoot} from './utils/index.js';

const MESSAGE_ID = 'prefer-https';
const messages = {
	[MESSAGE_ID]: 'Prefer HTTPS over HTTP.',
};

const HTTP_URL = /(?<![\w+\-.])http:\/\/(?<authority>[^\s!"#'(),/;<>?\\\]`{}]+)/gu;
// Like `HTTP_URL`, but captures the full URL (including the path) so it can be
// compared against known namespace URIs. Sticky so it matches at a given index.
const HTTP_URL_FULL = /http:\/\/[^\s!"'(),;<>\\\]`{}]+/uy;

// Well-known XML namespace URIs are opaque identifiers defined to use the
// `http:` scheme. They are not network requests and must not be rewritten.
const XML_NAMESPACES = new Set([
	// W3C markup / DOM
	'http://www.w3.org/2000/svg',
	'http://www.w3.org/1999/xhtml',
	'http://www.w3.org/1999/xlink',
	'http://www.w3.org/2000/xmlns/',
	'http://www.w3.org/XML/1998/namespace',
	'http://www.w3.org/1998/Math/MathML',
	// W3C XSL / Schema
	'http://www.w3.org/1999/XSL/Transform',
	'http://www.w3.org/1999/XSL/Format',
	'http://www.w3.org/2001/XMLSchema',
	'http://www.w3.org/2001/XMLSchema-instance',
	// RDF / RDFS / OWL
	'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	'http://www.w3.org/2000/01/rdf-schema#',
	'http://www.w3.org/2002/07/owl#',
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
	// Sitemap
	'http://www.sitemaps.org/schemas/sitemap/0.9',
]);

function getHostname(authority) {
	try {
		const url = new URL(`http://${authority}`);
		return url.hostname;
	} catch {}
}

function hasPublicTld(hostname) {
	const normalizedHostname = hostname.replace(/\.+$/u, '');
	const parts = normalizedHostname.split('.');
	const tld = parts.at(-1);

	return parts.length > 1 && /[a-z]/iu.test(tld);
}

function shouldReport(authority) {
	const hostname = getHostname(authority);

	return Boolean(hostname && hasPublicTld(hostname));
}

function isXmlNamespaceValue(text, matchIndex) {
	// 30 chars covers `xmlns:somePrefix="` with a prefix up to 22 chars long.
	const preceding = text.slice(Math.max(0, matchIndex - 30), matchIndex);
	// \b prevents matching words ending in "xmlns" (e.g. notxmlns).
	// [\w.-]+ covers XML NCNames, which allow hyphens and dots (e.g. xmlns:xsl-fo).
	return /\bxmlns(?::[\w\-.]+)?\s*=\s*["']?$/i.test(preceding);
}

function isWellKnownXmlNamespace(text, matchIndex) {
	HTTP_URL_FULL.lastIndex = matchIndex;
	const match = HTTP_URL_FULL.exec(text);

	return match !== null && XML_NAMESPACES.has(match[0]);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	let checked = false;

	onRoot(context, node => {
		if (checked) {
			return;
		}

		checked = true;

		const {sourceCode} = context;
		const {text} = sourceCode;

		for (const match of text.matchAll(HTTP_URL)) {
			const start = match.index;

			if (isWellKnownXmlNamespace(text, start) || isXmlNamespaceValue(text, start)) {
				continue;
			}

			if (!shouldReport(match.groups.authority)) {
				continue;
			}

			const end = start + match[0].length;

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
		messages,
		languages: [
			'*',
		],
	},
};

export default config;
