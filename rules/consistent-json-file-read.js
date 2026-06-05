import {findVariable, getStaticValue, getPropertyName} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeArgument} from './fix/index.js';

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

const isUtf8EncodingStringNode = (node, scope) =>
	isUtf8EncodingString(getStaticValue(node, scope)?.value);

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

function isUtf8Encoding(node, scope) {
	if (
		node.type === 'ObjectExpression'
		&& node.properties.length === 1
		&& node.properties[0].type === 'Property'
		&& getPropertyName(node.properties[0], scope) === 'encoding'
		&& isUtf8EncodingStringNode(node.properties[0].value, scope)
	) {
		return true;
	}

	if (isUtf8EncodingStringNode(node, scope)) {
		return true;
	}

	const staticValue = getStaticValue(node, scope);
	if (!staticValue) {
		return false;
	}

	const {value} = staticValue;
	if (
		isSingleEncodingOptionObject(value)
		&& isUtf8EncodingString(value.encoding)
	) {
		return true;
	}

	return false;
}

function isBufferEncoding(node, scope) {
	const staticValue = getStaticValue(node, scope);
	if (!staticValue) {
		return false;
	}

	const {value} = staticValue;
	if (value === undefined || value === null) {
		return true;
	}

	if (
		isSingleEncodingOptionObject(value)
		&& (value.encoding === undefined || value.encoding === null)
	) {
		return true;
	}

	return false;
}

function isJsonReadFileCall(node, scope) {
	if (
		!(
			node
			&& node.type === 'CallExpression'
			&& !node.optional
			&& (node.arguments.length === 1 || node.arguments.length === 2)
			&& !node.arguments.some(node => node.type === 'SpreadElement')
			&& node.callee.type === 'MemberExpression'
			&& !node.callee.optional
		)
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
			if (!isBufferEncoding(optionsNode, scope)) {
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
		if (!isUtf8Encoding(charsetNode, scope)) {
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
	},
};

export default config;
