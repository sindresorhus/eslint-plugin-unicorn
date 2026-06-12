import {
	isNodeValueNotDomNode,
	isSameReference,
	isValueNotUsable,
	wouldRemoveComments,
} from './utils/index.js';
import {isMemberExpression, isMethodCall} from './ast/index.js';

const messages = {
	replaceChildOrInsertBefore:
		'Prefer `{{oldChildNode}}.{{preferredMethod}}({{newChildNode}})` over `{{parentNode}}.{{method}}({{newChildNode}}, {{oldChildNode}})`.',
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

	const fix = isValueNotUsable(node) && !wouldRemoveComments(context, node, [newChildNode, oldChildNode])
		? fixer => fixer.replaceText(
			node,
			`${oldChildNodeName}.${preferredMethod}(${newChildNodeName})`,
		)
		: undefined;

	return {
		node,
		messageId: 'replaceChildOrInsertBefore',
		data: {
			parentNode,
			method,
			preferredMethod,
			newChildNode: newChildNodeName,
			oldChildNode: oldChildNodeName,
		},
		fix,
	};
};

const positionReplacers = new Map([
	['beforebegin', 'before'],
	['afterbegin', 'prepend'],
	['beforeend', 'append'],
	['afterend', 'after'],
]);

const getInsertAdjacentTextOrInsertAdjacentElementProblem = (context, node) => {
	const [positionNode, contentNode] = node.arguments;

	const position = positionNode.value;
	// Return early when specified position value of first argument is not a recognized value.
	if (!positionReplacers.has(position)) {
		return;
	}

	const method = node.callee.property.name;
	const preferredMethod = positionReplacers.get(position);
	const {sourceCode} = context;
	const content = sourceCode.getText(contentNode);
	const reference = sourceCode.getText(node.callee.object);

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

const getOnlyBodyStatement = node => {
	if (node.body.type !== 'BlockStatement') {
		return node.body;
	}

	return node.body.body.length === 1
		? node.body.body[0]
		: undefined;
};

const getChildNodeMemberExpression = node => {
	if (
		isMemberExpression(node, {
			properties: ['firstChild', 'lastChild'],
			optional: false,
		})
	) {
		return node;
	}
};

const unknownTypeNames = new Set(['any', 'error', 'unknown']);

const hasZeroArgumentReplaceChildrenCallSignature = (type, checker) =>
	checker.getTypeOfPropertyOfType(type, 'replaceChildren')
		?.getCallSignatures()
		.some(signature => signature.minArgumentCount === 0) ?? false;

const shouldReportReplaceChildrenReceiverType = (type, checker) => {
	type = checker.getNonNullableType(type);

	if (unknownTypeNames.has(type.intrinsicName)) {
		return true;
	}

	if (type.isUnion()) {
		return type.types.every(type => shouldReportReplaceChildrenReceiverType(type, checker));
	}

	const constraint = checker.getBaseConstraintOfType(type);
	if (constraint && constraint !== type) {
		return shouldReportReplaceChildrenReceiverType(constraint, checker);
	}

	if (type.isIntersection()) {
		return hasZeroArgumentReplaceChildrenCallSignature(type, checker)
			|| type.types.some(type => shouldReportReplaceChildrenReceiverType(type, checker));
	}

	return hasZeroArgumentReplaceChildrenCallSignature(type, checker);
};

const shouldReportReplaceChildrenReceiver = (context, node) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return true;
	}

	try {
		const checker = parserServices.program.getTypeChecker();
		return shouldReportReplaceChildrenReceiverType(parserServices.getTypeAtLocation(node), checker);
	} catch {
		return true;
	}
};

const getReplaceChildrenProblem = (context, node) => {
	const childNode = getChildNodeMemberExpression(node.test);
	if (!childNode) {
		return;
	}

	const bodyStatement = getOnlyBodyStatement(node);
	if (bodyStatement?.type !== 'ExpressionStatement') {
		return;
	}

	const {expression} = bodyStatement;
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
		|| !shouldReportReplaceChildrenReceiver(context, parentNode)
	) {
		return;
	}

	const parentNodeText = sourceCode.getText(parentNode);
	const replacement = `${parentNodeText}.replaceChildren();`;

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

/** @param {import('eslint').Rule.RuleContext} context */
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
			&& node.arguments[0].type === 'Literal'
			// TODO: remove this limits on second argument
			&& (
				node.arguments[1].type === 'Literal'
				|| node.arguments[1].type === 'Identifier'
			)
			// TODO: remove this limits on callee
			&& node.callee.object.type === 'Identifier'
		) {
			return getInsertAdjacentTextOrInsertAdjacentElementProblem(context, node);
		}
	});

	context.on('WhileStatement', node => getReplaceChildrenProblem(context, node));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description:
				// eslint-disable-next-line @stylistic/max-len
				'Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`, and `.replaceChildren()` over direct `.firstChild.remove()`/`.lastChild.remove()` loops.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
