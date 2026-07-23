import {isFunction} from '../ast/index.js';
import {isProcessExitCallAlwaysEvaluated} from './is-branch-exit.js';

/**
@import * as ESLint from 'eslint';
@import * as ESTree from 'estree';
*/

const isInTryBlockWithFinallyAsLastStatement = node => {
	let child = node;
	let {parent} = node;
	while (parent) {
		if (isFunction(parent)) {
			return false;
		}

		if (parent.type === 'TryStatement' && parent.finalizer && parent.block === child) {
			const lastStatement = parent.block.body.at(-1);
			return parent.block.body.length === 1
				&& lastStatement?.type === 'ExpressionStatement'
				&& lastStatement.expression === node;
		}

		child = parent;
		({parent} = parent);
	}

	return false;
};

/**
Track whether each `if` branch always exits, using ESLint's code path analysis.

A branch “always exits” when control never falls through from it to the code after the `if`
statement, i.e. every path through it ends in `return`, `throw`, `break`, `continue`, an
exhaustive `switch`, an infinite loop, and so on. This is detected by checking whether any of
the branch's terminal code path segments flows into the merge point after the `if` statement,
which correctly handles control flow that a structural AST walk would miss.

The returned predicate must only be queried after the branch's `IfStatement` has exited. Use `isExitBranch` to add simple branch exits that ESLint code path analysis cannot model. The extra check is still ignored for unreachable `if` statements.

@param {ESLint.Rule.RuleContext} context
@param {(branch: ESTree.Node) => boolean} [isExitBranch]
@returns {(branch: ESTree.Node | null | undefined) => boolean}
*/
export default function trackBranchExits(context, isExitBranch) {
	// One set of active segments per code path, so nested functions don't pollute the enclosing path.
	const segmentSetStack = [];
	const terminatedSegmentSetStack = [];
	const currentSegments = () => segmentSetStack.at(-1);
	const currentTerminatedSegments = () => terminatedSegmentSetStack.at(-1);
	const branchTerminalSegments = new WeakMap();
	const branchAlwaysExits = new WeakMap();
	const reachableIfStatements = new WeakSet();

	context.on('onCodePathStart', () => {
		segmentSetStack.push(new Set());
		terminatedSegmentSetStack.push(new WeakSet());
	});
	context.on('onCodePathEnd', () => {
		segmentSetStack.pop();
		terminatedSegmentSetStack.pop();
	});
	const startSegment = segment => {
		currentSegments().add(segment);
		if (
			segment.prevSegments.length > 0
			&& segment.prevSegments.every(previous => !previous.reachable || currentTerminatedSegments().has(previous))
		) {
			currentTerminatedSegments().add(segment);
		}
	};

	context.on('onCodePathSegmentStart', startSegment);
	context.on('onCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});
	context.on('onUnreachableCodePathSegmentStart', startSegment);
	context.on('onUnreachableCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});

	context.onExit('CallExpression', node => {
		if (isInTryBlockWithFinallyAsLastStatement(node) || !isProcessExitCallAlwaysEvaluated(node, context)) {
			return;
		}

		for (const segment of currentSegments()) {
			if (segment.reachable) {
				currentTerminatedSegments().add(segment);
			}
		}
	});

	// Remember whether the `if` itself is reachable. In unreachable (dead) code every segment is
	// unreachable and the post-`if` merge point has no predecessors, which would otherwise make
	// every branch look like it always exits. We don't analyze dead code, so skip those.
	context.on('IfStatement', ifStatement => {
		if ([...currentSegments()].some(segment => segment.reachable && !currentTerminatedSegments().has(segment))) {
			reachableIfStatements.add(ifStatement);
		}
	});

	// Snapshot each branch's terminal segments before the next branch or the code after the `if` starts.
	context.onExit(['IfStatement > .consequent', 'IfStatement > .alternate'], branch => {
		branchTerminalSegments.set(branch, new Set(currentSegments()));
	});

	context.onExit('IfStatement', ifStatement => {
		const postIfSegments = currentSegments();
		for (const branch of [ifStatement.consequent, ifStatement.alternate]) {
			if (!branch) {
				continue;
			}

			const terminalSegments = branchTerminalSegments.get(branch);
			const exitsByCodePath = terminalSegments
				&& [...postIfSegments].every(segment =>
					segment.prevSegments.every(previous => !terminalSegments.has(previous)),
				);
			const exits = exitsByCodePath || isExitBranch?.(branch);
			branchAlwaysExits.set(branch, reachableIfStatements.has(ifStatement) && Boolean(exits));
		}
	});

	return branch => Boolean(branch && branchAlwaysExits.get(branch));
}
