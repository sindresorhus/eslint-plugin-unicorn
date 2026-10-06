import {findVariable} from '@eslint-community/eslint-utils';
import {getStaticStringValue, isMethodCall, isNewExpression} from './ast/index.js';
import {
	getCommentSafeProblem,
	getConstVariableInitializer,
	getLastTrailingCommentOnSameLine,
	getVariableIdentifiers,
	isGlobalIdentifier,
} from './utils/index.js';
import {appendArgument, removeStatement} from './fix/index.js';

const MESSAGE_ID = 'no-blob-to-file';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Use the original `Blob` instead of converting it to a `File`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the `File` with the original `Blob`.',
};

const isStandaloneConstDeclaration = node =>
	node.parent.type === 'VariableDeclaration'
	&& node.parent.kind === 'const'
	&& node.parent.declarations.length === 1
	&& (
		node.parent.parent.type === 'Program'
		|| node.parent.parent.type === 'BlockStatement'
	);

function isSameBindingAtUse(identifier, reference, context) {
	const {sourceCode} = context;
	return findVariable(sourceCode.getScope(identifier), identifier) === findVariable(sourceCode.getScope(reference), identifier);
}

const isGlobalFormDataConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'FormData',
		argumentsLength: 0,
	})
	&& isGlobalIdentifier(node.callee, context);

function isBlobIdentifier(node, beforeNode, context) {
	const initializer = node && getConstVariableInitializer(node, context);

	if (
		!initializer
		|| context.sourceCode.getRange(initializer)[0] > context.sourceCode.getRange(beforeNode)[0]
	) {
		return false;
	}

	return (
		isNewExpression(initializer, {
			name: 'Blob',
			maximumArguments: 1,
		})
		|| isNewExpression(initializer, {
			name: 'File',
			minimumArguments: 2,
			maximumArguments: 2,
		})
	)
	&& isGlobalIdentifier(initializer.callee, context);
}

function getCommentCheckRange(node, context) {
	const {sourceCode} = context;
	const leadingComment = sourceCode.getCommentsBefore(node).find(comment =>
		sourceCode.getLoc(comment).end.line === sourceCode.getLoc(node).start.line
		|| sourceCode.getLoc(comment).end.line === sourceCode.getLoc(node).start.line - 1);
	const trailingComment = getLastTrailingCommentOnSameLine(context, node);

	return [sourceCode.getRange(leadingComment ?? node)[0], sourceCode.getRange(trailingComment ?? node)[1]];
}

function getBlobIdentifier(newFileExpression, context) {
	if (
		!isNewExpression(newFileExpression, {
			name: 'File',
			minimumArguments: 2,
			maximumArguments: 2,
		})
		|| !isGlobalIdentifier(newFileExpression.callee, context)
	) {
		return;
	}

	const [fileBits, fileName] = newFileExpression.arguments;

	if (
		fileBits.type !== 'ArrayExpression'
		|| fileBits.elements.length !== 1
		|| fileBits.elements[0]?.type === 'SpreadElement'
		|| getStaticStringValue(fileName) === undefined
	) {
		return;
	}

	const [blobIdentifier] = fileBits.elements;

	if (isBlobIdentifier(blobIdentifier, newFileExpression, context)) {
		return blobIdentifier;
	}
}

function getSupportedCall(identifier, context) {
	const {parent} = identifier;

	if (
		isMethodCall(parent, {
			object: 'URL',
			method: 'createObjectURL',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& parent.arguments[0] === identifier
		&& isGlobalIdentifier(parent.callee.object, context)
	) {
		return {
			call: parent,
			kind: 'blobArgument',
		};
	}

	if (!(
		isMethodCall(parent, {
			methods: ['append', 'set'],
			minimumArguments: 2,
			maximumArguments: 3,
			optionalCall: false,
			optionalMember: false,
		})
		&& parent.arguments[1] === identifier
		&& isGlobalFormDataConstructor(getConstVariableInitializer(parent.callee.object, context), context)
	)) {
		return;
	}

	return {
		call: parent,
		kind: 'formData',
	};
}

function getProblem(node, context) {
	const {sourceCode} = context;
	const {id, init} = node;

	if (
		id.type !== 'Identifier'
		|| !isStandaloneConstDeclaration(node)
	) {
		return;
	}

	const blobIdentifier = getBlobIdentifier(init, context);
	if (!blobIdentifier) {
		return;
	}

	const variable = findVariable(sourceCode.getScope(id), id);
	const references = getVariableIdentifiers(variable).filter(identifier => identifier !== id);

	if (references.length !== 1) {
		return;
	}

	const [reference] = references;
	const supportedCall = getSupportedCall(reference, context);

	if (!supportedCall) {
		return;
	}

	if (!isSameBindingAtUse(blobIdentifier, reference, context)) {
		return;
	}

	const [, fileNameNode] = init.arguments;
	const commentCheckRange = getCommentCheckRange(node.parent, context);

	return getCommentSafeProblem(context, {
		node: init,
		messageId: MESSAGE_ID,
		suggest: [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				* fix(fixer) {
					yield removeStatement(node.parent, context, fixer);
					yield fixer.replaceText(reference, sourceCode.getText(blobIdentifier));

					if (
						supportedCall.kind === 'formData'
						&& supportedCall.call.arguments.length === 2
					) {
						yield appendArgument(fixer, supportedCall.call, sourceCode.getText(fileNameNode), context);
					}
				},
			},
		],
	}, commentCheckRange);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('VariableDeclarator', node => getProblem(node, context));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary `Blob` to `File` conversion.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
