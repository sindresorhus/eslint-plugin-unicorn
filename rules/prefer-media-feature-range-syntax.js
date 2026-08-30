import {ident} from '@eslint/css-tree';
import {getComments} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_ERROR = 'prefer-media-feature-range-syntax/error';
const MESSAGE_ID_SUGGESTION = 'prefer-media-feature-range-syntax/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `{{replacement}}` over `{{value}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{value}}` with `{{replacement}}`.',
};

const rangeFeatureNames = new Set([
	'aspect-ratio',
	'color',
	'color-index',
	'device-aspect-ratio',
	'device-height',
	'device-width',
	'height',
	'horizontal-viewport-segments',
	'monochrome',
	'resolution',
	'vertical-viewport-segments',
	'width',
]);

const normalizeIdentifier = identifier => ident.decode(identifier).toLowerCase();

const getBound = node => {
	if (node.type !== 'Feature' || node.kind !== 'media' || !node.value) {
		return;
	}

	const name = normalizeIdentifier(node.name);
	const match = /^(min|max)-(.+)$/v.exec(name);
	if (!match || !rangeFeatureNames.has(match[2])) {
		return;
	}

	return {
		kind: match[1],
		featureName: match[2],
	};
};

const isInMediaRule = (node, sourceCode) => {
	let currentNode = node;

	while (currentNode) {
		if (currentNode.type === 'Atrule') {
			return normalizeIdentifier(currentNode.name) === 'media';
		}

		currentNode = sourceCode.getParent(currentNode);
	}

	return false;
};

const hasCommentInRange = (comments, sourceCode, [start, end]) => comments.some(comment => {
	const [commentStart, commentEnd] = sourceCode.getRange(comment);
	return commentStart >= start && commentEnd <= end;
});

const getValueText = (node, sourceCode) => sourceCode.getText(node.value);

const getSingleReplacement = (node, bound, sourceCode) => `(${bound.featureName} ${bound.kind === 'min' ? '>=' : '<='} ${getValueText(node, sourceCode)})`;

const getCleanExclusiveMaximum = node => {
	if (
		node.value.type !== 'Dimension'
		|| normalizeIdentifier(node.value.unit) !== 'px'
	) {
		return;
	}

	const value = Number(node.value.value);
	if (!Number.isSafeInteger(value) || value < 0) {
		return;
	}

	return `${value + 1}px`;
};

const getPairReplacement = (firstNode, secondNode, sourceCode) => {
	const firstBound = getBound(firstNode);
	const secondBound = getBound(secondNode);
	if (
		!firstBound
		|| !secondBound
		|| firstBound.kind === secondBound.kind
		|| firstBound.featureName !== secondBound.featureName
	) {
		return;
	}

	const minimumNode = firstBound.kind === 'min' ? firstNode : secondNode;
	const maximumNode = firstBound.kind === 'max' ? firstNode : secondNode;
	const cleanMaximum = getCleanExclusiveMaximum(maximumNode);
	const maximum = cleanMaximum ?? getValueText(maximumNode, sourceCode);

	return `(${getValueText(minimumNode, sourceCode)} <= ${firstBound.featureName} ${cleanMaximum ? '<' : '<='} ${maximum})`;
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const comments = getComments(context);
	const pairedFeatures = new WeakSet();

	context.on('Condition', node => {
		if (node.kind !== 'media' || !isInMediaRule(node, sourceCode)) {
			return;
		}

		const problems = [];
		for (let index = 0; index < node.children.length - 2; index++) {
			const firstNode = node.children[index];
			const operator = node.children[index + 1];
			const secondNode = node.children[index + 2];
			if (
				pairedFeatures.has(firstNode)
				|| pairedFeatures.has(secondNode)
				|| operator.type !== 'Identifier'
				|| normalizeIdentifier(operator.name) !== 'and'
			) {
				continue;
			}

			const replacement = getPairReplacement(firstNode, secondNode, sourceCode);
			if (!replacement) {
				continue;
			}

			const range = [
				sourceCode.getRange(firstNode)[0],
				sourceCode.getRange(secondNode)[1],
			];
			const firstRange = sourceCode.getRange(firstNode);
			const secondRange = sourceCode.getRange(secondNode);
			const hasCommentsInsideFeatures = hasCommentInRange(comments, sourceCode, firstRange) || hasCommentInRange(comments, sourceCode, secondRange);
			if (
				!hasCommentsInsideFeatures
				&& hasCommentInRange(comments, sourceCode, range)
			) {
				continue;
			}

			pairedFeatures.add(firstNode);
			pairedFeatures.add(secondNode);
			const value = sourceCode.text.slice(...range);
			problems.push({
				node: firstNode,
				messageId: MESSAGE_ID_ERROR,
				data: {value, replacement},
				suggest: hasCommentsInsideFeatures
					? undefined
					: [
						{
							messageId: MESSAGE_ID_SUGGESTION,
							data: {value, replacement},
							/**
							@param {ESLint.Rule.RuleFixer} fixer
							*/
							fix: fixer => fixer.replaceTextRange(range, replacement),
						},
					],
			});
		}

		return problems;
	});

	context.on('Feature', node => {
		const bound = getBound(node);
		if (
			!bound
			|| pairedFeatures.has(node)
			|| !isInMediaRule(node, sourceCode)
		) {
			return;
		}

		const value = sourceCode.getText(node);
		const replacement = getSingleReplacement(node, bound, sourceCode);
		const hasComments = hasCommentInRange(comments, sourceCode, sourceCode.getRange(node));

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {value, replacement},
			fix: hasComments
				? undefined
				: fixer => fixer.replaceText(node, replacement),
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer modern media feature range syntax.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
