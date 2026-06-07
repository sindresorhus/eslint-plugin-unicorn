import {findVariable} from '@eslint-community/eslint-utils';
import {isMemberExpression, isFunction} from './ast/index.js';

const MESSAGE_ID_AFTER_AWAIT = 'after-await';
const MESSAGE_ID_IN_NESTED_FUNCTION = 'in-nested-function';
const eventParameterNamePattern = /^(?:e|event|evt|[a-z][\dA-Za-z]*Event)$/u;
const messages = {
	[MESSAGE_ID_AFTER_AWAIT]: '`{{name}}.currentTarget` is `null` after `await`. It is only set during synchronous event dispatch; save it to a variable beforehand.',
	[MESSAGE_ID_IN_NESTED_FUNCTION]: '`{{name}}.currentTarget` is `null` inside this nested function. It is only set during synchronous event dispatch; save it to a variable in the outer function.',
};

const getEnclosingFunction = node => {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunction(current)) {
			return current;
		}
	}
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	// Functions that have passed a suspension point (`await`/`for await…of`) at the current point of the traversal.
	const suspendedFunctions = new Set();

	// ESLint traverses in source order and fires `onExit` only after the whole subtree of the
	// suspension point is visited, so by the time a later access is reached it has “completed”.
	const markSuspended = node => {
		const functionNode = getEnclosingFunction(node);
		if (functionNode) {
			suspendedFunctions.add(functionNode);
		}
	};

	const hasSuspensionPoint = (node, functionNode) => {
		if (node.type === 'AwaitExpression') {
			return true;
		}

		if (node.type === 'ForOfStatement' && node.await) {
			return true;
		}

		if (node !== functionNode && isFunction(node)) {
			return false;
		}

		const keys = sourceCode.visitorKeys[node.type] ?? [];
		for (const key of keys) {
			const child = node[key];
			if (Array.isArray(child)) {
				for (const childNode of child) {
					if (childNode && hasSuspensionPoint(childNode, functionNode)) {
						return true;
					}
				}

				continue;
			}

			if (child && hasSuspensionPoint(child, functionNode)) {
				return true;
			}
		}

		return false;
	};

	const isRepeatedLoopPart = (loop, child) => {
		switch (loop.type) {
			case 'ForStatement': {
				return [
					loop.test,
					loop.update,
					loop.body,
				].includes(child);
			}

			case 'ForInStatement':
			case 'ForOfStatement': {
				return child !== loop.right;
			}

			case 'DoWhileStatement':
			case 'WhileStatement': {
				return true;
			}

			default: {
				return false;
			}
		}
	};

	const isInsideSuspendingLoop = (node, functionNode) => {
		for (let child = node, current = node.parent; current && current !== functionNode; child = current, current = current.parent) {
			if (
				isRepeatedLoopPart(current, child)
				&& hasSuspensionPoint(current, functionNode)
			) {
				return true;
			}
		}

		return false;
	};

	context.onExit('AwaitExpression', markSuspended);
	context.onExit('ForOfStatement', node => {
		if (node.await) {
			markSuspended(node);
		}
	});

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
			&& !suspendedFunctions.has(handlerFunction)
			&& !isInsideSuspendingLoop(node, handlerFunction)
		) {
			return;
		}

		return {
			node,
			messageId: isInNestedFunction ? MESSAGE_ID_IN_NESTED_FUNCTION : MESSAGE_ID_AFTER_AWAIT,
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
	},
};

export default config;
