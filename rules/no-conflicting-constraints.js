import {ident} from '@eslint/css-tree';
import {decodeHTMLAttribute} from 'entities';
import {getStaticValueForControlFlow, isHtmlRcdataNode} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const CSS_MESSAGE_ID = 'no-conflicting-constraints/css';
const HTML_MESSAGE_ID = 'no-conflicting-constraints/html';
const messages = {
	[CSS_MESSAGE_ID]: 'Conflicting constraints for `{{feature}}`: `{{lower}}` and `{{upper}}` cannot both be satisfied.',
	[HTML_MESSAGE_ID]: '`{{minimum}}` must not be greater than `{{maximum}}`.',
};

const mediaFeatureSyntaxes = new Map([
	['width', '<length>'],
	['height', '<length>'],
	['device-width', '<length>'],
	['device-height', '<length>'],
	['resolution', '<resolution>'],
	['color', '<integer>'],
	['color-index', '<integer>'],
	['monochrome', '<integer>'],
	['horizontal-viewport-segments', '<integer>'],
	['vertical-viewport-segments', '<integer>'],
]);
const containerFeatureSyntaxes = new Map([
	['width', '<length>'],
	['height', '<length>'],
	['inline-size', '<length>'],
	['block-size', '<length>'],
]);
const reverseComparison = {
	'<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=',
};
const textInputTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password']);
const htmlNumberPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+\-]?\d+)?$/iv;
const htmlLengthPattern = /^\d+$/v;
const normalizeCssIdentifier = value => ident.decode(value).toLowerCase();

function * getCssConstraints(node, sourceCode, featureSyntaxes) {
	let feature;
	let comparisons;
	if (node.type === 'Feature' && node.value) {
		const match = /^(?:(min|max)-)?(.+)$/sv.exec(normalizeCssIdentifier(node.name));
		feature = match[2];
		comparisons = [[node.value, {min: '>=', max: '<='}[match[1]] ?? '=']];
	} else if (node.type === 'FeatureRange') {
		if (node.left.type === 'Identifier' && !node.right) {
			feature = normalizeCssIdentifier(node.left.name);
			comparisons = [[node.middle, node.leftComparison]];
		} else if (node.middle.type === 'Identifier') {
			if (node.right && (!['<', '>'].includes(node.leftComparison[0]) || node.leftComparison[0] !== node.rightComparison[0])) {
				return;
			}

			feature = normalizeCssIdentifier(node.middle.name);
			comparisons = [[node.left, reverseComparison[node.leftComparison]]];
			if (node.right) {
				comparisons.push([node.right, node.rightComparison]);
			}
		} else {
			return;
		}
	} else {
		return;
	}

	const syntax = featureSyntaxes.get(feature);
	if (!syntax) {
		return;
	}

	for (const [valueNode, comparison] of comparisons) {
		if (!['Number', 'Dimension'].includes(valueNode.type) || !Object.hasOwn(reverseComparison, comparison)) {
			continue;
		}

		const value = Number(valueNode.value);
		const unit = valueNode.type === 'Dimension' ? normalizeCssIdentifier(valueNode.unit) : '';
		// Decoded units must not be reinterpreted as part of the numeric token.
		if (!Number.isFinite(value) || !/^[a-z]*$/v.test(unit) || sourceCode.lexer.match(syntax, valueNode.value + unit).error) {
			continue;
		}

		yield {
			feature, value, unit, comparison, inclusive: comparison.includes('='), node,
		};
	}
}

const isStrongerBound = (constraint, previous, isLower) =>
	!previous
	|| (isLower ? constraint.value > previous.value : constraint.value < previous.value)
	|| (constraint.value === previous.value && previous.inclusive && !constraint.inclusive);

const hasConflictingBounds = (lower, upper) => Boolean(lower && upper
	&& (lower.value > upper.value || (lower.value === upper.value && (!lower.inclusive || !upper.inclusive))));

function * getCssProblems(condition, context, featureSyntaxes) {
	const {sourceCode} = context;
	if (
		!condition
		|| condition.children.some(child => child.type === 'Condition' || (child.type === 'Identifier' && normalizeCssIdentifier(child.name) !== 'and'))
	) {
		return;
	}

	const groups = new Map();
	for (const child of condition.children) {
		for (const constraint of getCssConstraints(child, sourceCode, featureSyntaxes)) {
			const key = `${constraint.feature}:${constraint.unit}`;
			if (!groups.has(key)) {
				groups.set(key, {});
			}

			const group = groups.get(key);
			const bounds = constraint.comparison === '=' ? ['lower', 'upper'] : [constraint.comparison.startsWith('>') ? 'lower' : 'upper'];
			for (const bound of bounds) {
				if (isStrongerBound(constraint, group[bound], bound === 'lower')) {
					group[bound] = constraint;
				}
			}
		}
	}

	for (const {lower, upper} of groups.values()) {
		if (!hasConflictingBounds(lower, upper)) {
			continue;
		}

		yield {
			node: sourceCode.getRange(lower.node)[0] > sourceCode.getRange(upper.node)[0] ? lower.node : upper.node,
			messageId: CSS_MESSAGE_ID,
			data: {feature: lower.feature, lower: sourceCode.getText(lower.node), upper: sourceCode.getText(upper.node)},
		};
	}
}

