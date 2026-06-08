const MESSAGE_ID = 'prefer-https';
const messages = {
	[MESSAGE_ID]: 'Prefer HTTPS over HTTP.',
};

const HTTP_URL = /(?<![\w+.-])http:\/\/(?<authority>[^\s/?#"'`<>()\\,;!\]}{]+)/gu;
const ROOT_NODE_TYPES = [
	'Program',
	'StyleSheet',
	'Document',
	'root',
];

function getHostname(authority) {
	try {
		return new URL(`http://${authority}`).hostname;
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
	return /\bxmlns(?::[\w.-]+)?\s*=\s*["']?$/i.test(preceding);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	let checked = false;

	context.on(ROOT_NODE_TYPES, node => {
		if (checked) {
			return;
		}

		checked = true;

		const {sourceCode} = context;
		const {text} = sourceCode;

		for (const match of text.matchAll(HTTP_URL)) {
			const start = match.index;

			if (isXmlNamespaceValue(text, start)) {
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
	},
};

export default config;
