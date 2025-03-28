import {isMethodCall, isMemberExpression} from '../ast/index.js';
import {isSameReference} from '../utils/index.js';
import {removeArgument} from '../fix/index.js';

function getObjectLengthOrInfinityDescription(node, object) {
	// `Infinity`
	if (node.type === 'Identifier' && node.name === 'Infinity') {
		return 'Infinity';
	}

	// `Number.POSITIVE_INFINITY`
	if (isMemberExpression(node, {
		object: 'Number',
		property: 'POSITIVE_INFINITY',
		computed: false,
		optional: false,
	})) {
		return 'Number.POSITIVE_INFINITY';
	}

	// `object?.length`
	const isOptional = node.type === 'ChainExpression';
	if (isOptional) {
		node = node.expression;
	}

	// `object.length`
	if (!(
		isMemberExpression(node, {property: 'length', computed: false})
		&& isSameReference(object, node.object)
	)) {
		return false;
	}

	return `${object.type === 'Identifier' ? object.name : '…'}${isOptional ? '?.' : '.'}length`
}

/** @param {import('eslint').Rule.RuleContext} context */
function listen(context, {method, messageId}) {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method,
			argumentsLength: 2,
			optionalCall: false,
		})) {
			return;
		}

		const secondArgument = callExpression.arguments[1];
		const description = getObjectLengthOrInfinityDescription(
			secondArgument,
			callExpression.callee.object,
		);

		if (!description) {
			return;
		}

		return {
			node: secondArgument,
			messageId,
			data: {
				description,
			},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => removeArgument(fixer, secondArgument, context.sourceCode),
		};
	});
}

export {listen};
