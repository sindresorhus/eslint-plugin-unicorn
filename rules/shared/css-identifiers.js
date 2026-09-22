import {ident, tokenize, tokenTypes} from '@eslint/css-tree';
import {toLocation} from '../utils/index.js';

const namedAtRulePattern = /^(?:(?:-(?:webkit|moz|o)-)?keyframes|container|custom-media|property)$/i;
const animationKeywords = new Set(['none', 'default', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'revert-rule']);
const containerKeywords = new Set(['and', 'or', 'not', ...animationKeywords]);
const isContainerShorthandName = (node, value) => {
	for (const child of value.children) {
		if (child === node) {
			return true;
		}

		if (child.type === 'Operator' && child.value === '/') {
			return false;
		}
	}

	return false;
};

const isNamedAtRuleName = (node, parent, grandparent) => parent?.type === 'AtrulePrelude'
	&& parent.children.at(0) === node
	&& grandparent?.type === 'Atrule'
	&& namedAtRulePattern.test(ident.decode(grandparent.name));
const isCustomPropertyReference = (node, parent) => node.type === 'Identifier'
	&& parent?.type === 'Function'
	&& ident.decode(parent.name).toLowerCase() === 'var'
	&& parent.children.at(0) === node;

/**
Visit user-defined CSS names. Built-in properties and value keywords are excluded; declarations and explicit name references are checked without resolving them across files.
*/
export default function onCssIdentifier(context, listener) {
	const {sourceCode} = context;
	const visit = (node, name, range = sourceCode.getRange(node), isDashedName = false) => listener({
		node,
		name,
		location: toLocation(range, context),
		isDashedName,
	});

	context.on(['ClassSelector', 'IdSelector'], node => visit(node, ident.decode(node.name)));

	context.on('Declaration', node => {
		const name = ident.decode(node.property);
		if (name.startsWith('--')) {
			const [start] = sourceCode.getRange(node);
			return visit(node, name, [start, start + node.property.length], true);
		}
	});

	context.on('Layer', function * (node) {
		const [offset] = sourceCode.getRange(node);
		const names = [];
		tokenize(node.name, (type, start, end) => {
			if (type === tokenTypes.Ident) {
				names.push({name: ident.decode(node.name.slice(start, end)), nameRange: [offset + start, offset + end]});
			}
		});

		for (const {name, nameRange} of names) {
			yield visit(node, name, nameRange);
		}
	});

	context.on('Feature', node => {
		const name = ident.decode(node.name);
		if (node.kind !== 'media' || node.value !== null || !name.startsWith('--')) {
			return;
		}

		const text = sourceCode.getText(node);
		const [offset] = sourceCode.getRange(node);
		let nameRange;
		tokenize(text, (type, start, end) => {
			if (!nameRange && type === tokenTypes.Ident && ident.decode(text.slice(start, end)) === name) {
				nameRange = [offset + start, offset + end];
			}
		});

		if (nameRange) {
			return visit(node, name, nameRange, true);
		}
	});

	context.on(['Identifier', 'String'], node => {
		const name = node.type === 'String' ? node.value : ident.decode(node.name);
		const parent = sourceCode.getParent(node);
		const grandparent = sourceCode.getParent(parent);
		const isAtRuleName = isNamedAtRuleName(node, parent, grandparent);
		const property = parent?.type === 'Value' && grandparent?.type === 'Declaration'
			? ident.decode(grandparent.property).toLowerCase()
			: undefined;
		const isContainerName = node.type === 'Identifier'
			&& (property === 'container-name' || (property === 'container' && isContainerShorthandName(node, parent)))
			&& !containerKeywords.has(name.toLowerCase());
		const isAnimationName = ['animation-name', '-webkit-animation-name'].includes(property)
			&& (node.type === 'String' || !animationKeywords.has(name.toLowerCase()));

		if (isAtRuleName || isContainerName || isAnimationName || (node.type === 'Identifier' && name.startsWith('--'))) {
			const isDashedName = isCustomPropertyReference(node, parent) || (isAtRuleName && ['property', 'custom-media'].includes(ident.decode(grandparent.name).toLowerCase()));
			return visit(node, name, sourceCode.getRange(node), isDashedName);
		}
	});

	// Custom property values are normally opaque Raw nodes, including references in var().
	context.on('Raw', function * (node) {
		const text = sourceCode.getText(node);
		const [offset] = sourceCode.getRange(node);
		const names = [];
		tokenize(text, (type, start, end) => {
			if (type !== tokenTypes.Ident) {
				return;
			}

			const name = ident.decode(text.slice(start, end));
			if (name.startsWith('--')) {
				names.push({name, nameRange: [offset + start, offset + end]});
			}
		});

		for (const {name, nameRange} of names) {
			yield visit(node, name, nameRange, true);
		}
	});
}
