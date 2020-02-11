'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');

const selector = methodSelector({
	length: 2
});

const getArgumentNameForReplaceChildOrInsertBefore = nodeArguments => {
	if (nodeArguments.type === 'Identifier') {
		return nodeArguments.name;
	}
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
	const newChildNodeArgument = getArgumentNameForReplaceChildOrInsertBefore(
		nodeArguments[0]
	);
	const oldChildNodeArgument = getArgumentNameForReplaceChildOrInsertBefore(
		nodeArguments[1]
	);

	// Return early in case that one of the provided arguments is not a node
	if (!newChildNodeArgument || !oldChildNodeArgument) {
		return;
	}

	const parentNode = node.callee.object.name;
	// This check makes sure that only the first method of chained methods with same identifier name e.g: parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta); gets reported
	if (!parentNode) {
		return;
	}

	const preferredSelector = forbiddenIdentifierNames.get(identifierName);

	const fix = isValueNotUsable(node) ?
		// Report error when the method is part of a variable assignment
		// but don't offer to autofix `.replaceWith()` and `.before()`
		// which don't have a return value.
		fixer => fixer.replaceText(
			node,
			`${oldChildNodeArgument}.${preferredSelector}(${newChildNodeArgument})`
		) :
		undefined;

	return context.report({
		node,
		message: `Prefer \`${oldChildNodeArgument}.${preferredSelector}(${newChildNodeArgument})\` over \`${parentNode}.${identifierName}(${newChildNodeArgument}, ${oldChildNodeArgument})\`.`,
		fix
	});
};

// Handle both `Identifier` and `Literal` because the preferred selectors support nodes and DOMString.
const getArgumentNameForInsertAdjacentMethods = nodeArguments => {
	if (nodeArguments.type === 'Identifier') {
		return nodeArguments.name;
	}

	if (nodeArguments.type === 'Literal') {
		return nodeArguments.raw;
	}
};

const positionReplacers = new Map([
	['beforebegin', 'before'],
	['afterbegin', 'prepend'],
	['beforeend', 'append'],
	['afterend', 'after']
]);

const checkForInsertAdjacentTextOrInsertAdjacentElement = (context, node) => {
	const identifierName = node.callee.property.name;

	// Return early when method name is not one of the targeted ones.
	if (
		identifierName !== 'insertAdjacentText' &&
		identifierName !== 'insertAdjacentElement'
	) {
		return;
	}

	const nodeArguments = node.arguments;
	const positionArgument = getArgumentNameForInsertAdjacentMethods(nodeArguments[0]);
	const positionAsValue = nodeArguments[0].value;

	// Return early when specified position value of first argument is not a recognized value.
	if (!positionReplacers.has(positionAsValue)) {
		return;
	}

	const referenceNode = node.callee.object.name;
	const preferredSelector = positionReplacers.get(positionAsValue);
	const insertedTextArgument = getArgumentNameForInsertAdjacentMethods(
		nodeArguments[1]
	);

	const fix = identifierName === 'insertAdjacentElement' && !isValueNotUsable(node) ?
		// Report error when the method is part of a variable assignment
		// but don't offer to autofix `.insertAdjacentElement()`
		// which doesn't have a return value.
		undefined :
		fixer =>
			fixer.replaceText(
				node,
				`${referenceNode}.${preferredSelector}(${insertedTextArgument})`
			);

	return context.report({
		node,
		message: `Prefer \`${referenceNode}.${preferredSelector}(${insertedTextArgument})\` over \`${referenceNode}.${identifierName}(${positionArgument}, ${insertedTextArgument})\`.`,
		fix
	});
};

const create = context => {
	return {
		[selector](node) {
			checkForReplaceChildOrInsertBefore(context, node);
			checkForInsertAdjacentTextOrInsertAdjacentElement(context, node);
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
