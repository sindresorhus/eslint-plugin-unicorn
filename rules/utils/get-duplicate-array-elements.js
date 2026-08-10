import isSameReference from './is-same-reference.js';
import getStaticValueIfNoSideEffects from './get-static-value.js';

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

const undefinedStaticValueResult = {value: undefined};

const getComparableStaticElementValueResult = (element, context) => {
	if (!element) {
		return undefinedStaticValueResult;
	}

	const result = getStaticValueIfNoSideEffects(element, context);

	if (!result || !isComparableStaticValue(result.value)) {
		return;
	}

	return {value: result.value};
};

const isDuplicateValue = (leftElementData, rightElementData) => {
	const {element: leftElement, staticValueResult: leftStaticValueResult} = leftElementData;
	const {element: rightElement, staticValueResult: rightStaticValueResult} = rightElementData;

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
	const checkedElementData = [];
	const duplicateElements = [];

	for (const element of elements) {
		if (element?.type === 'SpreadElement') {
			continue;
		}

		const elementData = {
			element,
			staticValueResult: getComparableStaticElementValueResult(element, context),
		};
		if (checkedElementData.some(checkedData => isDuplicateValue(checkedData, elementData))) {
			duplicateElements.push(element);
		}

		checkedElementData.push(elementData);
	}

	return duplicateElements;
};

export default getDuplicateArrayElements;
