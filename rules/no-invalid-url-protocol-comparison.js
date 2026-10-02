import {getStaticStringValue, isMethodCall, isNewExpression} from './ast/index.js';
import {replaceStringRaw} from './fix/index.js';
import {isUrl, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-invalid-url-protocol-comparison';
const messages = {
	[MESSAGE_ID]: '`URL#protocol` values are lowercase and end with `:`. Compare with `{{protocol}}`.',
};
const equalityOperators = new Set(['==', '===', '!=', '!==']);

const getNormalizedProtocol = node => {
	const value = getStaticStringValue(unwrapTypeScriptExpression(node));
	if (typeof value !== 'string' || !/^[A-Za-z][\d+\-.A-Za-z]*:?$/v.test(value)) {
		return;
	}

	return (value.endsWith(':') ? value : `${value}:`).toLowerCase();
};

const isUrlProtocol = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ChainExpression') {
		node = unwrapTypeScriptExpression(node.expression);
	}

	return node.type === 'MemberExpression'
		&& (node.computed ? getStaticStringValue(unwrapTypeScriptExpression(node.property)) === 'protocol' : node.property.name === 'protocol')
		&& isUrl(node.object, context);
};

const getProtocolProblem = (node, context) => {
	node = unwrapTypeScriptExpression(node);
	const protocol = getNormalizedProtocol(node);
	if (protocol === undefined || protocol === getStaticStringValue(node)) {
		return;
	}

	return {
		node,
		messageId: MESSAGE_ID,
		data: {protocol},
		fix: fixer => replaceStringRaw(node, protocol, context, fixer),
	};
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('BinaryExpression', node => {
		if (!equalityOperators.has(node.operator)) {
			return;
		}

		if (isUrlProtocol(node.left, context)) {
			return getProtocolProblem(node.right, context);
		}

		if (isUrlProtocol(node.right, context)) {
			return getProtocolProblem(node.left, context);
		}
	});

	context.on('SwitchStatement', function * (node) {
		if (!isUrlProtocol(node.discriminant, context)) {
			return;
		}

		const protocols = node.cases.map(({test}) => test && getNormalizedProtocol(test));
		for (const [index, switchCase] of node.cases.entries()) {
			if (!switchCase.test) {
				continue;
			}

			const problem = getProtocolProblem(switchCase.test, context);
			if (!problem) {
				continue;
			}

			// Normalizing a label must not introduce another case with the same protocol.
			if (protocols.some((protocol, otherIndex) => otherIndex !== index && protocol === problem.data.protocol)) {
				delete problem.fix;
			}

			yield problem;
		}
	});

	context.on('CallExpression', function * (node) {
		let array;
		if (isMethodCall(node, {methods: ['includes', 'indexOf', 'lastIndexOf'], minimumArguments: 1, maximumArguments: 2})) {
			array = unwrapTypeScriptExpression(node.callee.object);
		} else if (isMethodCall(node, {method: 'has', argumentsLength: 1})) {
			const receiver = unwrapTypeScriptExpression(node.callee.object);
			if (isNewExpression(receiver, {name: 'Set', argumentsLength: 1})) {
				array = unwrapTypeScriptExpression(receiver.arguments[0]);
			}
		}

		if (array?.type !== 'ArrayExpression' || !isUrlProtocol(node.arguments[0], context)) {
			return;
		}

		for (const element of array.elements) {
			if (!element) {
				continue;
			}

			const problem = getProtocolProblem(element, context);
			if (problem) {
				yield problem;
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow invalid protocol strings in comparisons with `URL#protocol`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
