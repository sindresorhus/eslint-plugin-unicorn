import {ident, parse} from '@eslint/css-tree';
import {
	getStaticStringValue,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getTypeSymbol,
	isDefaultLibrarySymbol,
	isNullishType,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-transition-all';
const messages = {
	[MESSAGE_ID]: 'Do not use `all` as a transition property.',
};

const transitionProperties = new Set([
	'transition',
	'transition-property',
]);
const domTransitionProperties = [
	'transition',
	'transitionProperty',
];
const domStyleTypeNames = new Set([
	'CSSStyleDeclaration',
	'CSSStyleProperties',
]);

const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();

const getStaticString = node => getStaticStringValue(unwrapTypeScriptExpression(node));

const isAllIdentifier = node => node.type === 'Identifier' && normalizeCssIdentifier(node.name) === 'all';

const isValidPriority = priority => {
	const staticPriority = getStaticString(priority);
	if (staticPriority !== undefined) {
		return staticPriority === '' || staticPriority.toLowerCase() === 'important';
	}

	priority = unwrapTypeScriptExpression(priority);
	return priority?.type !== 'Literal' || priority.value === null;
};

const hasTransitionAll = value => {
	try {
		return parse(value, {context: 'value'}).children.some(node => isAllIdentifier(node));
	} catch {
		return false;
	}
};

const isDomStyleDeclarationType = (type, program) => {
	if (type.isUnion()) {
		const nonNullishTypes = type.types.filter(type => !isNullishType(type));
		return nonNullishTypes.length > 0 && nonNullishTypes.every(type => isDomStyleDeclarationType(type, program));
	}

	const symbol = getTypeSymbol(type);
	return domStyleTypeNames.has(symbol?.getName()) && isDefaultLibrarySymbol(symbol, program);
};

const isDomStyleDeclaration = (node, parserServices) => {
	try {
		return isDomStyleDeclarationType(parserServices.getTypeAtLocation(node), parserServices.program);
	} catch {
		return false;
	}
};

const getDomStyleProblem = (receiver, value, parserServices) => {
	const staticValue = getStaticString(value);
	if (
		staticValue === undefined
		|| !hasTransitionAll(staticValue)
		|| !isDomStyleDeclaration(receiver, parserServices)
	) {
		return;
	}

	return {
		node: value,
		messageId: MESSAGE_ID,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('Declaration', declaration => {
		if (
			!transitionProperties.has(normalizeCssIdentifier(declaration.property))
			|| declaration.value.type !== 'Value'
			|| context.sourceCode.getParent(declaration)?.type !== 'Block'
		) {
			return;
		}

		return declaration.value.children
			.filter(node => isAllIdentifier(node))
			.map(node => ({
				node,
				messageId: MESSAGE_ID,
			}));
	});

	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	context.on('AssignmentExpression', assignment => {
		if (
			assignment.operator !== '='
			|| !isMemberExpression(assignment.left, {properties: domTransitionProperties})
		) {
			return;
		}

		return getDomStyleProblem(assignment.left.object, assignment.right, parserServices);
	});

	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'setProperty',
			minimumArguments: 2,
			maximumArguments: 3,
		})) {
			return;
		}

		const [property, value, priority] = callExpression.arguments;
		if (
			transitionProperties.has(getStaticString(property)?.toLowerCase())
			&& isValidPriority(priority)
		) {
			return getDomStyleProblem(callExpression.callee.object, value, parserServices);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `all` as a transition property.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
			'css/css',
		],
	},
};

export default config;
