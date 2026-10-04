import {isMethodCall} from './ast/index.js';
import {
	getConstVariableInitializer,
	isGlobalIdentifier,
	isKnownNonArray,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-array-fill-with-reference-type';
const messages = {
	[MESSAGE_ID]: 'Do not use a reference value as the fill value.',
};

function isRegExpConstruction(node, context) {
	return node.type === 'NewExpression'
		&& node.callee.name === 'RegExp'
		&& isGlobalIdentifier(node.callee, context);
}

function isReferenceExpression(node, context) {
	node = unwrapTypeScriptExpression(node);

	if (!node) {
		return false;
	}

	if (
		[
			'ObjectExpression',
			'ArrayExpression',
			'ClassExpression',
		].includes(node.type)
	) {
		return true;
	}

	return node.type === 'NewExpression'
		&& !isRegExpConstruction(node, context);
}

function isReferenceFillValue(node, context) {
	if (isReferenceExpression(node, context)) {
		return true;
	}

	const initializer = getConstVariableInitializer(unwrapTypeScriptExpression(node), context);
	return isReferenceExpression(initializer, context);
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'fill',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [fillValue] = callExpression.arguments;
		if (!isReferenceFillValue(fillValue, context)) {
			return;
		}

		// Deliberately `isKnownNonArray`, not `isKnownNonIndexedCollection`: `TypedArray#fill()` coerces the value to a number, so every slot gets a copy and the shared reference this rule warns about cannot happen
		if (isKnownNonArray(callExpression.callee.object, context)) {
			return;
		}

		return {
			node: fillValue,
			messageId: MESSAGE_ID,
		};
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
			description: 'Disallow using reference values as `Array#fill()` values.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
