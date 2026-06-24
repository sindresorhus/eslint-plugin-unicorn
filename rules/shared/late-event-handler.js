import {isFunction} from '../ast/index.js';
import {containsSuspensionPoint} from '../utils/index.js';

const eventParameterNamePattern = /^(?:e|event|evt|[a-z][\dA-Za-z]*Event)$/u;

const getEnclosingFunction = node => {
	for (let current = node.parent; current; current = current.parent) {
		if (isFunction(current)) {
			return current;
		}
	}
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

const createLateEventHandlerTracker = context => {
	const {sourceCode} = context;
	// Functions that have passed a suspension point (`await`/`for await...of`/`yield`) at the current point of the traversal.
	const suspendedFunctions = new Set();

	// Suspension visitors run on exit, so later accesses see previous suspension points.
	const markSuspended = node => {
		const functionNode = getEnclosingFunction(node);
		if (functionNode) {
			suspendedFunctions.add(functionNode);
		}
	};

	context.onExit('AwaitExpression', markSuspended);
	context.onExit('YieldExpression', markSuspended);
	context.onExit('ForOfStatement', node => {
		if (node.await) {
			markSuspended(node);
		}
	});

	return {
		isFunctionSuspended: functionNode => suspendedFunctions.has(functionNode),
		isInsideSuspendingLoop(node, functionNode) {
			for (let child = node, current = node.parent; current && current !== functionNode; child = current, current = current.parent) {
				if (
					isRepeatedLoopPart(current, child)
					&& containsSuspensionPoint(current, sourceCode.visitorKeys)
				) {
					return true;
				}
			}

			return false;
		},
	};
};

export {
	createLateEventHandlerTracker,
	eventParameterNamePattern,
	getEnclosingFunction,
};
