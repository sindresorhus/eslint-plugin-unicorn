import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {isBooleanLiteral, isCallExpression} from './ast/index.js';
import {createLateEventHandlerTracker, getEnclosingFunction} from './shared/late-event-handler.js';
import {isTypeScriptExpressionWrapper, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-prevent-default-in-passive-listener/error';
const MESSAGE_ID_SUGGESTION = 'no-prevent-default-in-passive-listener/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: '`preventDefault()` has no effect in a passive event listener.',
	[MESSAGE_ID_SUGGESTION]: 'Change `passive` to `false` to allow event cancellation.',
};

const getPassiveLiteral = listener => {
	let listenerExpression = listener;
	while (isTypeScriptExpressionWrapper(listenerExpression.parent)) {
		listenerExpression = listenerExpression.parent;
	}

	const registration = listenerExpression.parent;
	if (
		!isCallExpression(registration, {argumentsLength: 3})
		|| registration.arguments[1] !== listenerExpression
	) {
		return;
	}

	const callee = unwrapTypeScriptExpression(registration.callee);
	const isAddEventListener = (callee.type === 'Identifier' && callee.name === 'addEventListener')
		|| (callee.type === 'MemberExpression' && getPropertyName(callee) === 'addEventListener');
	if (!isAddEventListener) {
		return;
	}

	const options = unwrapTypeScriptExpression(registration.arguments[2]);
	if (
		options.type !== 'ObjectExpression'
		|| options.properties.some(property => property.type !== 'Property' || property.computed)
	) {
		return;
	}

	const property = options.properties.findLast(property => getPropertyName(property) === 'passive');
	const value = unwrapTypeScriptExpression(property?.value);
	if (!isBooleanLiteral(value, true)) {
		return;
	}

	return value;
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const lateEventHandlerTracker = createLateEventHandlerTracker(context);

	context.onExit('CallExpression', node => {
		const callee = unwrapTypeScriptExpression(node.callee);
		if (callee.type !== 'MemberExpression' || getPropertyName(callee) !== 'preventDefault') {
			return;
		}

		const event = unwrapTypeScriptExpression(callee.object);
		if (event.type !== 'Identifier') {
			return;
		}

		const listener = getEnclosingFunction(node);
		if (
			!listener
			|| listener.generator
			|| listener.params[0]?.type !== 'Identifier'
		) {
			return;
		}

		const passiveLiteral = getPassiveLiteral(listener);
		if (!passiveLiteral) {
			return;
		}

		const variable = findVariable(sourceCode.getScope(event), event);
		if (
			!variable?.defs.some(definition => definition.type === 'Parameter' && definition.name === listener.params[0] && definition.node === listener)
			|| variable.references.some(reference => reference.isWrite())
			|| lateEventHandlerTracker.isFunctionSuspended(listener)
			|| lateEventHandlerTracker.isInsideSuspendingLoop(node, listener)
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			suggest: [{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixer => fixer.replaceText(passiveLiteral, 'false'),
			}],
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
			description: 'Disallow ineffective `preventDefault()` calls in passive event listeners.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
