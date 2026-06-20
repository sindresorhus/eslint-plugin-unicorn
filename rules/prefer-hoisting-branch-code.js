import {hasSideEffect} from '@eslint-community/eslint-utils';
import {
	getIndentString,
	hasCommentInRange,
	hasDirectBlockScopedDeclaration,
	needsSemicolon,
} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_START = 'prefer-hoisting-branch-code/start';
const MESSAGE_ID_END = 'prefer-hoisting-branch-code/end';
const MESSAGE_ID_SUGGESTION = 'prefer-hoisting-branch-code/suggestion';
const messages = {
	[MESSAGE_ID_START]: 'These branches start with the same code. Move it before the `if` statement.',
	[MESSAGE_ID_END]: 'These branches end with the same code. Move it after the `if` statement.',
	[MESSAGE_ID_SUGGESTION]: 'Move the shared code out of the branches.',
};

const resourceDeclarationKinds = new Set([
	'await using',
	'using',
]);

const isElseIfStatement = node =>
	node.parent.type === 'IfStatement'
	&& node.parent.alternate === node;

// `hasSideEffect` does not treat a tagged template as a call, so check for one separately.
function containsTaggedTemplate(node, sourceCode) {
	if (node.type === 'TaggedTemplateExpression') {
		return true;
	}

	const keys = sourceCode.visitorKeys[node.type] ?? [];
	for (const key of keys) {
		const child = node[key];
		if (Array.isArray(child)) {
			for (const childNode of child) {
				if (childNode && containsTaggedTemplate(childNode, sourceCode)) {
					return true;
				}
			}

			continue;
		}

		if (child && containsTaggedTemplate(child, sourceCode)) {
			return true;
		}
	}

	return false;
}

const hasSideEffectOrTaggedTemplate = (node, sourceCode) =>
	hasSideEffect(node, sourceCode)
	|| containsTaggedTemplate(node, sourceCode);

// Tokens of a statement, ignoring a trailing semicolon so ASI differences don't matter.
const getStatementTokens = (node, sourceCode) => {
	const tokens = sourceCode.getTokens(node);
	const lastToken = tokens.at(-1);

	if (lastToken?.type === 'Punctuator' && lastToken.value === ';') {
		return tokens.slice(0, -1);
	}

	return tokens;
};

const isSameStatement = (left, right, sourceCode) => {
	const leftTokens = getStatementTokens(left, sourceCode);
	const rightTokens = getStatementTokens(right, sourceCode);

	if (leftTokens.length === 0 || leftTokens.length !== rightTokens.length) {
		return false;
	}

	return leftTokens.every((token, index) =>
		token.type === rightTokens[index].type
		&& token.value === rightTokens[index].value,
	);
};

/**
Collect every branch body of a complete `if`/`else if`/`else` chain.

@param {ESTree.IfStatement} ifStatement
@returns {ESTree.BlockStatement[] | undefined} The branch blocks, or `undefined` if the chain has no final `else`.
*/
function getBranchBlocks(ifStatement) {
	const blocks = [];
	let node = ifStatement;

	for (; node?.type === 'IfStatement'; node = node.alternate) {
		blocks.push(node.consequent);
	}

	// After the loop `node` is the trailing `else` body, or `undefined` for an incomplete chain.
	if (!node) {
		return;
	}

	blocks.push(node);
	return blocks;
}

function canMoveBeforeConditions(ifStatement, sourceCode) {
	for (let node = ifStatement; node?.type === 'IfStatement'; node = node.alternate) {
		if (hasSideEffectOrTaggedTemplate(node.test, sourceCode)) {
			return false;
		}
	}

	return true;
}

const canAutofixLeadingStatement = (statement, sourceCode) =>
	statement.type === 'ExpressionStatement'
	// We intentionally do not special-case inline `"use strict"` directives; branch-local directives are too rare to justify more fixer state.
	&& !hasSideEffectOrTaggedTemplate(statement, sourceCode);

function isInStatementList(ifStatement) {
	const {parent} = ifStatement;

	return ['Program', 'BlockStatement', 'StaticBlock', 'SwitchCase'].includes(parent.type);
}

// Count of consecutive identical statements shared by all branches, at the start and at the end.
function getSharedCounts(bodies, sourceCode) {
	const minLength = Math.min(...bodies.map(body => body.length));

	let leading = 0;
	while (
		leading < minLength
		&& bodies.every(body => isSameStatement(body[leading], bodies[0][leading], sourceCode))
	) {
		leading++;
	}

	let trailing = 0;
	while (
		leading + trailing < minLength
		&& bodies.every(body => isSameStatement(body.at(-1 - trailing), bodies[0].at(-1 - trailing), sourceCode))
	) {
		trailing++;
	}

	return {leading, trailing, minLength};
}

