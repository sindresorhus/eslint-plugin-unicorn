import {
	getArithmeticOrBitwiseOperator,
	isMemberExpression,
	isMethodCall,
	isNumericUnaryOperator,
} from './ast/index.js';
import {isTypeScriptExpressionWrapper} from './utils/index.js';

const messages = {
	'error/charCodeAt': 'Prefer `String#codePointAt()` over `String#charCodeAt()`.',
	'error/fromCharCode': 'Prefer `String.fromCodePoint()` over `String.fromCharCode()`.',
	'suggestion/codePointAt': 'Use `String#codePointAt()`.',
	'suggestion/fromCodePoint': 'Use `String.fromCodePoint()`.',
};

const getProblem = (node, replacement, hasSuggestion = true) => ({
	node,
	messageId: `error/${node.name}`,
	...(hasSuggestion && {
		suggest: [
			{
				messageId: `suggestion/${replacement}`,
				fix: fixer => fixer.replaceText(node, replacement),
			},
		],
	}),
});

const getNumericContextNode = node => {
	let current = node;

	while (true) {
		const {parent} = current;
		if (parent.type === 'ChainExpression' || parent.type === 'LogicalExpression' || isTypeScriptExpressionWrapper(parent)) {
			current = parent;
			continue;
		}

		if (parent.type === 'ConditionalExpression' && (parent.consequent === current || parent.alternate === current)) {
			current = parent;
			continue;
		}

		return current;
	}
};

/*
`codePointAt` is not a safe rename when the value is used as a number, such as in a string hash. In a loop over `string.length`, `codePointAt` returns the combined code point at a high surrogate but still visits the trailing low surrogate on the next iteration, producing incorrect results. So we keep the report but don't offer the broken suggestion.
*/
const isResultUsedNumerically = node => {
	const current = getNumericContextNode(node);
	const {parent} = current;
	switch (parent.type) {
		case 'BinaryExpression': {
			return getArithmeticOrBitwiseOperator(parent) !== undefined;
		}

		case 'UnaryExpression': {
			return isNumericUnaryOperator(parent.operator);
		}

		// Compound assignment such as `hash += …`. Plain and logical assignments are excluded.
		case 'AssignmentExpression': {
			return parent.right === current && getArithmeticOrBitwiseOperator(parent) !== undefined;
		}

		default: {
			return false;
		}
	}
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (isMethodCall(node, {
			method: 'charCodeAt',
			optionalCall: false,
		})) {
			return getProblem(node.callee.property, 'codePointAt', !isResultUsedNumerically(node));
		}
	});

	context.on('MemberExpression', node => {
		if (isMemberExpression(node, {
			object: 'String',
			property: 'fromCharCode',
			optional: false,
		})) {
			return getProblem(node.property, 'fromCodePoint');
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.',
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
