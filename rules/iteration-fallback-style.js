import {hasSideEffect} from '@eslint-community/eslint-utils';
import indentString from 'indent-string';
import stripIndent from 'strip-indent';
import {
	isEmptyArrayExpression,
	isEmptyObjectExpression,
	isMethodCall,
	isNullLiteral,
} from './ast/index.js';
import {
	getIndentString,
	hasMultilineToken,
	isSameReference,
	isTypeScriptExpressionWrapper,
} from './utils/index.js';
import {containsOptionalChain, isReference, unwrapExpression} from './utils/comparison.js';

const MESSAGE_ID_GUARD = 'preferGuard';
const MESSAGE_ID_FALLBACK = 'preferFallback';
const STYLE_GUARD = 'guard';
const STYLE_FALLBACK = 'fallback';

const messages = {
	[MESSAGE_ID_GUARD]: 'Prefer an `if` guard over the empty {{type}} fallback.',
	[MESSAGE_ID_FALLBACK]: 'Prefer an empty {{type}} fallback over the `if` guard.',
};

const objectMethods = ['keys', 'values', 'entries'];

const getObjectMethodCall = node => {
	if (node.type === 'ForInStatement') {
		return;
	}

	const right = unwrapExpression(node.right);

	if (!isMethodCall(right, {
		object: 'Object',
		methods: objectMethods,
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})) {
		return;
	}

	return right;
};

const getLoopSourceNode = node =>
	getObjectMethodCall(node)?.arguments[0] ?? node.right;

const getLoopSource = node => unwrapExpression(getLoopSourceNode(node));

const isObjectIteration = node =>
	node.type === 'ForInStatement' || Boolean(getObjectMethodCall(node));

const getFallbackInfo = (node, isFallback) => {
	const logicalExpression = unwrapExpression(node);

	if (
		logicalExpression.type !== 'LogicalExpression'
		|| (logicalExpression.operator !== '??' && logicalExpression.operator !== '||')
	) {
		return;
	}

	const fallback = unwrapExpression(logicalExpression.right);
	if (!isFallback(fallback)) {
		return;
	}

	return {
		logicalExpression,
		fallback,
		source: logicalExpression.left,
		operator: logicalExpression.operator,
	};
};

const getLoopFallbackInfo = node =>
	getFallbackInfo(
		getLoopSourceNode(node),
		isObjectIteration(node) ? isEmptyObjectExpression : isEmptyArrayExpression,
	);

const getGuardedLoop = node => {
	if (node.alternate) {
		return;
	}

	const {consequent} = node;
	if (consequent.type === 'BlockStatement') {
		if (consequent.body.length !== 1) {
			return;
		}

		return consequent.body[0];
	}

	return consequent;
};

const getGuardInfo = node => {
	const loop = getGuardedLoop(node);
	if (!loop || (loop.type !== 'ForInStatement' && loop.type !== 'ForOfStatement')) {
		return;
	}

	let test = unwrapExpression(node.test);
	let operator = '||';

	if (!isReference(test)) {
		if (test.type !== 'BinaryExpression' || test.operator !== '!=') {
			return;
		}

		const isLeftNull = isNullLiteral(test.left);
		const source = isLeftNull ? test.right : test.left;
		const otherSide = isLeftNull ? test.left : test.right;
		if (!isNullLiteral(otherSide) || !isReference(source)) {
			return;
		}

		test = source;
		operator = '??';
	}

	const source = getLoopSource(loop);
	if (
		containsOptionalChain(test)
		|| containsOptionalChain(source)
		|| !isReference(source)
		|| !isSameReference(test, source)
	) {
		return;
	}

	return {
		loop,
		source,
		sourceNode: getLoopSourceNode(loop),
		operator,
	};
};

const canFixForOf = (node, fallbackInfo, context) => {
	const {sourceCode} = context;
	const {logicalExpression, source} = fallbackInfo;

	if (node.await) {
		return false;
	}

	return !(
		sourceCode.getCommentsInside(logicalExpression).length > 0
		|| hasMultilineToken(node, context)
		// Removing a TypeScript wrapper from the fallback can change type checking.
		|| isTypeScriptExpressionWrapper(logicalExpression.right)
		|| !isReference(source)
		|| hasSideEffect(source, sourceCode)
		|| node.parent.type === 'LabeledStatement'
		|| node.parent.type === 'IfStatement'
	);
};

