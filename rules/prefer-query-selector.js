import {
	getParenthesizedRange,
	isLeftHandSide,
	isNodeValueNotDomNode,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	getStaticStringValue,
	isMethodCall,
	isStringLiteral,
	isNullLiteral,
} from './ast/index.js';
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
const getScopedSelector = value => `:scope ${value}`;

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

function * getLiteralFix(fixer, node, identifierName, shouldScopeSelector) {
	let replacementValue = identifierName === 'getElementById' ? getReplacementForId(node.value) : node.value;

	if (identifierName === 'getElementsByClassName') {
		replacementValue = getReplacementForClass(node.value);
	} else if (identifierName === 'getElementsByName') {
		const quoted = node.raw.charAt(0);
		replacementValue = getReplacementForName(node.value, quoted);
	}

	if (shouldScopeSelector) {
		replacementValue = getScopedSelector(replacementValue);
	}

	yield fixer.replaceText(node, getQuotedReplacement(node, replacementValue));
}

function getTemplateElementReplacement(identifierName, value, prefix, node) {
	switch (identifierName) {
		case 'getElementById': {
			return prefix + getReplacementForId(value);
		}

		case 'getElementsByClassName': {
			return prefix + getReplacementForClass(value);
		}

		case 'getElementsByName': {
			const quoted = node.raw ? node.raw.charAt(0) : '"';
			return prefix + getReplacementForName(value, quoted);
		}

		case 'getElementsByTagName': {
			return prefix + value;
		}

		default: {
			throw new Error(`Unexpected identifier name: ${identifierName}`);
		}
	}
}

function * getTemplateLiteralFix(fixer, node, identifierName, shouldScopeSelector) {
	yield fixer.insertTextAfter(node, '`');
	yield fixer.insertTextBefore(node, '`');

	for (const [index, templateElement] of node.quasis.entries()) {
		const prefix = shouldScopeSelector && index === 0 ? ':scope ' : '';
		const replacement = getTemplateElementReplacement(
			identifierName,
			templateElement.value.cooked,
			prefix,
			node,
		);

		yield fixer.replaceText(templateElement, replacement);
	}
}

const isNonLiteralArgument = node => {
	node = unwrapTypeScriptExpression(node);

	return !isNullLiteral(node)
		&& !isStringLiteral(node)
		&& node.type !== 'BinaryExpression'
		&& !(node.type === 'TemplateLiteral' && node.expressions.length === 0)
		&& !(node.type === 'TemplateLiteral' && node.quasis.some(quasi => quasi.value.cooked?.trim()));
};

const stringNeedsEscaping = (value, raw) =>
	/[\n\r"'\\\u{2028}\u{2029}]/u.test(value)
	|| raw.includes('\\')
	|| /[\n\r\u{2028}\u{2029}]/u.test(raw);

// `getElementsByName` wraps the value in a `[name=…]` CSS selector. Quotes, line terminators, and
// raw escapes can break the generated code or change CSS string escaping, so they can't be fixed.
const nameValueNeedsEscaping = node => {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return stringNeedsEscaping(node.value, node.raw);
	}

	if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
		return node.quasis.some(quasi => stringNeedsEscaping(quasi.value.cooked ?? '', quasi.value.raw));
	}

	return false;
};

const isStaticSelector = node =>
	isStringLiteral(node)
	|| (
		node.type === 'TemplateLiteral'
		&& node.expressions.length === 0
	);

const selectorArgumentMethods = new Set(['getElementById', 'getElementsByClassName', 'getElementsByTagName']);
const simpleCssIdentifierPattern = /^-?[A-Z_a-z][\w-]*$/u;

const isSimpleCssIdentifier = value => simpleCssIdentifierPattern.test(value);

const canUseSelectorArgument = (node, identifierName) => {
	if (!selectorArgumentMethods.has(identifierName)) {
		return true;
	}

	const value = getStaticStringValue(node);

	if (value === undefined) {
		return true;
	}

	if (identifierName === 'getElementById') {
		return isSimpleCssIdentifier(value);
	}

	if (identifierName === 'getElementsByTagName') {
		return value === '*' || isSimpleCssIdentifier(value);
	}

	return value.match(/\S+/gv)?.every(className => isSimpleCssIdentifier(className)) ?? false;
};

const canBeFixed = (node, identifierName) => {
	const unwrappedNode = unwrapTypeScriptExpression(node);

	return canUseSelectorArgument(unwrappedNode, identifierName)
		&& !(identifierName === 'getElementsByName' && nameValueNeedsEscaping(unwrappedNode))
		&& (
			isNullLiteral(unwrappedNode)
			|| (isStringLiteral(unwrappedNode) && Boolean(unwrappedNode.value.trim()))
			|| (
				unwrappedNode.type === 'TemplateLiteral'
				&& unwrappedNode.expressions.length === 0
				&& unwrappedNode.quasis.some(templateElement => templateElement.value.cooked.trim())
			)
		);
};

const isDocumentObject = node =>
	(
		node.type === 'Identifier'
		&& node.name === 'document'
	)
	|| (
		node.type === 'MemberExpression'
		&& !node.computed
		&& node.object.type === 'Identifier'
		&& ['globalThis', 'window'].includes(node.object.name)
		&& node.property.type === 'Identifier'
		&& node.property.name === 'document'
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
	const nodeToBeFixed = unwrapTypeScriptExpression(node.arguments[0]);
	const shouldScopeSelector = !isDocumentObject(node.callee.object) && isStaticSelector(nodeToBeFixed);

	if (
		!shouldScopeSelector
		&& (identifierName === 'getElementsByTagName' || !hasValue(nodeToBeFixed))
	) {
		return function * (fixer) {
			yield fixer.replaceText(node.callee.property, preferredSelector);

			if (firstElementAccess) {
				yield removeFirstElementAccess(fixer, firstElementAccess, context);
			}
		};
	}

	const getArgumentFix = nodeToBeFixed.type === 'Literal' ? getLiteralFix : getTemplateLiteralFix;
	return function * (fixer) {
		yield getArgumentFix(fixer, nodeToBeFixed, identifierName, shouldScopeSelector);
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

		if (canBeFixed(node.arguments[0], method)) {
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
		languages: [
			'js/js',
		],
	},
};

export default config;
