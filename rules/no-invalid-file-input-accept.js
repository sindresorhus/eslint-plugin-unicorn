import {MIMEType} from 'node:util';
import {getStaticValue} from '@eslint-community/eslint-utils';
import {isStringLiteral} from './ast/index.js';
import {replaceStringRaw} from './fix/index.js';

const MESSAGE_ID_INVALID = 'no-invalid-file-input-accept/invalid';
const MESSAGE_ID_STATIC = 'no-invalid-file-input-accept/static';
const MESSAGE_ID_NORMALIZE = 'no-invalid-file-input-accept/normalize';

const messages = {
	[MESSAGE_ID_INVALID]: 'Invalid file input `accept` value: {{reason}}',
	[MESSAGE_ID_STATIC]: 'The file input `accept` value must be static.',
	[MESSAGE_ID_NORMALIZE]: 'Prefer `{{replacement}}` as the file input `accept` value.',
};

const validWildcardMimeTypes = new Set([
	'audio/*',
	'image/*',
	'video/*',
]);

const commonMimeTypeMistakes = new Map([
	['image/jpg', 'image/jpeg'],
	['image/svg', 'image/svg+xml'],
]);

const htmlCharacterReferencePattern = /&(?:#\d+|#x[\da-f]+|[a-z][\da-z]*);/iv;

const hasInvalidExtensionCharacter = value => {
	for (const character of value) {
		if (
			character.trim() === ''
			|| character === ','
			|| character === '/'
			|| character === '*'
			|| character === '$'
			|| character === '{'
			|| character === '}'
		) {
			return true;
		}
	}

	return false;
};

const isValidExtension = token => token.length > 1 && !hasInvalidExtensionCharacter(token.slice(1));

const isValidBareExtension = token =>
	token.length > 0
	&& token[0] !== '.'
	&& !hasInvalidExtensionCharacter(token);

const normalizeExtension = token => {
	if (isValidExtension(token)) {
		return {replacement: token.toLowerCase()};
	}

	return {
		reason: 'File extensions must start with `.` and cannot contain whitespace, commas, slashes, wildcards, or template markers.',
	};
};

const normalizeBareExtension = token => {
	if (isValidBareExtension(token)) {
		return {replacement: `.${token.toLowerCase()}`};
	}

	return {
		reason: 'File extensions must start with `.` and cannot contain whitespace, commas, slashes, wildcards, or template markers.',
	};
};

const normalizeMimeType = token => {
	const lowerCaseToken = token.toLowerCase();
	if (lowerCaseToken.includes('*')) {
		if (validWildcardMimeTypes.has(lowerCaseToken)) {
			return {replacement: lowerCaseToken};
		}

		return {
			reason: 'Wildcard MIME types must be `audio/*`, `image/*`, or `video/*`.',
		};
	}

	try {
		const mimeType = new MIMEType(token);
		const {essence} = mimeType;
		return {replacement: commonMimeTypeMistakes.get(essence) ?? essence};
	} catch {
		return {reason: 'MIME types must use valid `type/subtype` syntax.'};
	}
};

const normalizeAcceptToken = token => {
	if (token.startsWith('.')) {
		return normalizeExtension(token);
	}

	if (!token.includes('/')) {
		return normalizeBareExtension(token);
	}

	return normalizeMimeType(token);
};

const checkAcceptValue = value => {
	const tokens = value.split(',');
	const seenTokens = new Set();
	const replacementTokens = [];

	for (const rawToken of tokens) {
		const token = rawToken.trim();
		if (token.length === 0) {
			return {reason: 'Empty entries are not allowed.'};
		}

		const result = normalizeAcceptToken(token);
		if (result.reason) {
			return result;
		}

		const {replacement} = result;
		if (seenTokens.has(replacement)) {
			continue;
		}

		seenTokens.add(replacement);
		replacementTokens.push(replacement);
	}

	const replacement = replacementTokens.join(', ');
	if (replacement === value) {
		return {};
	}

	return {replacement};
};

const getJsxName = node => {
	if (node.type !== 'JSXIdentifier') {
		return;
	}

	return node.name;
};

const getJsxAttribute = (node, name) => node.attributes.find(attribute => attribute.type === 'JSXAttribute' && getJsxName(attribute.name) === name);

const getStaticExpressionValue = (context, node) => {
	const scope = context.sourceCode.getScope(node);
	const staticValue = getStaticValue(node, scope)?.value;
	if (typeof staticValue !== 'string') {
		return;
	}

	return staticValue;
};

const getJsxAttributeValue = (context, attribute) => {
	if (!attribute.value) {
		return {
			node: attribute,
			missing: true,
		};
	}

	if (isStringLiteral(attribute.value)) {
		return {
			node: attribute.value,
			value: attribute.value.value,
			fixable: true,
		};
	}

	if (attribute.value.type !== 'JSXExpressionContainer') {
		return {
			node: attribute.value,
			dynamic: true,
		};
	}

	const value = getStaticExpressionValue(context, attribute.value.expression);
	if (value === undefined) {
		return {
			node: attribute.value,
			dynamic: true,
		};
	}

	return {
		node: attribute.value,
		value,
		fixable: false,
	};
};

const getJsxAttributeStaticValue = (context, attribute) => {
	if (!attribute?.value) {
		return;
	}

	if (isStringLiteral(attribute.value)) {
		return attribute.value.value;
	}

	if (attribute.value.type === 'JSXExpressionContainer') {
		return getStaticExpressionValue(context, attribute.value.expression);
	}
};

const getHtmlAttribute = (node, name) => node.attributes.find(attribute => attribute.type === 'Attribute' && attribute.key?.value?.toLowerCase() === name);

const isHtmlAttributeBoundary = character =>
	character === '>'
	|| character.trim() === '';

const skipHtmlWhitespace = (source, index, end) => {
	while (index < end && source[index].trim() === '') {
		index++;
	}

	return index;
};

const isHtmlOpeningTagEnd = (source, index, end) =>
	index >= end
	|| source[index] === '>'
	|| (
		source[index] === '/'
		&& source[index + 1] === '>'
	);

const readHtmlAttributeName = (source, index, end) => {
	const start = index;

	while (
		index < end
		&& source[index].trim() !== ''
		&& source[index] !== '='
		&& source[index] !== '>'
		&& !(source[index] === '/' && source[index + 1] === '>')
	) {
		index++;
	}

	return {
		name: source.slice(start, index).toLowerCase(),
		index,
	};
};

const readHtmlAttributeValue = (source, index, end) => {
	const quote = source[index] === '"' || source[index] === '\'' ? source[index] : undefined;
	if (quote) {
		const start = index + 1;
		index = start;

		while (index < end && source[index] !== quote) {
			index++;
		}

		return {
			value: source.slice(start, index),
			valueRange: [start, index],
			isQuoted: true,
			index: index + 1,
		};
	}

	const start = index;
	while (
		index < end
		&& !isHtmlAttributeBoundary(source[index])
	) {
		index++;
	}

	return {
		value: source.slice(start, index),
		valueRange: [start, index],
		isQuoted: false,
		index,
	};
};

const getHtmlOpeningTagAttribute = (context, node, name) => {
	const source = context.sourceCode.text;
	const start = context.sourceCode.getRange(node.openStart)[1];
	const end = context.sourceCode.getRange(node.openEnd)[1];
	let index = start;

	while (index < end) {
		index = skipHtmlWhitespace(source, index, end);
		if (isHtmlOpeningTagEnd(source, index, end)) {
			break;
		}

		const attributeName = readHtmlAttributeName(source, index, end);
		index = skipHtmlWhitespace(source, attributeName.index, end);

		if (source[index] !== '=') {
			if (attributeName.name === name) {
				return {missing: true};
			}

			continue;
		}

		index++;
		index = skipHtmlWhitespace(source, index, end);

		const attributeValue = readHtmlAttributeValue(source, index, end);
		index = attributeValue.index;

		if (attributeName.name === name) {
			return attributeValue;
		}
	}
};

const getHtmlAttributeValue = (context, node, name) => {
	const scannedAttribute = getHtmlOpeningTagAttribute(context, node, name);
	if (!scannedAttribute) {
		return;
	}

	const attribute = getHtmlAttribute(node, name);
	if (scannedAttribute.missing) {
		return {
			node: attribute ?? node,
			missing: true,
		};
	}

	if (attribute?.value?.parts?.length > 0) {
		return {
			node: attribute.value,
			dynamic: true,
		};
	}

	if (htmlCharacterReferencePattern.test(scannedAttribute.value)) {
		return;
	}

	return {
		node: attribute?.value ?? node,
		value: scannedAttribute.value,
		fixable: true,
		valueRange: scannedAttribute.valueRange,
		isReplacementFixable: replacement => scannedAttribute.isQuoted || !/\s/v.test(replacement),
	};
};

const createProblem = ({valueNode, checkResult, fix}) => {
	if (checkResult.reason) {
		return {
			node: valueNode,
			messageId: MESSAGE_ID_INVALID,
			data: {
				reason: checkResult.reason,
			},
		};
	}

	if (checkResult.replacement) {
		const problem = {
			node: valueNode,
			messageId: MESSAGE_ID_NORMALIZE,
			data: {
				replacement: checkResult.replacement,
			},
		};

		if (fix) {
			problem.fix = fix;
		}

		return problem;
	}
};

const checkValue = ({valueInfo, fix}) => {
	if (valueInfo.missing) {
		return {
			node: valueInfo.node,
			messageId: MESSAGE_ID_INVALID,
			data: {
				reason: 'The `accept` attribute must have a value.',
			},
		};
	}

	if (valueInfo.dynamic) {
		return {
			node: valueInfo.node,
			messageId: MESSAGE_ID_STATIC,
		};
	}

	const checkResult = checkAcceptValue(valueInfo.value);
	const isFixable = checkResult.replacement
		&& valueInfo.fixable
		&& (!valueInfo.isReplacementFixable || valueInfo.isReplacementFixable(checkResult.replacement));

	return createProblem({
		valueNode: valueInfo.node,
		checkResult,
		fix: isFixable ? fix(checkResult.replacement) : undefined,
	});
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('JSXOpeningElement', node => {
		if (getJsxName(node.name) !== 'input') {
			return;
		}

		const typeAttribute = getJsxAttribute(node, 'type');
		const type = getJsxAttributeStaticValue(context, typeAttribute);
		if (type?.toLowerCase() !== 'file') {
			return;
		}

		const acceptAttribute = getJsxAttribute(node, 'accept');
		if (!acceptAttribute) {
			return;
		}

		const valueInfo = getJsxAttributeValue(context, acceptAttribute);
		return checkValue({
			valueInfo,
			fix: replacement => fixer => replaceStringRaw(valueInfo.node, replacement, context, fixer),
		});
	});

	context.on('Tag', node => {
		if (node.name.toLowerCase() !== 'input') {
			return;
		}

		const type = getHtmlOpeningTagAttribute(context, node, 'type')?.value;
		if (type?.toLowerCase() !== 'file') {
			return;
		}

		const valueInfo = getHtmlAttributeValue(context, node, 'accept');
		if (!valueInfo) {
			return;
		}

		return checkValue({
			valueInfo,
			fix: replacement => fixer => fixer.replaceTextRange(valueInfo.valueRange, replacement),
		});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid `accept` values on file inputs.',
			recommended: false,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