const canFixFallback = (node, guardInfo, context) => {
	const {sourceCode} = context;
	const {source} = guardInfo;
	const {start: startLocation} = sourceCode.getLoc(node);

	return !(
		sourceCode.getCommentsInside(node).length > 0
		|| hasMultilineToken(node, context)
		|| !isReference(source)
		|| source !== guardInfo.sourceNode
		|| hasSideEffect(source, sourceCode)
		|| guardInfo.loop.await
		|| node.parent.type === 'LabeledStatement'
		|| getIndentString(node, context).length !== startLocation.column
	);
};

const getForOfFix = (node, fallbackInfo, context) => fixer => {
	const {sourceCode} = context;
	const {logicalExpression, source, operator} = fallbackInfo;

	const [nodeStart] = sourceCode.getRange(node);
	const [logicalStart, logicalEnd] = sourceCode.getRange(logicalExpression);
	const loopText = sourceCode.getText(node);
	const sourceText = sourceCode.getText(source);
	const loopWithoutFallback = [
		loopText.slice(0, logicalStart - nodeStart),
		sourceText,
		loopText.slice(logicalEnd - nodeStart),
	].join('');
	const indent = getIndentString(node, context);
	const normalizedLoop = stripIndent(`${indent}${loopWithoutFallback}`);
	const condition = operator === '??' ? `(${sourceText}) != null` : sourceText;

	return fixer.replaceText(
		node,
		`if (${condition}) {\n${indentString(normalizedLoop, 1, {indent: `${indent}\t`})}\n${indent}}`,
	);
};

const getUnindentedText = (text, sourceIndent, targetIndent) => {
	const [firstLine, ...remainingLines] = stripIndent(`${sourceIndent}${text}`).split('\n');

	return [
		firstLine,
		...remainingLines.map(line => line === '' ? line : `${targetIndent}${line}`),
	].join('\n');
};

const getFallbackFix = (node, guardInfo, context) => fixer => {
	const {sourceCode} = context;
	const {loop, sourceNode, operator} = guardInfo;
	const [loopStart] = sourceCode.getRange(loop);
	const [sourceStart, sourceEnd] = sourceCode.getRange(sourceNode);
	const loopText = sourceCode.getText(loop);
	const sourceText = sourceCode.getText(sourceNode);
	const fallbackText = isObjectIteration(loop) ? '{}' : '[]';
	const loopWithFallback = [
		loopText.slice(0, sourceStart - loopStart),
		`${sourceText} ${operator} ${fallbackText}`,
		loopText.slice(sourceEnd - loopStart),
	].join('');
	const indent = getIndentString(node, context);

	return fixer.replaceText(node, getUnindentedText(loopWithFallback, getIndentString(loop, context), indent));
};

const getFallbackProblem = (node, context) => {
	const fallbackInfo = getLoopFallbackInfo(node);
	if (!fallbackInfo) {
		return;
	}

	const {fallback} = fallbackInfo;
	const type = fallback.type === 'ArrayExpression' ? 'array' : 'object';
	const problem = {
		node: fallback,
		messageId: MESSAGE_ID_GUARD,
		data: {type},
	};

	if (node.type === 'ForOfStatement' && canFixForOf(node, fallbackInfo, context)) {
		problem.fix = getForOfFix(node, fallbackInfo, context);
	}

	return problem;
};

const getGuardProblem = (node, context) => {
	const guardInfo = getGuardInfo(node);
	if (!guardInfo) {
		return;
	}

	const type = isObjectIteration(guardInfo.loop) ? 'object' : 'array';
	const problem = {
		node: node.test,
		messageId: MESSAGE_ID_FALLBACK,
		data: {type},
	};

	if (guardInfo.loop.type === 'ForOfStatement' && canFixFallback(node, guardInfo, context)) {
		problem.fix = getFallbackFix(node, guardInfo, context);
	}

	return problem;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	if (context.options[0] === STYLE_FALLBACK) {
		context.on('IfStatement', node => getGuardProblem(node, context));
		return;
	}

	context.on(['ForInStatement', 'ForOfStatement'], node => getFallbackProblem(node, context));
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a consistent style for optional loop sources.',
			recommended: false,
		},
		fixable: 'code',
		schema: [
			{
				enum: [STYLE_GUARD, STYLE_FALLBACK],
				description: 'The preferred style for optional loop sources.',
			},
		],
		defaultOptions: [STYLE_GUARD],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
