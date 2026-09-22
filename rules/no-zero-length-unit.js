import {ident} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-zero-length-unit';
const messages = {
	[MESSAGE_ID]: 'Remove the unit from this zero length.',
};

const zeroPattern = /^[+\-]?(?:0+(?:\.0+)?|\.0+)(?:e[+\-]?\d+)?$/iv;
const mathFunctions = new Set([
	'abs',
	'acos',
	'asin',
	'atan',
	'atan2',
	'calc',
	'calc-mix',
	'calc-size',
	'clamp',
	'container-progress',
	'cos',
	'exp',
	'hypot',
	'log',
	'max',
	'media-progress',
	'min',
	'mod',
	'pow',
	'progress',
	'random',
	'rem',
	'round',
	'sign',
	'sin',
	'sqrt',
	'tan',
]);
const excludedProperties = new Set([
	'border-image',
	'border-image-outset',
	'border-image-width',
	'columns',
	'flex',
	'font',
	'initial-value',
	'line-height',
	'mask-border',
	'mask-border-outset',
	'mask-border-width',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-width',
	'tab-size',
]);
const mediaLengthFeatures = new Set(['width', 'height', 'device-width', 'device-height']);
const containerLengthFeatures = new Set(['width', 'height', 'inline-size', 'block-size']);

const isExcludedContext = ancestors => ancestors.some(ancestor => {
	if (ancestor.type === 'Function') {
		const name = ident.decode(ancestor.name).toLowerCase();
		return name.startsWith('-') || mathFunctions.has(name);
	}

	if (ancestor.type === 'Declaration') {
		const name = ident.decode(ancestor.property).toLowerCase();
		return name.startsWith('-') || excludedProperties.has(name);
	}

	return false;
});

const isSupportedContext = (node, ancestors, sourceCode) => {
	const declaration = ancestors.findLast(ancestor => ancestor.type === 'Declaration');
	if (declaration) {
		return Boolean(
			sourceCode.lexer.matchDeclaration(declaration).matched
			|| (sourceCode.getParent(node) === declaration.value && sourceCode.lexer.matchProperty(ident.decode(declaration.property), node).matched),
		);
	}

	const feature = ancestors.findLast(ancestor => ancestor.type === 'Feature' || ancestor.type === 'FeatureRange');
	if (!feature) {
		return false;
	}

	const identifier = feature.type === 'Feature' ? feature.name : [feature.left, feature.middle, feature.right].find(part => part?.type === 'Identifier')?.name;
	const name = ident.decode(identifier ?? '').toLowerCase().replace(/^(?:min|max)-/v, '');
	return (feature.kind === 'media' && mediaLengthFeatures.has(name)) || (feature.kind === 'container' && containerLengthFeatures.has(name));
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.on('Dimension', node => {
		if (
			!zeroPattern.test(node.value)
			|| !sourceCode.lexer.matchType('length', node).matched
		) {
			return;
		}

		const ancestors = sourceCode.getAncestors(node);
		if (isExcludedContext(ancestors) || !isSupportedContext(node, ancestors, sourceCode)) {
			return;
		}

		const [start, end] = sourceCode.getRange(node);
		const unitRange = [start + node.value.length, end];
		return {
			node,
			loc: toLocation(unitRange, context),
			messageId: MESSAGE_ID,
			fix: fixer => fixer.removeRange(unitRange),
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
			description: 'Disallow units on zero CSS lengths.',
			recommended: 'unopinionated',
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
