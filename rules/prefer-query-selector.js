import {
	getParenthesizedRange,
	isLeftHandSide,
	isNodeValueNotDomNode,
} from './utils/index.js';
import {isMethodCall, isStringLiteral, isNullLiteral} from './ast/index.js';
import {removeMemberExpressionProperty, removeMethodCall} from './fix/index.js';

const MESSAGE_ID = 'prefer-query-selector';
const messages = {
	[MESSAGE_ID]: 'Prefer `.{{replacement}}()` over `.{{method}}()`.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allowWithVariables: {
				type: 'boolean',
				description: 'Allow using the old APIs when called with non-literal arguments (variables, expressions, etc.).',
			},
		},
	},
];

const disallowedIdentifierNames = new Map([
	['getElementById', 'querySelector'],
	['getElementsByClassName', 'querySelectorAll'],
	['getElementsByTagName', 'querySelectorAll'],
	['getElementsByName', 'querySelectorAll'],
]);

const getReplacementForId = value => `#${value}`;
const getReplacementForClass = value => value.match(/\S+/gv).map(className => `.${className}`).join('');
const getReplacementForName = (value, originQuote) => `[name=${wrapQuoted(value, originQuote)}]`;

const getQuotedReplacement = (node, value) => {
	const leftQuote = node.raw.charAt(0);
	const rightQuote = node.raw.at(-1);
	return `${leftQuote}${value}${rightQuote}`;
};

const wrapQuoted = (value, originalQuote) => {
	switch (originalQuote) {
		case '\'': {
			return `"${value}"`;
		}

		case '"': {
			return `'${value}'`;
		}

		case '`': {
			return `'${value}'`;
		}

		// No default
	}
};

function * getLiteralFix(fixer, node, identifierName) {
	let replacement = node.raw;
	if (identifierName === 'getElementById') {
		replacement = getQuotedReplacement(node, getReplacementForId(node.value));
	}

	if (identifierName === 'getElementsByClassName') {
		replacement = getQuotedReplacement(node, getReplacementForClass(node.value));
	}

	if (identifierName === 'getElementsByName') {
		const quoted = node.raw.charAt(0);
		replacement = getQuotedReplacement(node, getReplacementForName(node.value, quoted));
	}

	yield fixer.replaceText(node, replacement);
}

function * getTemplateLiteralFix(fixer, node, identifierName) {
	yield fixer.insertTextAfter(node, '`');
	yield fixer.insertTextBefore(node, '`');

	for (const templateElement of node.quasis) {
		if (identifierName === 'getElementById') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForId(templateElement.value.cooked),
			);
		}

		if (identifierName === 'getElementsByClassName') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForClass(templateElement.value.cooked),
			);
		}

		if (identifierName === 'getElementsByName') {
			const quoted = node.raw ? node.raw.charAt(0) : '"';
			yield fixer.replaceText(
				templateElement,
				getReplacementForName(templateElement.value.cooked, quoted),
			);
		}
	}
}

const isNonLiteralArgument = node =>
	!isNullLiteral(node)
	&& !isStringLiteral(node)
	&& node.type !== 'BinaryExpression'
	&& !(node.type === 'TemplateLiteral' && node.expressions.length === 0)
	&& !(node.type === 'TemplateLiteral' && node.quasis.some(quasi => quasi.value.cooked?.trim()));

const canBeFixed = node =>
	isNullLiteral(node)
	|| (isStringLiteral(node) && Boolean(node.value.trim()))
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
		&& node.quasis.some(templateElement => templateElement.value.cooked.trim())
	);

const hasValue = node => {
	if (node.type === 'Literal') {
		return node.value;
	}

	return true;
};

const isZeroLiteral = node => node.type === 'Literal' && node.value === 0;

const isWriteTarget = node =>
	isLeftHandSide(node)
	|| (
		(node.parent.type === 'ForInStatement' || node.parent.type === 'ForOfStatement')
		&& node.parent.left === node
	);

const hasCommentsInAccess = (node, callExpression, sourceCode, context) => {
	const [, start] = getParenthesizedRange(callExpression, context);
	const [, end] = sourceCode.getRange(node);

	return sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});
};

const getFirstElementAccess = (node, sourceCode, context) => {
	if (
		node.parent.type === 'MemberExpression'
		&& node.parent.object === node
		&& node.parent.computed
		&& !node.parent.optional
		&& isZeroLiteral(node.parent.property)
		&& !isWriteTarget(node.parent)
		&& !hasCommentsInAccess(node.parent, node, sourceCode, context)
	) {
		return node.parent;
	}

	if (
		node.parent.type === 'MemberExpression'
		&& node.parent.object === node
		&& isMethodCall(node.parent.parent, {
			methods: ['at', 'item'],
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		&& isZeroLiteral(node.parent.parent.arguments[0])
		&& !isWriteTarget(node.parent.parent)
		&& !hasCommentsInAccess(node.parent.parent, node, sourceCode, context)
	) {
		return node.parent.parent;
	}
};

const removeFirstElementAccess = (fixer, node, context) => node.type === 'MemberExpression'
	? removeMemberExpressionProperty(fixer, node, context)
	: removeMethodCall(fixer, node, context);

const fix = ({node, identifierName, preferredSelector, firstElementAccess, context}) => {
	const nodeToBeFixed = node.arguments[0];
	if (identifierName === 'getElementsByTagName' || !hasValue(nodeToBeFixed)) {
		return function * (fixer) {
			yield fixer.replaceText(node.callee.property, preferredSelector);

			if (firstElementAccess) {
				yield removeFirstElementAccess(fixer, firstElementAccess, context);
			}
		};
	}

	const getArgumentFix = nodeToBeFixed.type === 'Literal' ? getLiteralFix : getTemplateLiteralFix;
	return function * (fixer) {
		yield getArgumentFix(fixer, nodeToBeFixed, identifierName);
		yield fixer.replaceText(node.callee.property, preferredSelector);

		if (firstElementAccess) {
			yield removeFirstElementAccess(fixer, firstElementAccess, context);
		}
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {allowWithVariables} = context.options[0];

	context.on('CallExpression', node => {
		if (
			!isMethodCall(node, {
				methods: ['getElementById', 'getElementsByClassName', 'getElementsByTagName', 'getElementsByName'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			|| isNodeValueNotDomNode(node.callee.object)
		) {
			return;
		}

		const method = node.callee.property.name;

		if (
			allowWithVariables
			&& (method === 'getElementById' || method === 'getElementsByClassName')
			&& isNonLiteralArgument(node.arguments[0])
		) {
			return;
		}

		let preferredSelector = disallowedIdentifierNames.get(method);
		const firstElementAccess = preferredSelector === 'querySelectorAll'
			&& getFirstElementAccess(node, context.sourceCode, context);
		if (firstElementAccess) {
			preferredSelector = 'querySelector';
		}

		const problem = {
			node: node.callee.property,
			messageId: MESSAGE_ID,
			data: {
				replacement: preferredSelector,
				method,
			},
		};

		if (canBeFixed(node.arguments[0])) {
			problem.fix = fix({
				node,
				identifierName: method,
				preferredSelector,
				firstElementAccess,
				context,
			});
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.querySelector()` and `.querySelectorAll()` over older DOM query methods.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{allowWithVariables: false}],
		messages,
	},
};

export default config;