const hasCommentBefore = (node, context) => {
	const {sourceCode} = context;
	const [nodeStart] = sourceCode.getRange(node);
	const tokenBefore = sourceCode.getTokenBefore(node);
	const gapStart = tokenBefore ? sourceCode.getRange(tokenBefore)[1] : 0;
	return hasCommentInRange(context, [gapStart, nodeStart]);
};

const hasSameLineCommentAfter = (node, context) => {
	const {sourceCode} = context;
	const comment = sourceCode.getCommentsAfter(node)[0];
	return Boolean(
		comment
		&& sourceCode.getLoc(comment).start.line === sourceCode.getLoc(node).end.line,
	);
};

// A comment in a removed range, or before a leading shared statement, would be dropped or detached by
// the fix. The branch text we re-insert is the moved statements only, not surrounding comments or gaps.
function hasCommentHazard(ifStatement, blocks, options, context) {
	if (
		(options.isStart && hasCommentBefore(ifStatement, context))
		|| (!options.isStart && hasSameLineCommentAfter(ifStatement, context))
	) {
		return true;
	}

	return blocks.some(block => {
		const {sourceCode} = context;
		const [blockStart] = sourceCode.getRange(block);
		const [firstStatementStart] = sourceCode.getRange(block.body[0]);

		if (options.isStart && hasCommentInRange(context, [blockStart + 1, firstStatementStart])) {
			return true;
		}

		if (!options.isStart) {
			const [, lastStatementEnd] = sourceCode.getRange(block.body.at(-1));
			const [, blockEnd] = sourceCode.getRange(block);
			if (hasCommentInRange(context, [lastStatementEnd, blockEnd - 1])) {
				return true;
			}
		}

		return hasCommentInRange(context, getRemovalRange(block, options, context));
	});
}

// A trailing statement cannot safely cross a branch-local lexical declaration it references, or a resource declaration whose disposal boundary would move before the tail.
function hasTailBranchLocalHazard(block, trailing, context) {
	const {sourceCode} = context;
	const {body} = block;
	const [tailStart] = sourceCode.getRange(body[body.length - trailing]);
	const [blockStart, blockEnd] = sourceCode.getRange(block);
	const scope = sourceCode.getScope(block);

	for (const variable of scope.variables) {
		const [definition] = variable.defs;

		if (
			!definition
			// `var` is function-scoped, so it stays in scope when moved out of the block.
			|| (definition.parent?.type === 'VariableDeclaration' && definition.parent.kind === 'var')
		) {
			continue;
		}

		const [definitionStart] = sourceCode.getRange(definition.name);

		// Only declarations made inside this branch, before the shared tail, are a hazard.
		if (definitionStart <= blockStart || definitionStart >= tailStart) {
			continue;
		}

		if (
			definition.parent?.type === 'VariableDeclaration'
			&& resourceDeclarationKinds.has(definition.parent.kind)
		) {
			return true;
		}

		for (const reference of variable.references) {
			const [referenceStart] = sourceCode.getRange(reference.identifier);
			if (referenceStart >= tailStart && referenceStart <= blockEnd) {
				return true;
			}
		}
	}

	return false;
}

// Re-indent statement text from the branch body's indentation to the `if` statement's indentation.
function getHoistedText(statements, ifIndent, context) {
	const {sourceCode} = context;
	const [start] = sourceCode.getRange(statements[0]);
	const [, end] = sourceCode.getRange(statements.at(-1));
	const text = sourceCode.text.slice(start, end);
	const branchIndent = getIndentString(statements[0], context);

	if (branchIndent === ifIndent) {
		return text;
	}

	return text
		.split('\n')
		.map((line, index) => {
			if (index === 0) {
				return line;
			}

			return line.startsWith(branchIndent) ? `${ifIndent}${line.slice(branchIndent.length)}` : line;
		})
		.join('\n');
}

// Range of a branch's shared statements to remove, consuming the gap up to the retained code so no
// blank line is left behind. Every branch keeps middle code (`leading + trailing < minLength`), so the
// leading and trailing removals never overlap.
function getRemovalRange(block, {leading, trailing, isStart}, context) {
	const {sourceCode} = context;
	const {body} = block;

	if (isStart) {
		const [start] = sourceCode.getRange(body[0]);
		const [end] = sourceCode.getRange(body[leading]);
		return [start, end];
	}

	const [, start] = sourceCode.getRange(body[body.length - trailing - 1]);
	const [, end] = sourceCode.getRange(body.at(-1));
	return [start, end];
}

