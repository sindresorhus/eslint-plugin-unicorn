import {isMethodCall, isMemberExpression} from '../ast/index.js';
import {isSameReference, shouldSkipKnownNonArrayReceiver} from '../utils/index.js';
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
		return;
	}

	return `${object.type === 'Identifier' ? object.name : '…'}${isOptional ? '?.' : '.'}length`;
}

/**
Set `checkArrayReceiver` when the report only makes sense for a real array, so a receiver known to be something else is skipped. See `shouldSkipKnownNonArrayReceiver` for what that covers.

Leave it off for `slice`, since `String#slice()` takes the same arguments and is a valid target too. Set it for `splice`/`toSpliced`, where a receiver that is known not to be an array is some other type whose same-named method means something else.

@param {import('eslint').Rule.RuleContext} context
*/
function listen(context, {methods, messageId, checkArrayReceiver = false}) {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods,
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

		if (
			!description
			|| (checkArrayReceiver && shouldSkipKnownNonArrayReceiver(callExpression.callee.object, context))
		) {
			return;
		}

		const methodName = callExpression.callee.property.name;
		const messageData = {
			description,
		};

		if (methodName === 'splice') {
			messageData.argumentName = 'deleteCount';
		} else if (methodName === 'toSpliced') {
			messageData.argumentName = 'skipCount';
		}

		return {
			node: secondArgument,
			messageId,
			data: messageData,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			fix: fixer => removeArgument(fixer, secondArgument, context),
		};
	});
}

export {listen};
