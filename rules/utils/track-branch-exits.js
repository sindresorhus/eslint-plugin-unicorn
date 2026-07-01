/**
@import * as ESLint from 'eslint';
@import * as ESTree from 'estree';
*/

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
	const currentSegments = () => segmentSetStack.at(-1);
	const branchTerminalSegments = new WeakMap();
	const branchAlwaysExits = new WeakMap();
	const reachableIfStatements = new WeakSet();

	context.on('onCodePathStart', () => {
		segmentSetStack.push(new Set());
	});
	context.on('onCodePathEnd', () => {
		segmentSetStack.pop();
	});
	context.on('onCodePathSegmentStart', segment => {
		currentSegments().add(segment);
	});
	context.on('onCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});
	context.on('onUnreachableCodePathSegmentStart', segment => {
		currentSegments().add(segment);
	});
	context.on('onUnreachableCodePathSegmentEnd', segment => {
		currentSegments().delete(segment);
	});

	// Remember whether the `if` itself is reachable. In unreachable (dead) code every segment is
	// unreachable and the post-`if` merge point has no predecessors, which would otherwise make
	// every branch look like it always exits. We don't analyze dead code, so skip those.
	context.on('IfStatement', ifStatement => {
		if ([...currentSegments()].some(segment => segment.reachable)) {
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
