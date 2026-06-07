import {getStaticValue} from '@eslint-community/eslint-utils';
import isSameReference from './is-same-reference.js';

export const isComparableStaticValue = value =>
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

const getComparableStaticElementValueResult = (element, context) => {
	if (!element) {
		return {value: undefined};
	}

	const {sourceCode} = context;
	const result = getStaticValue(element, sourceCode.getScope(element));

	if (!result || !isComparableStaticValue(result.value)) {
		return;
	}

	return {value: result.value};
};

const isDuplicateValue = (leftElement, rightElement, context) => {
	const leftStaticValueResult = getComparableStaticElementValueResult(leftElement, context);
	const rightStaticValueResult = getComparableStaticElementValueResult(rightElement, context);

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

const getDuplicateArrayElements = (elements, context) => {
	const checkedElements = [];
	const duplicateElements = [];

	for (const element of elements) {
		if (element?.type === 'SpreadElement') {
			continue;
		}

		if (checkedElements.some(checkedElement => isDuplicateValue(checkedElement, element, context))) {
			duplicateElements.push(element);
		}

		checkedElements.push(element);
	}

	return duplicateElements;
};

export default getDuplicateArrayElements;
