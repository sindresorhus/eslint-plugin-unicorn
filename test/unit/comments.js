import test from 'node:test';
import {Linter} from 'eslint';
import {
	getCommentSafeProblem,
	getLastTrailingCommentOnSameLine,
	hasCommentInRange,
	hasNonDirectiveComment,
	isEslintDisableOrEnableDirective,
	wouldRemoveComments,
} from '../../rules/utils/index.js';

function inspectComments(code, inspect) {
	let result;
	const linter = new Linter();
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							Program(node) {
								result = inspect(context, node.body[0].expression);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
		linterOptions: {reportUnusedDisableDirectives: 'off'},
	});
	return result;
}

for (const [comment, isOrdinary] of [
	['', false],
	['/* Explanation. */', true],
	['// Explanation.\n', true],
	['/* eslint-disable */', false],
	['/* eslint-enable */', false],
	['// eslint-disable-next-line -- Explanation.\n', false],
	['/* eslint-disable-line -- Explanation. */', false],
	['/* eslint-disable */ /* Explanation. */', true],
	['/* eslint-env node */', true],
	['/* eslint-disableish */', true],
	['// eslint-disable\n', true],
	['// eslint-enable\n', true],
	['/* eslint-disable-line\n*/', true],
]) {
	test(`comment helpers distinguish directives: ${comment || 'no comments'}`, t => {
		inspectComments(`foo(${comment}value);`, (context, node) => {
			t.assert.strictEqual(hasNonDirectiveComment(context, node), isOrdinary);
			t.assert.strictEqual(hasNonDirectiveComment(context, context.sourceCode.getRange(node)), isOrdinary);
			t.assert.strictEqual(wouldRemoveComments(context, node), comment !== '');
			t.assert.strictEqual(hasCommentInRange(context, context.sourceCode.getRange(node)), comment !== '');

			const fix = () => {};
			const suggest = [{messageId: 'suggestion', fix}];
			const problem = {
				node, messageId: 'problem', data: {value: 1}, fix, suggest,
			};
			const safeProblem = getCommentSafeProblem(context, problem);
			if (comment === '') {
				t.assert.strictEqual(safeProblem, problem);
			} else {
				t.assert.deepStrictEqual(safeProblem, {node, messageId: 'problem', data: {value: 1}});
			}

			t.assert.strictEqual(problem.fix, fix);
			t.assert.strictEqual(problem.suggest, suggest);
		});
	});
}

test('comment helpers ignore comments outside the affected range', t => {
	const result = inspectComments('/* Before. */ foo(); /* After. */', (context, node) => ({
		ordinary: hasNonDirectiveComment(context, node),
		removed: wouldRemoveComments(context, node),
		inRange: hasCommentInRange(context, context.sourceCode.getRange(node)),
	}));
	t.assert.deepStrictEqual(result, {ordinary: false, removed: false, inRange: false});
});

test('range comment checks require the whole comment to be inside the range', t => {
	inspectComments('foo(/* Explanation. */ value);', (context, node) => {
		const [comment] = context.sourceCode.getCommentsInside(node);
		const [start, end] = context.sourceCode.getRange(comment);
		for (const [range, expected] of [
			[[start, end], true],
			[[start + 1, end], false],
			[[start, end - 1], false],
			[[start, start], false],
		]) {
			t.assert.strictEqual(hasCommentInRange(context, range), expected);
			t.assert.strictEqual(wouldRemoveComments(context, range), expected);
		}
	});
});

test('comment helpers retain fixes for comments in preserved nodes and ranges', t => {
	for (const comment of ['/* Explanation. */', '/* eslint-enable */']) {
		inspectComments(`foo(() => { ${comment} return value; });`, (context, node) => {
			const preservedNode = node.arguments[0];
			const fix = () => {};
			const problem = {node, messageId: 'problem', fix};
			for (const preserved of [preservedNode, context.sourceCode.getRange(preservedNode)]) {
				t.assert.strictEqual(hasNonDirectiveComment(context, node, [preserved]), false);
				t.assert.strictEqual(wouldRemoveComments(context, node, [preserved]), false);
				t.assert.strictEqual(getCommentSafeProblem(context, problem, node, [preserved]), problem);
			}
		});
	}
});

test('directive recognition also supports separately synthesized comment nodes', t => {
	inspectComments('foo(  /* eslint-disable */  value);', (context, node) => {
		const [comment] = context.sourceCode.getCommentsInside(node);
		t.assert.strictEqual(isEslintDisableOrEnableDirective(context, {...comment}), true);
		t.assert.strictEqual(isEslintDisableOrEnableDirective(context, {...comment, range: [comment.range[0] - 2, comment.range[1] + 2]}), true);
		t.assert.strictEqual(isEslintDisableOrEnableDirective(context, {...comment, range: [0, comment.range[1]]}), false);
		t.assert.strictEqual(isEslintDisableOrEnableDirective(context, {...comment, range: [0, 1]}), false);
	});
});

test('trailing comment lookup can ignore directives while retaining ordinary comments', t => {
	inspectComments('foo(); /* Explanation. */ /* eslint-enable */\n/* Later. */', (context, node) => {
		const lastComment = getLastTrailingCommentOnSameLine(context, node.parent);
		t.assert.strictEqual(isEslintDisableOrEnableDirective(context, lastComment), true);
		const ordinaryComment = getLastTrailingCommentOnSameLine(context, node.parent, {ignoreDirectives: true});
		t.assert.strictEqual(ordinaryComment.value.trim(), 'Explanation.');
	});
	inspectComments('foo(); /* eslint-enable */', (context, node) => {
		t.assert.strictEqual(getLastTrailingCommentOnSameLine(context, node.parent, {ignoreDirectives: true}), undefined);
	});
});
