import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeArgument} from './fix/index.js';
import {getStaticValueIfNoSideEffects} from './utils/index.js';

const MESSAGE_ID_STRING = 'consistent-json-file-read/string';
const MESSAGE_ID_BUFFER = 'consistent-json-file-read/buffer';
const messages = {
	[MESSAGE_ID_STRING]: 'Prefer reading the JSON file as a string.',
	[MESSAGE_ID_BUFFER]: 'Prefer reading the JSON file as a buffer.',
};

const getAwaitExpressionArgument = node => {
	while (node.type === 'AwaitExpression') {
		node = node.argument;
	}

	return node;
};

function getIdentifierDeclaration(node, scope) {
	if (!node) {
		return;
	}

	node = getAwaitExpressionArgument(node);

	if (!node || node.type !== 'Identifier') {
		return {node, scope};
	}

	const variable = findVariable(scope, node);
	if (!variable) {
		return;
	}

	const {identifiers, references} = variable;

	if (identifiers.length !== 1 || references.length !== 2) {
		return;
	}

	const [identifier] = identifiers;

	if (
		identifier.parent.type !== 'VariableDeclarator'
		|| identifier.parent.id !== identifier
	) {
		return;
	}

	return getIdentifierDeclaration(identifier.parent.init, variable.scope);
}

const hasEncodingAccessorDefinition = (node, sourceCode) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	return Boolean(variable?.references.some(reference => {
		const callExpression = reference.identifier.parent;
		if (
			callExpression?.type !== 'CallExpression'
			|| callExpression.callee.type !== 'MemberExpression'
			|| callExpression.callee.object.type !== 'Identifier'
			|| callExpression.callee.object.name !== 'Object'
			|| callExpression.callee.property.type !== 'Identifier'
			|| callExpression.callee.property.name !== 'defineProperty'
			|| callExpression.arguments[0] !== reference.identifier
			|| !callExpression.arguments[1]
			|| callExpression.arguments[2]?.type !== 'ObjectExpression'
			|| getStaticValueIfNoSideEffects(callExpression.arguments[1], {sourceCode})?.value !== 'encoding'
		) {
			return false;
		}

		return callExpression.arguments[2].properties.some(property => {
			if (property.type !== 'Property') {
				return false;
			}

			const propertyName = getPropertyName(property, sourceCode.getScope(property));
			return propertyName === 'get' || propertyName === 'set';
		});
	}));
};

const isUtf8EncodingStringNode = (node, sourceCode) =>
	isUtf8EncodingString(getStaticValueIfNoSideEffects(node, {sourceCode})?.value);

const isUtf8EncodingString = value => {
	if (typeof value !== 'string') {
		return false;
	}

	value = value.toLowerCase();

	// eslint-disable-next-line unicorn/text-encoding-identifier-case
	return value === 'utf8' || value === 'utf-8';
};

const isSingleEncodingOptionObject = value =>
	value
	&& typeof value === 'object'
	&& Object.keys(value).length === 1
	&& Object.hasOwn(value, 'encoding');

function isUtf8Encoding(node, scope, sourceCode) {
	if (hasEncodingAccessorDefinition(node, sourceCode)) {
		return false;
	}

	if (
		node.type === 'ObjectExpression'
		&& node.properties.length === 1
		&& node.properties[0].type === 'Property'
		&& getPropertyName(node.properties[0], scope) === 'encoding'
		&& isUtf8EncodingStringNode(node.properties[0].value, sourceCode)
	) {
		return true;
	}

	if (isUtf8EncodingStringNode(node, sourceCode)) {
		return true;
	}

	const staticValue = getStaticValueIfNoSideEffects(node, {sourceCode});
	if (!staticValue) {
		return false;
	}

	const {value} = staticValue;
	return Boolean(isSingleEncodingOptionObject(value)
		&& isUtf8EncodingString(value.encoding));
}

function isBufferEncoding(node, scope, sourceCode) {
	if (hasEncodingAccessorDefinition(node, sourceCode)) {
		return false;
	}

	const staticValue = getStaticValueIfNoSideEffects(node, {sourceCode});
	if (!staticValue) {
		return false;
	}

	const {value} = staticValue;
	if (value === undefined || value === null) {
		return true;
	}

	return Boolean(isSingleEncodingOptionObject(value)
		&& (value.encoding === undefined || value.encoding === null));
}

function isJsonReadFileCall(node, scope) {
	if (
		!(node
			&& node.type === 'CallExpression'
			&& !node.optional
			&& (node.arguments.length === 1 || node.arguments.length === 2)
			&& node.arguments.every(node => node.type !== 'SpreadElement')
			&& node.callee.type === 'MemberExpression') || node.callee.optional
	) {
		return false;
	}

	const method = getPropertyName(node.callee, scope);
	return method === 'readFile' || method === 'readFileSync';
}

function addUtf8Encoding(fixer, callExpression, context) {
	const {sourceCode} = context;
	const [fileNode] = callExpression.arguments;
	const tokenAfterFile = sourceCode.getTokenAfter(fileNode);

	if (tokenAfterFile.value === ',') {
		return fixer.insertTextAfter(tokenAfterFile, ' \'utf8\'');
	}

	return fixer.insertTextAfter(fileNode, ', \'utf8\'');
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const [option] = context.options;

	context.on('CallExpression', callExpression => {
		if (!(isMethodCall(callExpression, {
			object: 'JSON',
			method: 'parse',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		}))) {
			return;
		}

		const [argument] = callExpression.arguments;
		const {sourceCode} = context;
		const resolved = getIdentifierDeclaration(argument, sourceCode.getScope(argument));
		if (!resolved) {
			return;
		}

		const {node, scope} = resolved;
		if (!isJsonReadFileCall(node, scope)) {
			return;
		}

		if (option === 'string') {
			if (node.arguments.length === 1) {
				return {
					node,
					messageId: MESSAGE_ID_STRING,
					fix: fixer => addUtf8Encoding(fixer, node, context),
				};
			}

			const [, optionsNode] = node.arguments;
			if (!isBufferEncoding(optionsNode, scope, sourceCode)) {
				return;
			}

			return {
				node: optionsNode,
				messageId: MESSAGE_ID_STRING,
				fix: fixer => fixer.replaceText(optionsNode, '\'utf8\''),
			};
		}

		if (node.arguments.length !== 2) {
			return;
		}

		const [, charsetNode] = node.arguments;
		if (!isUtf8Encoding(charsetNode, scope, sourceCode)) {
			return;
		}

		return {
			node: charsetNode,
			messageId: MESSAGE_ID_BUFFER,
			fix: fixer => removeArgument(fixer, charsetNode, context),
		};
	});
};

const schema = [
	{
		enum: ['string', 'buffer'],
		description: 'Whether to prefer reading JSON files as strings or buffers before passing them to `JSON.parse()`.',
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent JSON file reads before `JSON.parse()`.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: ['string'],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
