import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall, isNewExpression} from './ast/index.js';
import {getVariableIdentifiers} from './utils/index.js';

const MESSAGE_ID = 'no-blob-to-file';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Use the original `Blob` instead of converting it to a `File`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace the `File` with the original `Blob`.',
};

const isWhitespaceOnly = text => /^\s*$/.test(text);

const isStandaloneConstDeclaration = node =>
	node.parent.type === 'VariableDeclaration'
	&& node.parent.kind === 'const'
	&& node.parent.declarations.length === 1
	&& (
		node.parent.parent.type === 'Program'
		|| node.parent.parent.type === 'BlockStatement'
	);

function isGlobalIdentifier(node, context) {
	const variable = findVariable(context.sourceCode.getScope(node), node);
	return !variable || variable.defs.length === 0;
}

function isSameBindingAtUse(identifier, reference, context) {
	if (identifier.type !== 'Identifier') {
		return true;
	}

	const {sourceCode} = context;
	return findVariable(sourceCode.getScope(identifier), identifier) === findVariable(sourceCode.getScope(reference), identifier);
}

const isGlobalFormDataConstructor = (node, context) =>
	isNewExpression(node, {
		name: 'FormData',
		argumentsLength: 0,
	})
	&& isGlobalIdentifier(node.callee, context);

function getConstIdentifierDeclaration(node, context) {
	if (node?.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	const definition = variable?.defs[0];
	const declaration = definition?.node;

	if (
		definition?.type === 'Variable'
		&& definition.kind === 'const'
		&& declaration?.type === 'VariableDeclarator'
	) {
		return declaration;
	}
}

function getFileNameNode(newFileExpression) {
	const [, fileNameNode] = newFileExpression.arguments;
	return fileNameNode;
}

const isStringLiteral = node =>
	(node.type === 'Literal' && typeof node.value === 'string')
	|| (node.type === 'TemplateLiteral' && node.expressions.length === 0);

function isBlobIdentifier(node, beforeNode, context) {
	const declaration = getConstIdentifierDeclaration(node, context);
	const initializer = declaration?.init;

	if (
		!declaration
		|| context.sourceCode.getRange(declaration)[0] > context.sourceCode.getRange(beforeNode)[0]
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

function hasComments(node, context) {
	const {sourceCode} = context;

	return sourceCode.getCommentsInside(node).length > 0
		|| sourceCode.getCommentsBefore(node).some(comment =>
			sourceCode.getLoc(comment).end.line === sourceCode.getLoc(node).start.line
			|| sourceCode.getLoc(comment).end.line === sourceCode.getLoc(node).start.line - 1)
		|| sourceCode.getCommentsAfter(node).some(comment =>
			sourceCode.getLoc(comment).start.line === sourceCode.getLoc(node).end.line);
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

	const [fileBits] = newFileExpression.arguments;
	const [, fileName] = newFileExpression.arguments;

	if (
		fileBits.type !== 'ArrayExpression'
		|| fileBits.elements.length !== 1
		|| fileBits.elements[0]?.type === 'SpreadElement'
		|| !isStringLiteral(fileName)
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
		&& isGlobalFormDataConstructor(getConstIdentifierDeclaration(parent.callee.object, context)?.init, context)
	)) {
		return;
	}

	return {
		call: parent,
		kind: 'formData',
	};
}

function removeStatement(statement, context, fixer) {
	const {sourceCode} = context;
	const {lines} = sourceCode;
	const startLocation = sourceCode.getLoc(statement).start;
	const lastToken = sourceCode.getLastToken(statement);
	const endLocation = sourceCode.getLoc(lastToken).end;

	const textBefore = lines[startLocation.line - 1].slice(0, startLocation.column);
	const textAfter = lines[endLocation.line - 1].slice(endLocation.column);

	let [start] = sourceCode.getRange(statement);
	let [, end] = sourceCode.getRange(lastToken);

	if (isWhitespaceOnly(textBefore) && isWhitespaceOnly(textAfter)) {
		end += textAfter.length;

		if (start === 0) {
			const {text} = sourceCode;

			if (text[end] === '\r' && text[end + 1] === '\n') {
				end += 2;
			} else if (text[end] === '\n' || text[end] === '\r') {
				end++;
			}
		} else {
			start = Math.max(0, start - textBefore.length - 1);
		}
	}

	return fixer.removeRange([start, end]);
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
	if (!variable) {
		return;
	}

	const references = getVariableIdentifiers(variable).filter(identifier => identifier !== id);

	if (references.length !== 1) {
		return;
	}

	const [reference] = references;
	const supportedCall = getSupportedCall(reference, context);

	if (!supportedCall) {
		return;
	}

	const fileNameNode = getFileNameNode(init);

	if (
		!isSameBindingAtUse(blobIdentifier, reference, context)
		|| hasComments(node.parent, context)
		|| (
			supportedCall.kind === 'formData'
			&& supportedCall.call.arguments.length === 2
			&& !fileNameNode
		)
	) {
		return;
	}

	return {
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
						yield fixer.insertTextAfter(reference, `, ${sourceCode.getText(fileNameNode)}`);
					}
				},
			},
		],
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('VariableDeclarator', node => getProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
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
	},
};

export default config;
