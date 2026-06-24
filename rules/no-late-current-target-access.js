import {findVariable} from '@eslint-community/eslint-utils';
import {isMemberExpression} from './ast/index.js';
import {
	createLateEventHandlerTracker,
	eventParameterNamePattern,
	getEnclosingFunction,
} from './shared/late-event-handler.js';

const MESSAGE_ID_AFTER_SUSPENSION = 'after-suspension';
const MESSAGE_ID_IN_NESTED_FUNCTION = 'in-nested-function';
const messages = {
	[MESSAGE_ID_AFTER_SUSPENSION]: '`{{name}}.currentTarget` is `null` after the handler suspends. It is only set during synchronous event dispatch; save it to a variable beforehand.',
	[MESSAGE_ID_IN_NESTED_FUNCTION]: '`{{name}}.currentTarget` is `null` inside this nested function. It is only set during synchronous event dispatch; save it to a variable in the outer function.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const lateEventHandlerTracker = createLateEventHandlerTracker(context);

	context.on('MemberExpression', node => {
		if (
			node.object.type !== 'Identifier'
			|| !isMemberExpression(node, {property: 'currentTarget'})
		) {
			return;
		}

		if (!eventParameterNamePattern.test(node.object.name)) {
			return;
		}

		const variable = findVariable(sourceCode.getScope(node.object), node.object);
		const definition = variable?.defs.find(({type}) => type === 'Parameter');
		if (!definition) {
			return;
		}

		// For a parameter definition, `definition.node` is the function that declares it.
		const handlerFunction = definition.node;
		const isInNestedFunction = getEnclosingFunction(node) !== handlerFunction;

		if (
			!isInNestedFunction
			&& !lateEventHandlerTracker.isFunctionSuspended(handlerFunction)
			&& !lateEventHandlerTracker.isInsideSuspendingLoop(node, handlerFunction)
		) {
			return;
		}

		return {
			node,
			messageId: isInNestedFunction ? MESSAGE_ID_IN_NESTED_FUNCTION : MESSAGE_ID_AFTER_SUSPENSION,
			data: {name: node.object.name},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow accessing `event.currentTarget` after the synchronous event dispatch has finished.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
