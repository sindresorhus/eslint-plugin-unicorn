import test from 'ava';
import {Linter} from 'eslint';
import {
	getCommentSafeProblem,
	getLastTrailingCommentOnSameLine,
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
			t.is(hasNonDirectiveComment(context, node), isOrdinary);
			t.is(hasNonDirectiveComment(context, context.sourceCode.getRange(node)), isOrdinary);
			t.is(wouldRemoveComments(context, node), comment !== '');

			const fix = () => {};
			const suggest = [{messageId: 'suggestion', fix}];
			const problem = {
				node, messageId: 'problem', data: {value: 1}, fix, suggest,
			};
			const safeProblem = getCommentSafeProblem(context, problem);
			if (comment === '') {
				t.is(safeProblem, problem);
			} else {
				t.deepEqual(safeProblem, {node, messageId: 'problem', data: {value: 1}});
			}

			t.is(problem.fix, fix);
			t.is(problem.suggest, suggest);
		});
	});
}

test('comment helpers ignore comments outside the affected range', t => {
	const result = inspectComments('/* Before. */ foo(); /* After. */', (context, node) => ({
		ordinary: hasNonDirectiveComment(context, node),
		removed: wouldRemoveComments(context, node),
	}));
	t.deepEqual(result, {ordinary: false, removed: false});
});

test('comment helpers retain fixes for comments in preserved nodes and ranges', t => {
	for (const comment of ['/* Explanation. */', '/* eslint-enable */']) {
		inspectComments(`foo(() => { ${comment} return value; });`, (context, node) => {
			const preservedNode = node.arguments[0];
			const fix = () => {};
			const problem = {node, messageId: 'problem', fix};
			for (const preserved of [preservedNode, context.sourceCode.getRange(preservedNode)]) {
				t.false(hasNonDirectiveComment(context, node, [preserved]));
				t.false(wouldRemoveComments(context, node, [preserved]));
				t.is(getCommentSafeProblem(context, problem, node, [preserved]), problem);
			}
		});
	}
});

test('directive recognition also supports separately synthesized comment nodes', t => {
	inspectComments('foo(  /* eslint-disable */  value);', (context, node) => {
		const [comment] = context.sourceCode.getCommentsInside(node);
		t.true(isEslintDisableOrEnableDirective(context, {...comment}));
		t.true(isEslintDisableOrEnableDirective(context, {...comment, range: [comment.range[0] - 2, comment.range[1] + 2]}));
		t.false(isEslintDisableOrEnableDirective(context, {...comment, range: [0, comment.range[1]]}));
		t.false(isEslintDisableOrEnableDirective(context, {...comment, range: [0, 1]}));
	});
});

test('trailing comment lookup can ignore directives while retaining ordinary comments', t => {
	inspectComments('foo(); /* Explanation. */ /* eslint-enable */\n/* Later. */', (context, node) => {
		const lastComment = getLastTrailingCommentOnSameLine(context, node.parent);
		t.true(isEslintDisableOrEnableDirective(context, lastComment));
		const ordinaryComment = getLastTrailingCommentOnSameLine(context, node.parent, {ignoreDirectives: true});
		t.is(ordinaryComment.value.trim(), 'Explanation.');
	});
	inspectComments('foo(); /* eslint-enable */', (context, node) => {
		t.is(getLastTrailingCommentOnSameLine(context, node.parent, {ignoreDirectives: true}), undefined);
	});
});
