'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const checkForReplaceChildOrInsertBefore = (context, node) => {
	const getArgumentName = args => {
		if (args.type === 'Identifier') {
			return args.name;
		}

		return null;
	};

	const forbiddenIdentifierNames = new Map([
		['replaceChild', 'replaceWith'],
		['insertBefore', 'before']
	]);

	const identifierName = node.callee.property.name;

	// Only handle methods that exist in forbiddenIdentifierNames
	if (forbiddenIdentifierNames.has(identifierName)) {
		const args = node.arguments;
		const newChildNodeArg = getArgumentName(args[0]);
		const oldChildNodeArg = getArgumentName(args[1]);

		// Return early in case that one of the provided arguments is not a node
		if (!newChildNodeArg || !oldChildNodeArg) {
			return;
		}

		const parentNode = node.callee.object.name;
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
	}
};

const checkForInsertAdjacentTextOrInsertAdjacentElement = (context, node) => {
	// Handle both Identifier and Literal because the preferred selectors support nodes and DOMString
	const getArgumentName = args => {
		if (args.type === 'Identifier') {
			return args.name;
		}

		if (args.type === 'Literal') {
			return args.raw;
		}

		return null;
	};

	const positionReplacers = new Map([
		['beforebegin', 'before'],
		['afterbegin', 'prepend'],
		['beforeend', 'append'],
		['afterend', 'after']
	]);

	const identifierName = node.callee.property.name;

	if (
		identifierName === 'insertAdjacentText' ||
		identifierName === 'insertAdjacentElement'
	) {
		const args = node.arguments;
		const positionArg = getArgumentName(args[0]);
		const positionAsValue = args[0].value;

		// Return early when specified position value of 1st argument is not a recognised value
		if (!positionReplacers.has(positionAsValue)) {
			return;
		}

		const referenceNode = node.callee.object.name;
		const preferredSelector = positionReplacers.get(positionAsValue);
		const insertedTextArg = getArgumentName(args[1]);

		return context.report({
			node,
			message: `Prefer \`${referenceNode}.${preferredSelector}(${insertedTextArg})\` over \`${referenceNode}.${identifierName}(${positionArg}, ${insertedTextArg})\`.`,
			fix: fixer =>
				fixer.replaceText(
					node,
					`${referenceNode}.${preferredSelector}(${insertedTextArg})`
				)
		});
	}
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
