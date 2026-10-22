import {
	getOnlyExpression,
	isNodeValueNotDomNode,
	isSameReference,
	isValueNotUsable,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	shouldReportReplaceChildrenReceiver,
	wouldRemoveComments,
} from './utils/index.js';
import {containsOptionalChain} from './utils/comparison.js';
import {getStaticStringValue, isMemberExpression, isMethodCall} from './ast/index.js';

const messages = {
	replaceChildOrInsertBefore:
		'Prefer `{{oldChildNode}}.{{preferredMethod}}({{newChildNode}})` over `{{parentNode}}.{{method}}({{newChildNode}}, {{oldChildNode}})`.',
	replaceChildOrInsertBeforeSuggestion: 'Switch to `{{oldChildNode}}.{{preferredMethod}}({{newChildNode}})`.',
	insertAdjacentTextOrInsertAdjacentElement:
		'Prefer `{{reference}}.{{preferredMethod}}({{content}})` over `{{reference}}.{{method}}({{position}}, {{content}})`.',
	replaceChildren:
		'Prefer `{{parentNode}}.replaceChildren()` over directly removing `.{{childNodeProperty}}` in a loop.',
};

const disallowedMethods = new Map([
	['replaceChild', 'replaceWith'],
	['insertBefore', 'before'],
]);

const getReplaceChildOrInsertBeforeProblem = (context, node) => {
	const method = node.callee.property.name;
	const parentNode = node.callee.object.name;
	const [newChildNode, oldChildNode] = node.arguments;
	const [newChildNodeName, oldChildNodeName] = node.arguments.map(({name}) => name);
	const preferredMethod = disallowedMethods.get(method);

	const problem = {
		node,
		messageId: 'replaceChildOrInsertBefore',
		data: {
			parentNode,
			method,
			preferredMethod,
			newChildNode: newChildNodeName,
			oldChildNode: oldChildNodeName,
		},
	};

	if (!isValueNotUsable(node) || wouldRemoveComments(context, node, [newChildNode, oldChildNode])) {
		return problem;
	}

	const fix = fixer => fixer.replaceText(
		node,
		`${oldChildNodeName}.${preferredMethod}(${newChildNodeName})`,
	);

	// `replaceChild()` throws when the explicit parent is not the child's parent, while `replaceWith()` uses the child's current parent. The fix only removes that error.
	if (method === 'replaceChild') {
		problem.fix = fix;
		return problem;
	}

	// `insertBefore(child, null)` appends `child`, but `null.before(child)` throws, so the rewrite can only be suggested.
	problem.suggest = [
		{
			messageId: 'replaceChildOrInsertBeforeSuggestion',
			data: problem.data,
			fix,
		},
	];

	return problem;
};

const positionReplacers = new Map([
	['beforebegin', 'before'],
	['afterbegin', 'prepend'],
	['beforeend', 'append'],
	['afterend', 'after'],
]);

const getInsertAdjacentTextOrInsertAdjacentElementProblem = (context, node) => {
	const [positionNode, contentNode] = node.arguments;

	const position = getStaticStringValue(positionNode);
	// Return early when specified position value of first argument is not a recognized value.
	if (!positionReplacers.has(position)) {
		return;
	}

	const method = node.callee.property.name;
	const preferredMethod = positionReplacers.get(position);
	const {sourceCode} = context;
	const content = sourceCode.getText(contentNode);
	const reference = sourceCode.getText(node.callee.object);

	// `insertAdjacentElement()` returns the inserted element, while `insertAdjacentText()` and the preferred methods return `undefined`
	const fix = (
		(method === 'insertAdjacentElement' && !isValueNotUsable(node))
		|| wouldRemoveComments(context, node, [node.callee.object, contentNode])
	)
		? undefined
		// TODO: make a better fix, don't touch reference
		: fixer => fixer.replaceText(
			node,
			`${reference}.${preferredMethod}(${content})`,
		);

	return {
		node,
		messageId: 'insertAdjacentTextOrInsertAdjacentElement',
		data: {
			reference,
			method,
			preferredMethod,
			position: sourceCode.getText(positionNode),
			content,
		},
		fix,
	};
};

const isChildNodeMemberExpression = node =>
	isMemberExpression(node, {
		properties: ['firstChild', 'lastChild'],
		optional: false,
	});

const getReplaceChildrenProblem = (context, node) => {
	const childNode = node.test;
	if (!isChildNodeMemberExpression(childNode)) {
		return;
	}

	const expression = getOnlyExpression(node.body);
	if (
		!isMethodCall(expression, {
			method: 'remove',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})
		|| !isSameReference(childNode, expression.callee.object)
	) {
		return;
	}

	const {sourceCode} = context;
	const parentNode = childNode.object;
	if (
		isNodeValueNotDomNode(parentNode)
		|| containsOptionalChain(parentNode)
		|| !shouldReportReplaceChildrenReceiver(context, parentNode)
	) {
		return;
	}

	const parentNodeText = (
		parentNode.type !== 'Super'
		&& shouldAddParenthesesToMemberExpressionObject(parentNode, context, node)
	)
		? `(${sourceCode.getText(parentNode)})`
		: sourceCode.getText(parentNode);
	const replacement = `${needsSemicolon(sourceCode.getTokenBefore(node), context, parentNodeText) ? ';' : ''}${parentNodeText}.replaceChildren();`;

	const fix = wouldRemoveComments(context, node, [parentNode])
		? undefined
		: fixer => fixer.replaceText(node, replacement);

	return {
		node,
		messageId: 'replaceChildren',
		data: {
			childNodeProperty: childNode.property.name,
			parentNode: parentNodeText,
		},
		fix,
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				methods: ['replaceChild', 'insertBefore'],
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			// We only allow Identifier for now
			&& node.arguments.every(node => node.type === 'Identifier' && node.name !== 'undefined')
			// This check makes sure that only the first method of chained methods with same identifier name e.g: parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta); gets reported
			&& node.callee.object.type === 'Identifier'
		) {
			return getReplaceChildOrInsertBeforeProblem(context, node);
		}
	});

	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				methods: ['insertAdjacentText', 'insertAdjacentElement'],
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			// Position argument should be `string`
			&& getStaticStringValue(node.arguments[0]) !== undefined
			// TODO: remove this limits on second argument
			&& (
				node.arguments[1].type === 'Literal'
				|| node.arguments[1].type === 'Identifier'
				|| getStaticStringValue(node.arguments[1]) !== undefined
			)
			// TODO: remove this limits on callee
			&& node.callee.object.type === 'Identifier'
		) {
			return getInsertAdjacentTextOrInsertAdjacentElementProblem(context, node);
		}
	});

	context.on('WhileStatement', node => getReplaceChildrenProblem(context, node));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer modern DOM APIs.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