function createHoistFix({ifStatement, blocks, leading, trailing, isStart}, context) {
	const {sourceCode} = context;
	const ifIndent = getIndentString(ifStatement, context);
	const count = isStart ? leading : trailing;
	const firstBody = blocks[0].body;
	const movedStatements = isStart ? firstBody.slice(0, count) : firstBody.slice(firstBody.length - count);
	const hoistedText = getHoistedText(movedStatements, ifIndent, context);

	return function * (fixer) {
		if (isStart) {
			const tokenBefore = sourceCode.getTokenBefore(ifStatement);
			const semicolon = tokenBefore && needsSemicolon(tokenBefore, context, hoistedText) ? ';' : '';
			yield fixer.insertTextBefore(ifStatement, `${semicolon}${hoistedText}\n${ifIndent}`);
		} else {
			// The hoisted code now sits before whatever followed the `if`, so guard against it merging with
			// the next token (for example `foo` followed by `(bar)()` becoming `foo(bar)()`).
			const lastToken = sourceCode.getLastToken(movedStatements.at(-1));
			const tokenAfter = sourceCode.getTokenAfter(ifStatement);
			const semicolon = tokenAfter && needsSemicolon(lastToken, context, tokenAfter.value) ? ';' : '';
			yield fixer.insertTextAfter(ifStatement, `\n${ifIndent}${hoistedText}${semicolon}`);
		}

		for (const block of blocks) {
			yield fixer.removeRange(getRemovalRange(block, {leading, trailing, isStart}, context));
		}
	};
}

function getDirectionProblem({ifStatement, blocks, leading, trailing, isStart}, context) {
	const {sourceCode} = context;
	const firstBody = blocks[0].body;
	const reportedStatements = isStart ? firstBody.slice(0, leading) : firstBody.slice(firstBody.length - trailing);

	const valid = reportedStatements.every(statement => !hasDirectBlockScopedDeclaration(statement))
		&& isInStatementList(ifStatement)
		&& !hasCommentHazard(ifStatement, blocks, {leading, trailing, isStart}, context)
		&& (isStart || blocks.every(block => !hasTailBranchLocalHazard(block, trailing, context)));

	const problem = {
		loc: {
			start: sourceCode.getLoc(reportedStatements[0]).start,
			end: sourceCode.getLoc(reportedStatements.at(-1)).end,
		},
		messageId: isStart ? MESSAGE_ID_START : MESSAGE_ID_END,
	};

	if (valid) {
		const fix = createHoistFix({
			ifStatement, blocks, leading, trailing, isStart,
		}, context);

		// Trailing code already runs after the branch body, so moving it after the `if` is always behavior-preserving. Leading code moves before the conditions are evaluated, so it is only safe to auto-fix for side-effect-free expression statements after side-effect-free conditions; otherwise it is offered as a suggestion.
		if (
			!isStart
			|| (
				canMoveBeforeConditions(ifStatement, sourceCode)
				&& reportedStatements.every(statement => canAutofixLeadingStatement(statement, sourceCode))
			)
		) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, fix}];
		}
	}

	return problem;
}

/**
@param {ESTree.IfStatement} ifStatement
@param {ESLint.Rule.RuleContext} context
@returns {Generator<ESLint.Rule.ReportDescriptor>}
*/
function * getProblems(ifStatement, context) {
	if (isElseIfStatement(ifStatement)) {
		return;
	}

	const blocks = getBranchBlocks(ifStatement);

	if (!blocks || blocks.some(block => block.type !== 'BlockStatement')) {
		return;
	}

	const {sourceCode} = context;
	const bodies = blocks.map(block => block.body);
	const {leading, trailing, minLength} = getSharedCounts(bodies, sourceCode);

	if (leading === 0 && trailing === 0) {
		return;
	}

	// Require every branch to keep at least one distinct statement. Otherwise hoisting would empty a
	// branch (leaving `if (a) {}`), and fully-identical branches are already `no-duplicate-if-branches`.
	if (leading + trailing >= minLength) {
		return;
	}

	if (leading > 0) {
		yield getDirectionProblem({
			ifStatement, blocks, leading, trailing, isStart: true,
		}, context);
	}

	if (trailing > 0) {
		yield getDirectionProblem({
			ifStatement, blocks, leading, trailing, isStart: false,
		}, context);
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('IfStatement', ifStatement => getProblems(ifStatement, context));
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer moving code shared by all branches of an `if` statement out of the branches.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
