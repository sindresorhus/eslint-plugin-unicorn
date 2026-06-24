import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {
	createLateEventHandlerTracker,
	eventParameterNamePattern,
	getEnclosingFunction,
} from './shared/late-event-handler.js';
import {
	isEvent,
	isKnownNonEvent,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID_AFTER_SUSPENSION = 'after-suspension';
const MESSAGE_ID_IN_GENERATOR = 'in-generator';
const MESSAGE_ID_IN_NESTED_FUNCTION = 'in-nested-function';
const eventControlMethodNames = [
	'preventDefault',
	'stopImmediatePropagation',
	'stopPropagation',
];
const messages = {
	[MESSAGE_ID_AFTER_SUSPENSION]: '`{{name}}.{{method}}()` has no effect after the handler suspends. Call it before `await` or `yield` while the event is still being dispatched.',
	[MESSAGE_ID_IN_GENERATOR]: '`{{name}}.{{method}}()` is not called during event dispatch inside a generator function. Use a normal function handler instead.',
	[MESSAGE_ID_IN_NESTED_FUNCTION]: '`{{name}}.{{method}}()` may run after synchronous event dispatch has finished. Call it in the outer handler before deferring work.',
};

const getEventControlCall = node => {
	if (!isMethodCall(node, {
		methods: eventControlMethodNames,
		computed: false,
	})) {
		return;
	}

	const {callee} = node;
	const event = unwrapTypeScriptExpression(callee.object);
	if (event.type !== 'Identifier') {
		return;
	}

	return {
		event,
		method: callee.property.name,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const lateEventHandlerTracker = createLateEventHandlerTracker(context);

	const isEventParameter = node => {
		if (isKnownNonEvent(node, context)) {
			return false;
		}

		return eventParameterNamePattern.test(node.name)
			|| isEvent(node, context);
	};

	context.onExit('CallExpression', node => {
		const eventControlCall = getEventControlCall(node);
		if (!eventControlCall) {
			return;
		}

		const {event, method} = eventControlCall;
		const variable = findVariable(sourceCode.getScope(event), event);
		const definition = variable?.defs.find(({type}) => type === 'Parameter');
		if (!definition) {
			return;
		}

		// For a parameter definition, `definition.node` is the function that declares it.
		const handlerFunction = definition.node;
		if (!isEventParameter(definition.name)) {
			return;
		}

		const isInNestedFunction = getEnclosingFunction(node) !== handlerFunction;
		const isInGeneratorHandler = handlerFunction.generator;
		if (
			!isInNestedFunction
			&& !isInGeneratorHandler
			&& !lateEventHandlerTracker.isFunctionSuspended(handlerFunction)
			&& !lateEventHandlerTracker.isInsideSuspendingLoop(node, handlerFunction)
		) {
			return;
		}

		let messageId = MESSAGE_ID_AFTER_SUSPENSION;
		if (isInNestedFunction) {
			messageId = MESSAGE_ID_IN_NESTED_FUNCTION;
		} else if (isInGeneratorHandler) {
			messageId = MESSAGE_ID_IN_GENERATOR;
		}

		return {
			node,
			messageId,
			data: {
				name: event.name,
				method,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow event-control method calls after the synchronous event dispatch has finished.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
