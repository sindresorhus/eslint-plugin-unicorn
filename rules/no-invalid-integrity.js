import {decodeHTMLAttribute} from 'entities';
import {isStringLiteral} from './ast/index.js';
import {getStaticValueForControlFlow, isHtmlRcdataNode, toLocation} from './utils/index.js';

const messages = {
	invalid: 'Invalid `integrity` metadata `{{token}}`: {{reason}}',
	unrecognized: 'The `integrity` value must contain at least one recognized algorithm: `sha256`, `sha384`, `sha512`, or `ed25519`.',
};

const encodedLengths = new Map([
	['sha256', 43],
	['sha384', 64],
	['sha512', 86],
	['ed25519', 43],
]);

function getMetadataProblemReason(token, algorithm) {
	if (token[algorithm.length] !== '-') {
		return 'The algorithm must be followed by `-` and a base64 value.';
	}

	const value = token.slice(algorithm.length + 1);
	const optionsIndex = value.indexOf('?');
	const digest = optionsIndex === -1 ? value : value.slice(0, optionsIndex);
	if (optionsIndex !== -1 && /[^\u{21}-\u{7e}]/v.test(value.slice(optionsIndex + 1))) {
		return 'Options must contain only printable ASCII characters.';
	}

	// Both base64 alphabets and up to two padding characters are permitted by the SRI grammar.
	const match = digest.match(/^([\w+\-\/]+)={0,2}$/v);
	if (!match) {
		return 'The value must contain base64 characters followed by at most two `=` padding characters.';
	}

	const expectedLength = encodedLengths.get(algorithm);
	if (match[1].length !== expectedLength) {
		return `The \`${algorithm}\` value must contain ${expectedLength} base64 characters, excluding padding.`;
	}
}

function * getIntegrityProblems(node, value, location) {
	let hasRecognizedAlgorithm = false;
	const tokens = value.match(/[^\t\n\f\r ]+/gv) ?? [];
	for (const token of tokens) {
		const algorithm = token.match(/^[^\-?]+/v)?.[0];
		if (!encodedLengths.has(algorithm)) {
			continue;
		}

		hasRecognizedAlgorithm = true;
		const reason = getMetadataProblemReason(token, algorithm);
		if (reason) {
			yield {
				node,
				loc: location,
				messageId: 'invalid',
				data: {token, reason},
			};
		}
	}

	if (tokens.length > 0 && !hasRecognizedAlgorithm) {
		yield {
			node,
			loc: location,
			messageId: 'unrecognized',
		};
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const templateDelimiters = ['{{', '{%', '<%', '${', ...Object.keys(context.languageOptions?.templateEngineSyntax ?? context.languageOptions?.parserOptions?.templateEngineSyntax ?? {})];
	context.on(['Tag', 'ScriptTag'], node => {
		if ((node.type !== 'ScriptTag' && !['script', 'link'].includes(node.name.toLowerCase())) || isHtmlRcdataNode(node)) {
			return;
		}

		const attribute = node.attributes.find(attribute => attribute.key?.value?.toLowerCase() === 'integrity');
		if (!attribute?.value || attribute.key.parts.length > 0 || attribute.value.parts.length > 0) {
			return;
		}

		const valueNode = attribute.value;
		const [start] = context.sourceCode.getRange(valueNode);
		// The HTML parser can stop an unquoted value at a slash.
		const raw = attribute.startWrapper ? valueNode.value : context.sourceCode.text.slice(start).match(/^[^\t\n\f\r "'<>`]+/v)?.[0];
		if (!raw) {
			return;
		}

		const value = decodeHTMLAttribute(raw);
		if (templateDelimiters.some(delimiter => raw.includes(delimiter) || value.includes(delimiter))) {
			return;
		}

		return getIntegrityProblems(valueNode, value, toLocation([start, start + raw.length], context));
	});

	context.on('JSXOpeningElement', node => {
		if (node.name.type !== 'JSXIdentifier' || !['script', 'link'].includes(node.name.name)) {
			return;
		}

		const attributeIndex = node.attributes.findLastIndex(attribute => attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' && attribute.name.name === 'integrity');
		const attribute = node.attributes[attributeIndex];
		if (!attribute?.value || node.attributes.slice(attributeIndex + 1).some(attribute => attribute.type === 'JSXSpreadAttribute')) {
			return;
		}

		const valueNode = attribute.value;
		let value;
		if (isStringLiteral(valueNode)) {
			value = valueNode.value;
		} else if (valueNode.type === 'JSXExpressionContainer') {
			value = getStaticValueForControlFlow(valueNode.expression, context)?.value;
		}

		if (typeof value === 'string') {
			return getIntegrityProblems(valueNode, value);
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid subresource integrity metadata.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
			'html/html',
		],
	},
};

export default config;
