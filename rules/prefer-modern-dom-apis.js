'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const getArgumentNameForReplaceChildOrInsertBefore = nodeArguments => {
	if (nodeArguments.type === 'Identifier') {
		return nodeArguments.name;
	}

	return null;
};

const forbiddenIdentifierNames = new Map([
	['replaceChild', 'replaceWith'],
	['insertBefore', 'before']
]);

const checkForReplaceChildOrInsertBefore = (context, node) => {
	const identifierName = node.callee.property.name;

	// Return early when specified methods don't exist in forbiddenIdentifierNames
	if (!forbiddenIdentifierNames.has(identifierName)) {
		return;
	}

	const nodeArguments = node.arguments;
	const newChildNodeArg = getArgumentNameForReplaceChildOrInsertBefore(
		nodeArguments[0]
	);
	const oldChildNodeArg = getArgumentNameForReplaceChildOrInsertBefore(
		nodeArguments[1]
	);

	// Return early in case that one of the provided arguments is not a node
	if (!newChildNodeArg || !oldChildNodeArg) {
		return;
	}

	const parentNode = node.callee.object.name;
	// This check makes sure that only the first method of chained methods with same identifier name e.g: parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta); gets transformed
	if (!parentNode) {
		return;
	}

	const preferredSelector = forbiddenIdentifierNames.get(identifierName);

	return context.report({
		node,
		message: `Prefer \`${oldChildNodeArg}.${preferredSelector}(${newChildNodeArg})\` over \`${parentNode}.${identifierName}(${newChildNodeArg}, ${oldChildNodeArg})\`.`,
		fix: fixer =>
			fixer.replaceText(
				node,
				`${oldChildNodeArg}.${preferredSelector}(${newChildNodeArg})`
			)
	});
};

// Handle both Identifier and Literal because the preferred selectors support nodes and DOMString
const getArgumentNameForInsertAdjacentMethods = nodeArguments => {
	if (nodeArguments.type === 'Identifier') {
		return nodeArguments.name;
	}

	if (nodeArguments.type === 'Literal') {
		return nodeArguments.raw;
	}

	return null;
};

const positionReplacers = new Map([
	['beforebegin', 'before'],
	['afterbegin', 'prepend'],
	['beforeend', 'append'],
	['afterend', 'after']
]);

const checkForInsertAdjacentTextOrInsertAdjacentElement = (context, node) => {
	const identifierName = node.callee.property.name;

	if (
		identifierName !== 'insertAdjacentText' &&
		identifierName !== 'insertAdjacentElement'
	) {
		return;
	}

	const nodeArguments = node.arguments;
	const positionArg = getArgumentNameForInsertAdjacentMethods(nodeArguments[0]);
	const positionAsValue = nodeArguments[0].value;

	// Return early when specified position value of 1st argument is not a recognised value
	if (!positionReplacers.has(positionAsValue)) {
		return;
	}

	const referenceNode = node.callee.object.name;
	const preferredSelector = positionReplacers.get(positionAsValue);
	const insertedTextArg = getArgumentNameForInsertAdjacentMethods(
		nodeArguments[1]
	);

	return context.report({
		node,
		message: `Prefer \`${referenceNode}.${preferredSelector}(${insertedTextArg})\` over \`${referenceNode}.${identifierName}(${positionArg}, ${insertedTextArg})\`.`,
		fix: fixer =>
			fixer.replaceText(
				node,
				`${referenceNode}.${preferredSelector}(${insertedTextArg})`
			)
	});
};

const create = context => {
	return {
		CallExpression(node) {
			if (
				node.callee.type === 'MemberExpression' &&
				node.arguments.length === 2
			) {
				checkForReplaceChildOrInsertBefore(context, node);
				checkForInsertAdjacentTextOrInsertAdjacentElement(context, node);
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code'
	}
};
