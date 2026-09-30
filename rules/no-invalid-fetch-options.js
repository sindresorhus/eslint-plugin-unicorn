import {getPropertyName} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isNewExpression,
	isUndefined,
	isNullLiteral,
} from './ast/index.js';
import {getStaticValueForControlFlow, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-invalid-fetch-options';
const messages = {
	[MESSAGE_ID_ERROR]: '"body" is not allowed when method is "{{method}}".',
};

// `'method'`, `['method']` and `[`method`]` are the same property
const isObjectPropertyWithName = (node, name) =>
	node.type === 'Property'
	&& getPropertyName(node) === name;

function getFetchOptionsProblem(context, node) {
	// `as`, `satisfies` and `!` are erased at compile time, the object literal is what runs
	node = unwrapTypeScriptExpression(node);
	if (node.type !== 'ObjectExpression') {
		return;
	}

	const {properties} = node;

	const bodyProperty = properties.findLast(property => isObjectPropertyWithName(property, 'body'));

	if (!bodyProperty) {
		return;
	}

	const bodyValue = bodyProperty.value;
	// `void …` always evaluates to `undefined`, so the body is effectively absent.
	const isVoidExpression = bodyValue.type === 'UnaryExpression' && bodyValue.operator === 'void';
	if (isUndefined(bodyValue) || isNullLiteral(bodyValue) || isVoidExpression) {
		return;
	}

	// A later `method` overwrites an earlier one, so the last one is the effective method
	const methodIndex = properties.findLastIndex(property => isObjectPropertyWithName(property, 'method'));
	const methodProperty = properties[methodIndex];
	// A `SpreadElement` after `method` can replace it, so the method is not known. One before it cannot, a later own property wins.
	if (properties.some((node, index) => node.type === 'SpreadElement' && index > methodIndex)) {
		return;
	}

	if (!methodProperty) {
		return {
			node: bodyProperty.key,
			messageId: MESSAGE_ID_ERROR,
			data: {method: 'GET'},
		};
	}

	const methodValue = methodProperty.value;

	let method = getStaticValueForControlFlow(methodValue, context)?.value;

	if (typeof method !== 'string') {
		return;
	}

	method = method.toUpperCase();
	if (method !== 'GET' && method !== 'HEAD') {
		return;
	}

	return {
		node: bodyProperty.key,
		messageId: MESSAGE_ID_ERROR,
		data: {method},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isCallExpression(callExpression, {
			name: 'fetch',
			minimumArguments: 2,
			optional: false,
		})) {
			return;
		}

		return getFetchOptionsProblem(context, callExpression.arguments[1]);
	});

	context.on('NewExpression', newExpression => {
		if (!isNewExpression(newExpression, {
			name: 'Request',
			minimumArguments: 2,
		})) {
			return;
		}

		return getFetchOptionsProblem(context, newExpression.arguments[1]);
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
			description: 'Disallow invalid options in `fetch()` and `new Request()`.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
