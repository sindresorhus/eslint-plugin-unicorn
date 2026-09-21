import {generate, ident} from '@eslint/css-tree';
import {getComments} from './utils/index.js';

const MESSAGE_ID = 'no-redundant-shorthand-values';
const messages = {
	[MESSAGE_ID]: 'Simplify this shorthand value to `{{replacement}}`.',
};

const fourSideProperties = new Set([
	'border-color',
	'border-style',
	'border-width',
	'inset',
	'margin',
	'padding',
	'scroll-margin',
	'scroll-padding',
]);

const twoSideProperties = new Set([
	'border-block-color',
	'border-block-style',
	'border-block-width',
	'border-inline-color',
	'border-inline-style',
	'border-inline-width',
	'gap',
	'grid-gap',
	'inset-block',
	'inset-inline',
	'margin-block',
	'margin-inline',
	'overflow',
	'overscroll-behavior',
	'padding-block',
	'padding-inline',
	'scroll-margin-block',
	'scroll-margin-inline',
	'scroll-padding-block',
	'scroll-padding-inline',
]);

const placeProperties = new Set([
	'place-content',
	'place-items',
	'place-self',
]);

const normalizeCssIdentifier = identifier => ident.decode(identifier).toLowerCase();
const getVendorPrefix = property => property.match(/^-\w+-/u)?.[0] ?? '';

const hasVariableFunction = node => {
	if (node.type === 'Function' && normalizeCssIdentifier(node.name) === 'var') {
		return true;
	}

	return node.children?.some(child => hasVariableFunction(child)) ?? false;
};

const getValueKey = node => {
	switch (node.type) {
		case 'Dimension': {
			return `${node.type}:${node.value}${normalizeCssIdentifier(node.unit)}`;
		}

		case 'Hash': {
			return `${node.type}:${node.value.toLowerCase()}`;
		}

		case 'Identifier': {
			return `${node.type}:${normalizeCssIdentifier(node.name)}`;
		}

		default: {
			return `${node.type}:${generate(node)}`;
		}
	}
};

const areEqualValues = (first, second) => getValueKey(first) === getValueKey(second);
const getValuesText = (values, sourceCode) => values.map(node => sourceCode.getText(node)).join(' ');

const getCondensedValueCount = (values, preserveFourValueEdges) => {
	const [first, second, third, fourth] = values;

	if (values.length === 2 && areEqualValues(first, second)) {
		return 1;
	}

	if (values.length === 3 && areEqualValues(first, third)) {
		return areEqualValues(first, second) ? 1 : 2;
	}

	if (values.length !== 4) {
		return values.length;
	}

	if (
		areEqualValues(first, second)
		&& areEqualValues(first, third)
		&& areEqualValues(first, fourth)
	) {
		return 1;
	}

	if (
		areEqualValues(first, third)
		&& areEqualValues(second, fourth)
	) {
		return 2;
	}

	if (!preserveFourValueEdges && areEqualValues(second, fourth)) {
		return 3;
	}

	return 4;
};

const getRepeatedPlaceValueCount = values => {
	if (values.length % 2 !== 0) {
		return values.length;
	}

	const halfLength = values.length / 2;
	for (let index = 0; index < halfLength; index++) {
		if (!areEqualValues(values[index], values[index + halfLength])) {
			return values.length;
		}
	}

	return halfLength;
};

const getReduction = (values, condensedValueCount, sourceCode) => {
	if (condensedValueCount === values.length) {
		return;
	}

	const retainedValues = values.slice(0, condensedValueCount);
	return {
		replacement: getValuesText(retainedValues, sourceCode),
		removeRange: [
			sourceCode.getRange(values[condensedValueCount - 1])[1],
			sourceCode.getRange(values.at(-1))[1],
		],
	};
};

const getSimpleReduction = (values, preserveFourValueEdges, sourceCode) => {
	if (
		values.length < 2
		|| values.length > 4
		|| values.some(node => node.type === 'Operator')
	) {
		return;
	}

	return getReduction(values, getCondensedValueCount(values, preserveFourValueEdges), sourceCode);
};

const getBorderRadiusResult = (values, sourceCode) => {
	const slashIndexes = values
		.map((node, index) => node.type === 'Operator' && node.value === '/' ? index : -1)
		.filter(index => index !== -1);

	if (slashIndexes.length === 0) {
		const reduction = getSimpleReduction(values, false, sourceCode);
		return reduction && {
			reductions: [reduction],
			replacement: reduction.replacement,
		};
	}

	if (
		slashIndexes.length !== 1
		|| values.some(node => node.type === 'Operator' && node.value !== '/')
	) {
		return;
	}

	const slashIndex = slashIndexes[0];
	const horizontalValues = values.slice(0, slashIndex);
	const verticalValues = values.slice(slashIndex + 1);
	const horizontalReduction = getSimpleReduction(horizontalValues, false, sourceCode);
	const verticalReduction = getSimpleReduction(verticalValues, false, sourceCode);
	const reductions = [horizontalReduction, verticalReduction].filter(Boolean);
	if (reductions.length === 0) {
		return;
	}

	const horizontalReplacement = horizontalReduction?.replacement ?? getValuesText(horizontalValues, sourceCode);
	const verticalReplacement = verticalReduction?.replacement ?? getValuesText(verticalValues, sourceCode);
	return {
		reductions,
		replacement: `${horizontalReplacement} / ${verticalReplacement}`,
	};
};

const getPlaceReduction = (values, sourceCode) => {
	if (values.length < 2 || values.some(node => node.type === 'Operator')) {
		return;
	}

	return getReduction(values, getRepeatedPlaceValueCount(values), sourceCode);
};

const hasCommentInRange = (comments, range, sourceCode) => comments.some(comment => {
	const [commentStart, commentEnd] = sourceCode.getRange(comment);
	return commentStart >= range[0] && commentEnd <= range[1];
});

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const comments = getComments(context);

	context.on('Declaration', declaration => {
		const {value} = declaration;
		if (value.type !== 'Value') {
			return;
		}

		const normalizedProperty = normalizeCssIdentifier(declaration.property);
		const vendorPrefix = getVendorPrefix(normalizedProperty);
		const property = normalizedProperty.slice(vendorPrefix.length);
		if (
			!fourSideProperties.has(property)
			&& !twoSideProperties.has(property)
			&& property !== 'border-radius'
			&& !placeProperties.has(property)
		) {
			return;
		}

		if (
			hasVariableFunction(value)
			|| !sourceCode.lexer.matchProperty(property, value).matched
		) {
			return;
		}

		const values = value.children;
		let result;
		if (property === 'border-radius') {
			result = getBorderRadiusResult(values, sourceCode);
		} else {
			const reduction = placeProperties.has(property)
				? getPlaceReduction(values, sourceCode)
				: getSimpleReduction(values, fourSideProperties.has(property), sourceCode);
			result = reduction && {
				reductions: [reduction],
				replacement: reduction.replacement,
			};
		}

		if (!result) {
			return;
		}

		const {reductions, replacement} = result;
		return {
			node: value,
			messageId: MESSAGE_ID,
			data: {replacement},
			* fix(fixer, {abort}) {
				if (reductions.some(({removeRange}) => hasCommentInRange(comments, removeRange, sourceCode))) {
					return abort();
				}

				for (const {removeRange} of reductions) {
					yield fixer.removeRange(removeRange);
				}
			},
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow redundant values in CSS shorthand properties.',
			recommended: false,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
