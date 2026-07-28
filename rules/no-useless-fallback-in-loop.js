import {hasSideEffect} from '@eslint-community/eslint-utils';
import indentString from 'indent-string';
import stripIndent from 'strip-indent';
import {
	isEmptyArrayExpression,
	isEmptyObjectExpression,
	isMethodCall,
} from './ast/index.js';
import {getIndentString} from './utils/index.js';
import {isReference, unwrapExpression} from './utils/comparison.js';

const MESSAGE_ID = 'no-useless-fallback-in-loop';
const messages = {
	[MESSAGE_ID]: 'The empty {{type}} fallback is unnecessary.',
};

const objectMethods = ['keys', 'values', 'entries'];

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

const hasMultilineLiteral = (node, sourceCode) => sourceCode.getTokens(node).some(token =>
	(token.type === 'String' || token.type === 'Template')
	&& sourceCode.getText(token).includes('\n'),
);

const getLoopFallbackInfo = node => {
	if (node.type === 'ForInStatement') {
		return getFallbackInfo(node.right, isEmptyObjectExpression);
	}

	const right = unwrapExpression(node.right);
	const directFallback = getFallbackInfo(node.right, isEmptyArrayExpression);
	if (directFallback) {
		return directFallback;
	}

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

	return getFallbackInfo(right.arguments[0], isEmptyObjectExpression);
};

const canFixForOf = (node, fallbackInfo, context) => {
	const {sourceCode} = context;
	const {logicalExpression, source} = fallbackInfo;

	if (node.await) {
		return false;
	}

	return !(
		sourceCode.getCommentsInside(logicalExpression).length > 0
		|| hasMultilineLiteral(node, sourceCode)
		|| !isReference(source)
		|| hasSideEffect(source, sourceCode)
		|| node.parent.type === 'LabeledStatement'
		|| node.parent.type === 'IfStatement'
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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on(['ForInStatement', 'ForOfStatement'], node => {
		const fallbackInfo = getLoopFallbackInfo(node);
		if (!fallbackInfo) {
			return;
		}

		const {fallback} = fallbackInfo;
		const type = fallback.type === 'ArrayExpression' ? 'array' : 'object';
		const problem = {
			node: fallback,
			messageId: MESSAGE_ID,
			data: {type},
		};

		if (node.type === 'ForOfStatement' && canFixForOf(node, fallbackInfo, context)) {
			problem.fix = getForOfFix(node, fallbackInfo, context);
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty fallbacks in `for…of`, `for await…of`, and `for…in` loops.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
