'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValueNotUsable = require('./utils/is-value-not-usable');
const methodSelector = require('./utils/method-selector');

const messages = {
	replaceChildOrInsertBefore:
		'Prefer `{{oldChildNode}}.{{preferredMethod}}({{newChildNode}})` over `{{parentNode}}.{{method}}({{newChildNode}}, {{oldChildNode}})`.'
};

const replaceChildOrInsertBeforeSelector = [
	methodSelector({
		names: ['replaceChild', 'insertBefore'],
		length: 2
	}),
	// We only allow Identifier for now
	'[arguments.0.type="Identifier"]',
	'[arguments.0.name!="undefined"]',
	'[arguments.1.type="Identifier"]',
	'[arguments.1.name!="undefined"]',
	// This check makes sure that only the first method of chained methods with same identifier name e.g: parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta); gets reported
	'[callee.object.type="Identifier"]'
].join('');

const forbiddenMethods = new Map([
	['replaceChild', 'replaceWith'],
	['insertBefore', 'before']
]);

const checkForReplaceChildOrInsertBefore = (context, node) => {
	const method = node.callee.property.name;
	const parentNode = node.callee.object.name;
	const [newChildNode, oldChildNode] = node.arguments.map(({name}) => name);
	const preferredMethod = forbiddenMethods.get(method);

	const fix = isValueNotUsable(node) ?
		fixer => fixer.replaceText(
			node,
			`${oldChildNode}.${preferredMethod}(${newChildNode})`
		) :
		undefined;

	return context.report({
		node,
		messageId: 'replaceChildOrInsertBefore',
		data: {
			parentNode,
			method,
			preferredMethod,
			newChildNode,
			oldChildNode
		},
		fix
	});
};

const selector = methodSelector({
	length: 2
});

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
		[replaceChildOrInsertBeforeSelector](node) {
			checkForReplaceChildOrInsertBefore(context, node);
		},
		[selector](node) {
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
		fixable: 'code',
		messages
	}
};