function getHtmlAttributes(node, sourceCode) {
	const attributes = new Map();
	for (const attribute of node.attributes) {
		const name = attribute.key.value.toLowerCase();
		if (!['type', 'min', 'max', 'minlength', 'maxlength'].includes(name)) {
			continue;
		}

		if (attributes.has(name)) {
			attributes.set(name, undefined);
			continue;
		}

		const valueNode = attribute.value;
		let value = valueNode ? undefined : '';
		if (valueNode && valueNode.parts.length === 0) {
			// Read the complete unquoted token because the HTML parser can stop before its actual end.
			const raw = attribute.startWrapper ? valueNode.value : sourceCode.text.slice(sourceCode.getRange(valueNode)[0]).match(/^[^\t\n\f\r >]+/u)?.[0];
			if (raw !== undefined) {
				value = decodeHTMLAttribute(raw);
			}
		}

		attributes.set(name, {node: valueNode ?? attribute, value});
	}

	return attributes;
}

function getJsxAttributes(node, context) {
	const attributes = new Map();
	for (const attribute of node.attributes) {
		if (attribute.name.type !== 'JSXIdentifier' || !['type', 'min', 'max', 'minLength', 'maxLength'].includes(attribute.name.name)) {
			continue;
		}

		const {name} = attribute.name;
		if (attributes.has(name)) {
			attributes.set(name, undefined);
			continue;
		}

		let valueNode = attribute.value;
		let value;
		if (valueNode?.type === 'Literal') {
			value = valueNode.value;
		} else if (valueNode?.type === 'JSXExpressionContainer') {
			valueNode = valueNode.expression;
			value = getStaticValueForControlFlow(valueNode, context)?.value;
		}

		attributes.set(name, {node: valueNode ?? attribute, value});
	}

	return attributes;
}

function getHtmlNumber(value, isLength) {
	if (typeof value !== 'string' && typeof value !== 'number') {
		return;
	}

	if (!(isLength ? htmlLengthPattern : htmlNumberPattern).test(String(value))) {
		return;
	}

	const number = Number(value);
	if (Number.isFinite(number) && (!isLength || Number.isSafeInteger(number))) {
		return number;
	}
}

function getHtmlProblem(attributes, tagName, isJsx) {
	let isLength = true;
	if (tagName === 'input') {
		const typeAttribute = attributes.get('type');
		if (attributes.has('type') && typeof typeAttribute?.value !== 'string') {
			return;
		}

		const type = typeAttribute?.value.toLowerCase() || 'text';
		isLength = textInputTypes.has(type);
		if (!isLength && !['number', 'range'].includes(type)) {
			return;
		}
	}

	let minimumName = 'min';
	let maximumName = 'max';
	if (isLength) {
		minimumName = isJsx ? 'minLength' : 'minlength';
		maximumName = isJsx ? 'maxLength' : 'maxlength';
	}

	const minimum = getHtmlNumber(attributes.get(minimumName)?.value, isLength);
	const maximum = getHtmlNumber(attributes.get(maximumName)?.value, isLength);
	if (minimum === undefined || maximum === undefined || minimum <= maximum) {
		return;
	}

	return {
		node: attributes.get(maximumName).node,
		messageId: HTML_MESSAGE_ID,
		data: {minimum: minimumName, maximum: maximumName},
	};
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on('MediaQuery', node => {
		const atRule = context.sourceCode.getAncestors(node).findLast(ancestor => ancestor.type === 'Atrule');
		if (!atRule || !['media', 'import'].includes(normalizeCssIdentifier(atRule.name)) || node.modifier === 'not') {
			return;
		}

		return getCssProblems(node.condition, context, mediaFeatureSyntaxes);
	});
	context.on('Atrule', node => {
		if (normalizeCssIdentifier(node.name) !== 'container' || node.prelude?.type !== 'AtrulePrelude') {
			return;
		}

		const condition = node.prelude.children.find(child => child.type === 'Condition');
		if (!condition || condition.children.some(child => !['Identifier', 'Feature', 'FeatureRange'].includes(child.type))) {
			return;
		}

		return getCssProblems(condition, context, containerFeatureSyntaxes);
	});
	context.on('Tag', node => {
		const name = node.name.toLowerCase();
		if (
			!['input', 'textarea'].includes(name)
			|| isHtmlRcdataNode(node)
			|| context.sourceCode.getAncestors(node).some(ancestor => ancestor.type === 'Tag' && ancestor.name.toLowerCase() === 'iframe')
			|| node.attributes.some(attribute => attribute.type === 'Attribute' && attribute.key.parts.length > 0)
		) {
			return;
		}

		return getHtmlProblem(getHtmlAttributes(node, context.sourceCode), name, false);
	});
	context.on('JSXOpeningElement', node => {
		if (
			node.name.type !== 'JSXIdentifier'
			|| !['input', 'textarea'].includes(node.name.name)
			|| node.attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')
		) {
			return;
		}

		return getHtmlProblem(getJsxAttributes(node, context), node.name.name, true);
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow conflicting CSS query and HTML form constraints.',
			recommended: 'unopinionated',
		},
		schema: [],
		messages,
		languages: [
			'js/js',
			'css/css',
			'html/html',
		],
	},
};

export default config;
