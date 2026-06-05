import {getStaticValue} from '@eslint-community/eslint-utils';
import {isNewExpression} from './ast/index.js';
import {isSameReference} from './utils/index.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-duplicate-set-values';
const messages = {
	[MESSAGE_ID]: 'Remove duplicate value `{{value}}` from the Set.',
};

const isComparableStaticValue = value =>
	value === null
	|| (
		typeof value !== 'object'
		&& typeof value !== 'function'
	);

const isSameValueZero = (left, right) =>
	left === right
	|| (
		typeof left === 'number'
		&& typeof right === 'number'
		&& Number.isNaN(left)
		&& Number.isNaN(right)
	);

const getComparableStaticElementValueResult = (element, sourceCode) => {
	if (!element) {
		return {value: undefined};
	}

	const result = getStaticValue(element, sourceCode.getScope(element));

	if (!result || !isComparableStaticValue(result.value)) {
		return;
	}

	return {value: result.value};
};

const isDuplicateValue = (leftElement, rightElement, sourceCode) => {
	const leftStaticValueResult = getComparableStaticElementValueResult(leftElement, sourceCode);
	const rightStaticValueResult = getComparableStaticElementValueResult(rightElement, sourceCode);

	if (
		leftStaticValueResult
		&& rightStaticValueResult
	) {
		return isSameValueZero(leftStaticValueResult.value, rightStaticValueResult.value);
	}

	if (
		!leftElement
		|| !rightElement
		|| leftElement.type === 'Literal'
		|| rightElement.type === 'Literal'
	) {
		return false;
	}

	return isSameReference(leftElement, rightElement);
};

const getDuplicateElements = (elements, sourceCode) => {
	const checkedElements = [];
	const duplicateElements = [];

	for (const element of elements) {
		if (element?.type === 'SpreadElement') {
			continue;
		}

		if (checkedElements.some(checkedElement => isDuplicateValue(checkedElement, element, sourceCode))) {
			duplicateElements.push(element);
		}

		checkedElements.push(element);
	}

	return duplicateElements;
};

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('NewExpression', (/** @type {ESTree.NewExpression} */ node) => {
		if (!isNewExpression(node, {
			name: 'Set',
			argumentsLength: 1,
		})) {
			return;
		}

		const [iterable] = node.arguments;

		if (iterable.type !== 'ArrayExpression') {
			return;
		}

		const duplicateElements = getDuplicateElements(iterable.elements, sourceCode);

		return duplicateElements.map(element => ({
			node: element ?? iterable,
			messageId: MESSAGE_ID,
			data: {
				value: element ? sourceCode.getText(element) : 'undefined',
			},
		}));
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow duplicate values in `Set` constructor array literals.',
			recommended: true,
		},
		messages,
	},
};

export default config;
