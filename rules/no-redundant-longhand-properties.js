import {getComments} from './utils/index.js';
import {getVendorPrefix, shorthandProperties, shorthandToAffectedProperties} from './shared/css-shorthand-properties.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'no-redundant-longhand-properties';
const messages = {
	[MESSAGE_ID]: 'Use the `{{shorthand}}` shorthand instead of its longhand properties.',
};

const cssWideKeywords = new Set(['initial', 'inherit', 'unset', 'revert', 'revert-layer', 'revert-rule']);
const substitutionFunctions = new Set(['attr', 'env', 'first-valid', 'ident', 'if', 'inherit', 'random-item', 'var']);
const slashShorthands = new Set(['grid-area', 'grid-column', 'grid-row']);
const pairShorthands = new Set(['gap', 'inset-block', 'inset-inline', 'margin-block', 'margin-inline', 'overflow', 'overscroll-behavior', 'padding-block', 'padding-inline', 'scroll-margin-block', 'scroll-margin-inline', 'scroll-padding-block', 'scroll-padding-inline']);
const fourSideShorthands = new Set(['border-color', 'border-style', 'border-width', 'inset', 'margin', 'padding', 'scroll-margin', 'scroll-padding']);
const additionalResetProperties = new Map([
	['animation', ['animation-composition', 'animation-range-start', 'animation-range-end', 'animation-trigger']],
	['background', ['background-blend-mode']],
	['columns', ['column-wrap']],
	['mask', ['mask-border']],
]);
const additionalAffectedProperties = new Map([
	['animation-range', ['animation-range-start', 'animation-range-end']],
	['background-position', ['background-position-x', 'background-position-y']],
	['column-gap', ['grid-column-gap']],
	['font-stretch', ['font-width']],
	['font-width', ['font-stretch']],
	['grid-column-gap', ['column-gap']],
	['grid-row-gap', ['row-gap']],
	['mask-border', ['mask-border-source', 'mask-border-slice', 'mask-border-width', 'mask-border-outset', 'mask-border-repeat', 'mask-border-mode']],
	['row-gap', ['grid-row-gap']],
]);

const getValue = (declaration, sourceCode) => sourceCode.getText(declaration.value).trim();

const getCssWideKeyword = declaration => {
	const children = [...declaration.value.children];
	if (children.length !== 1 || children[0].type !== 'Identifier') {
		return;
	}

	const keyword = children[0].name.toLowerCase();
	return cssWideKeywords.has(keyword) ? keyword : undefined;
};

const hasSubstitutionFunction = value => {
	const nodes = [value];
	while (nodes.length > 0) {
		const target = nodes.pop();
		if (
			target.type === 'Function'
			&& (substitutionFunctions.has(target.name.toLowerCase()) || target.name.startsWith('--'))
		) {
			return true;
		}

		if (target.children) {
			nodes.push(...target.children);
		}
	}

	return false;
};

const getValueParts = (value, sourceCode) => [...value.children].map(node => sourceCode.getText(node).trim());

const splitCommaList = (value, sourceCode) => {
	const [start, end] = sourceCode.getRange(value);
	const parts = [];
	let partStart = start;

	for (const child of value.children) {
		if (child.type !== 'Operator' || child.value !== ',') {
			continue;
		}

		const [operatorStart, operatorEnd] = sourceCode.getRange(child);
		parts.push(sourceCode.text.slice(partStart, operatorStart).trim());
		partStart = operatorEnd;
	}

	parts.push(sourceCode.text.slice(partStart, end).trim());
	return parts;
};

const serializePair = values => values[0] === values[1] ? values[0] : values.join(' ');

const serializeFourSides = values => {
	if (values.every(value => value === values[0])) {
		return values[0];
	}

	if (values[2] === values[0] && values[3] === values[1]) {
		return values.slice(0, 2).join(' ');
	}

	return values[3] === values[1] ? values.slice(0, 3).join(' ') : values.join(' ');
};

const serializeBorderRadius = (declarations, sourceCode) => {
	const horizontal = [];
	const vertical = [];

	for (const declaration of declarations) {
		const parts = getValueParts(declaration.value, sourceCode);
		if (parts.length === 0 || parts.length > 2) {
			return;
		}

		horizontal.push(parts[0]);
		vertical.push(parts[1] ?? parts[0]);
	}

	const horizontalValue = serializeFourSides(horizontal);
	return horizontal.every((value, index) => value === vertical[index])
		? horizontalValue
		: `${horizontalValue} / ${serializeFourSides(vertical)}`;
};

const serializeBorderImage = values => `${values[0]} ${values[1]} / ${values[2]} / ${values[3]} ${values[4]}`;
const serializeColumns = values => values[2].toLowerCase() === 'auto' ? values.slice(0, 2).join(' ') : undefined;
const serializeFont = values => `${values.slice(0, 4).join(' ')} ${values[4]} / ${values[5]} ${values[6]}`;

const serializeFontSynthesis = values => {
	if (values[3] === 'auto' || values.some(value => value !== 'auto' && value !== 'none')) {
		return;
	}

	const enabledValues = ['weight', 'style', 'small-caps'].filter((value, index) => values[index] === 'auto');
	return enabledValues.length > 0 ? enabledValues.join(' ') : 'none';
};

const serializeFontVariant = values => {
	if (values.at(-1).toLowerCase() !== 'normal') {
		return;
	}

	const nonNormalValues = values.filter(value => value.toLowerCase() !== 'normal');
	return nonNormalValues.length > 0 ? nonNormalValues.join(' ') : 'normal';
};

const serializeGridTemplate = (declarations, sourceCode) => {
	const [rowsDeclaration, columnsDeclaration, areasDeclaration] = declarations;
	const rows = getValue(rowsDeclaration, sourceCode);
	const columns = getValue(columnsDeclaration, sourceCode);
	const areas = getValue(areasDeclaration, sourceCode);

	if (areas.toLowerCase() === 'none') {
		return `${rows} / ${columns}`;
	}

	const areaParts = [...areasDeclaration.value.children];
	const rowParts = [...rowsDeclaration.value.children];
	if (
		areaParts.length !== rowParts.length
		|| areaParts.some(node => node.type !== 'String')
		|| rowParts.some(node => node.type === 'Brackets' || (node.type === 'Function' && node.name.toLowerCase() === 'repeat'))
	) {
		return;
	}

	const combinedRows = areaParts.map((area, index) => `${sourceCode.getText(area)} ${sourceCode.getText(rowParts[index])}`);
	return `${combinedRows.join(' ')} / ${columns}`;
};

const serializeGrid = (declarations, sourceCode) => {
	const values = declarations.map(declaration => getValue(declaration, sourceCode));
	const [rows, columns, areas, autoRows, autoColumns, autoFlow] = values;
	const normalizedAutoFlow = new Set(autoFlow.toLowerCase().split(/\s+/u));

	if (
		autoRows.toLowerCase() === 'auto'
		&& autoColumns.toLowerCase() === 'auto'
		&& autoFlow.toLowerCase() === 'row'
	) {
		return serializeGridTemplate(declarations.slice(0, 3), sourceCode);
	}

	const dense = normalizedAutoFlow.has('dense') ? ' dense' : '';

	if (
		areas.toLowerCase() === 'none'
		&& columns.toLowerCase() === 'none'
		&& autoRows.toLowerCase() === 'auto'
		&& normalizedAutoFlow.has('column')
	) {
		return `${rows} / auto-flow${dense} ${autoColumns}`;
	}

	if (
		areas.toLowerCase() === 'none'
		&& rows.toLowerCase() === 'none'
		&& autoColumns.toLowerCase() === 'auto'
		&& !normalizedAutoFlow.has('column')
	) {
		return `auto-flow${dense} ${autoRows} / ${columns}`;
	}
};

const serializeCyclicLists = (declarations, sourceCode, order, primaryIndex) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[primaryIndex].length;
	if (lists.some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		layers.push(order.map(componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		}).join(' '));
	}

	return layers.join(', ');
};

const serializeTransition = (declarations, sourceCode) => {
	const order = declarations.length === 5 ? [1, 2, 3, 4, 0] : [1, 2, 3, 0];
	return serializeCyclicLists(declarations, sourceCode, order, 0);
};

const serializeAnimation = (declarations, sourceCode) => {
	const animationNameDeclaration = declarations[7];
	const timelineValues = splitCommaList(declarations.at(-1).value, sourceCode);
	if (
		timelineValues.length > splitCommaList(animationNameDeclaration.value, sourceCode).length
		|| timelineValues.some(value => value.toLowerCase() !== 'auto')
		|| splitCommaList(declarations[0].value, sourceCode).some(value => value.toLowerCase() === 'auto')
	) {
		return;
	}

	if (animationNameDeclaration.value.children.some(node => node.type === 'Identifier' && (node.name.toLowerCase() === 'auto' || node.name.startsWith('--') || node.name.includes('\\')))) {
		return;
	}

	const shorthandDeclarations = declarations.slice(0, -1);
	return serializeCyclicLists(shorthandDeclarations, sourceCode, shorthandDeclarations.keys().toArray(), 7);
};

const serializeBackground = (declarations, sourceCode) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[0].length;
	if (lists.slice(1, -1).some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		const part = componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		};

		const layer = `${part(0)} ${part(1)} / ${part(2)} ${part(3)} ${part(4)} ${part(5)} ${part(6)}`;
		layers.push(index === count - 1 ? `${layer} ${lists[7][0]}` : layer);
	}

	return layers.join(', ');
};

const serializeMask = (declarations, sourceCode) => {
	const lists = declarations.map(declaration => splitCommaList(declaration.value, sourceCode));
	const count = lists[0].length;
	if (lists.some(list => list.length > count)) {
		return;
	}

	const layers = [];

	for (let index = 0; index < count; index++) {
		const part = componentIndex => {
			const list = lists[componentIndex];
			return list[index % list.length];
		};

		layers.push(`${part(0)} ${part(1)} / ${part(2)} ${part(3)} ${part(4)} ${part(5)} ${part(6)} ${part(7)}`);
	}

	return layers.join(', ');
};

const serializers = new Map([
	['animation', serializeAnimation],
	['background', serializeBackground],
	['border-image', (declarations, sourceCode) => serializeBorderImage(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['border-radius', serializeBorderRadius],
	['columns', (declarations, sourceCode) => serializeColumns(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['font', (declarations, sourceCode) => serializeFont(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['font-synthesis', (declarations, sourceCode) => serializeFontSynthesis(declarations.map(declaration => getValue(declaration, sourceCode).toLowerCase()))],
	['font-variant', (declarations, sourceCode) => serializeFontVariant(declarations.map(declaration => getValue(declaration, sourceCode)))],
	['grid', serializeGrid],
	['grid-template', serializeGridTemplate],
	['mask', serializeMask],
	['transition', serializeTransition],
]);

const serializeShorthand = (shorthand, declarations, sourceCode) => {
	const values = declarations.map(declaration => getValue(declaration, sourceCode));
	const wideKeywords = declarations.map(declaration => getCssWideKeyword(declaration));
	if (wideKeywords.some(Boolean)) {
		return wideKeywords.every(keyword => keyword === wideKeywords[0]) ? wideKeywords[0] : undefined;
	}

	if (slashShorthands.has(shorthand)) {
		return values.join(' / ');
	}

	if (pairShorthands.has(shorthand)) {
		return serializePair(values);
	}

	if (fourSideShorthands.has(shorthand)) {
		return serializeFourSides(values);
	}

	if (shorthand === 'list-style') {
		if (['inside', 'outside'].includes(values[0].toLowerCase())) {
			return;
		}

		return `${values[1]} ${values[0]} ${values[2]}`;
	}

	const serializer = serializers.get(shorthand);
	return serializer ? serializer(declarations, sourceCode) : values.join(' ');
};

const getLogicalPropertyMapping = property => {
	if (/^(?:top|right|bottom|left)$/u.test(property)) {
		return {group: 'inset', mapping: 'physical'};
	}

	const overflowMatch = property.match(/^(overflow|overscroll-behavior)-(x|y|block|inline)$/u);
	if (overflowMatch) {
		return {
			group: overflowMatch[1],
			mapping: /^(?:x|y)$/u.test(overflowMatch[2]) ? 'physical' : 'logical',
		};
	}

	const boxMatch = property.match(/^(margin|padding|inset|scroll-margin|scroll-padding)-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)$/u);
	if (boxMatch) {
		return {
			group: boxMatch[1],
			mapping: /^(?:top|right|bottom|left)$/u.test(boxMatch[2]) ? 'physical' : 'logical',
		};
	}

	const borderMatch = property.match(/^border-(top|right|bottom|left|block-start|block-end|inline-start|inline-end)-(width|style|color)$/u);
	if (borderMatch) {
		return {
			group: `border-${borderMatch[2]}`,
			mapping: /^(?:top|right|bottom|left)$/u.test(borderMatch[1]) ? 'physical' : 'logical',
		};
	}

	if (/^border-(?:top|right|bottom|left)-.+-radius$/u.test(property)) {
		return {group: 'border-radius', mapping: 'physical'};
	}

	if (/^border-(?:start|end)-(?:start|end)-radius$/u.test(property)) {
		return {group: 'border-radius', mapping: 'logical'};
	}
};

const getAffectedProperties = property => {
	const properties = new Set([property, ...(shorthandToAffectedProperties.get(property) ?? []), ...(additionalAffectedProperties.get(property) ?? [])]);
	const logicalBorderProperties = [];
	for (const affectedProperty of properties) {
		const match = affectedProperty.match(/^border-(block|inline)-(width|style|color)$/u);
		if (match) {
			logicalBorderProperties.push(`border-${match[1]}-start-${match[2]}`, `border-${match[1]}-end-${match[2]}`);
		}
	}

	for (const logicalBorderProperty of logicalBorderProperties) {
		properties.add(logicalBorderProperty);
	}

	return properties;
};

const propertyAffectsComponent = (property, component) => {
	const affectedProperties = getAffectedProperties(property);
	const componentProperties = getAffectedProperties(component);
	const propertyMappings = [...affectedProperties].map(property => getLogicalPropertyMapping(property)).filter(Boolean);

	return [...componentProperties].some(affectedProperty => {
		if (affectedProperties.has(affectedProperty)) {
			return true;
		}

		const componentMapping = getLogicalPropertyMapping(affectedProperty);
		return componentMapping && propertyMappings.some(mapping => mapping.group === componentMapping.group && mapping.mapping !== componentMapping.mapping);
	});
};

const getCandidates = (children, {shorthand, definition, catalogIndex}, sourceCode) => {
	const candidates = [];
	const declarations = new Map();
	const duplicateComponents = new Set();
	const {components} = definition;
	const resetProperties = [...definition.resetProperties, ...additionalResetProperties.get(shorthand) ?? []];
	const resetStates = new Map();

	const setAllResetStates = (declaration, keyword) => {
		resetStates.clear();
		for (const property of resetProperties) {
			resetStates.set(property, {declaration, keyword});
		}
	};
	const clearState = () => {
		declarations.clear();
		duplicateComponents.clear();
		resetStates.clear();
	};

	const addCandidate = () => {
		if (
			resetStates.size !== resetProperties.length
			|| duplicateComponents.size > 0
			|| components.some(component => !declarations.has(component))
		) {
			return;
		}

		const componentDeclarations = components.map(component => declarations.get(component));
		const resetStateValues = resetStates.values().toArray();
		const resetDeclarations = resetStateValues.map(({declaration}) => declaration);
		const sourceDeclarationSet = new Set([...componentDeclarations, ...resetDeclarations]);
		const sourceDeclarations = sourceDeclarationSet.values().toArray().toSorted((first, second) => sourceCode.getRange(first)[0] - sourceCode.getRange(second)[0]);
		candidates.push({
			shorthand,
			declarations: componentDeclarations,
			components,
			resetStates: resetStateValues,
			sourceDeclarations,
			catalogIndex,
		});
	};

	for (const child of children) {
		if (child.type !== 'Declaration') {
			addCandidate();
			clearState();
			continue;
		}

		const property = child.property.toLowerCase();
		const childVendorPrefix = getVendorPrefix(property);
		const unprefixedProperty = property.slice(childVendorPrefix.length);

		if (unprefixedProperty === 'all' || childVendorPrefix !== '') {
			addCandidate();
			clearState();
			continue;
		}

		const affectedResetProperties = resetProperties.filter(resetProperty => propertyAffectsComponent(unprefixedProperty, resetProperty));
		if (unprefixedProperty !== shorthand && affectedResetProperties.length > 0) {
			addCandidate();
			const keyword = getCssWideKeyword(child);
			const directlyAffectedProperties = getAffectedProperties(unprefixedProperty);
			for (const resetProperty of affectedResetProperties) {
				if (
					keyword
					&& directlyAffectedProperties.has(resetProperty)
				) {
					resetStates.set(resetProperty, {declaration: child, keyword});
				} else {
					resetStates.delete(resetProperty);
				}
			}

			continue;
		}

		const affectedComponents = components.filter(component => propertyAffectsComponent(unprefixedProperty, component));
		if (affectedComponents.length === 0) {
			continue;
		}

		if (unprefixedProperty === shorthand || !components.includes(unprefixedProperty)) {
			addCandidate();
			for (const component of affectedComponents) {
				declarations.delete(component);
				duplicateComponents.delete(component);
			}

			if (unprefixedProperty === shorthand) {
				resetStates.clear();
				const keyword = getCssWideKeyword(child);
				if (
					!hasSubstitutionFunction(child.value)
					&& !sourceCode.lexer.matchProperty(shorthand, child.value).error
					&& (!['animation', 'columns'].includes(shorthand) || keyword)
				) {
					setAllResetStates(child, keyword ?? 'initial');
				}
			}

			continue;
		}

		if (declarations.has(unprefixedProperty)) {
			duplicateComponents.add(unprefixedProperty);
		}

		declarations.set(unprefixedProperty, child);
	}

	addCandidate();
	return candidates;
};

const getCandidateValue = (candidate, sourceCode) => {
	const importance = candidate.declarations[0].important;
	if (
		candidate.declarations.some(declaration => declaration.important !== importance)
		|| candidate.resetStates.some(({declaration}) => declaration.important !== importance)
	) {
		return;
	}

	for (const [index, declaration] of candidate.declarations.entries()) {
		if (
			hasSubstitutionFunction(declaration.value)
			|| sourceCode.lexer.matchProperty(candidate.components[index], declaration.value).error
		) {
			return;
		}
	}

	const value = serializeShorthand(candidate.shorthand, candidate.declarations, sourceCode);
	if (
		!value
		|| candidate.resetStates.some(({keyword}) => keyword !== (cssWideKeywords.has(value) ? value : 'initial'))
		|| sourceCode.lexer.matchProperty(candidate.shorthand, value).error
	) {
		return;
	}

	return value;
};

const getFix = (candidate, block, comments, sourceCode) => {
	const declarationIndices = candidate.sourceDeclarations.map(declaration => block.children.indexOf(declaration));
	if (declarationIndices.some((index, arrayIndex) => arrayIndex > 0 && index !== declarationIndices[arrayIndex - 1] + 1)) {
		return;
	}

	const [start] = sourceCode.getRange(candidate.sourceDeclarations[0]);
	const lastDeclaration = candidate.sourceDeclarations.at(-1);
	const [, declarationEnd] = sourceCode.getRange(lastDeclaration);
	const trailingWhitespaceLength = sourceCode.getText(lastDeclaration).match(/[\t\n\f\r ]*$/u)[0].length;
	const end = declarationEnd - trailingWhitespaceLength;
	if (comments.some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart < end && commentEnd > start;
	})) {
		return;
	}

	const important = candidate.declarations[0].important ? ' !important' : '';
	const replacement = `${candidate.shorthand}: ${candidate.value}${important}`;
	return fixer => fixer.replaceTextRange([start, end], replacement);
};

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const ignoredShorthands = new Set(context.options[0].ignoreShorthands);
	const comments = getComments(context);

	context.on('Block', function * (block) {
		if (!block.children.some(child => child.type === 'Declaration')) {
			return;
		}

		const parent = sourceCode.getAncestors(block).at(-1);
		if (parent?.type === 'Atrule') {
			const atRule = sourceCode.lexer.getAtrule(parent.name.toLowerCase());
			if (!atRule || atRule.descriptors !== null) {
				return;
			}
		}

		const candidates = [];
		let catalogIndex = 0;
		for (const [shorthand, definition] of shorthandProperties) {
			if (!ignoredShorthands.has(shorthand)) {
				candidates.push(...getCandidates(block.children, {shorthand, definition, catalogIndex}, sourceCode));
			}

			catalogIndex++;
		}

		const usedDeclarations = new Set();
		const sortedCandidates = candidates
			.map(candidate => ({...candidate, value: getCandidateValue(candidate, sourceCode)}))
			.filter(candidate => candidate.value !== undefined)
			.toSorted((first, second) => second.sourceDeclarations.length - first.sourceDeclarations.length || first.catalogIndex - second.catalogIndex);

		for (const candidate of sortedCandidates) {
			if (candidate.sourceDeclarations.some(declaration => usedDeclarations.has(declaration))) {
				continue;
			}

			for (const declaration of candidate.sourceDeclarations) {
				usedDeclarations.add(declaration);
			}

			yield {
				node: candidate.sourceDeclarations.at(-1),
				messageId: MESSAGE_ID,
				data: {shorthand: candidate.shorthand},
				fix: getFix(candidate, block, comments, sourceCode),
			};
		}
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
			description: 'Disallow longhand properties that can be combined into a shorthand.',
			recommended: false,
		},
		fixable: 'code',
		schema: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					ignoreShorthands: {
						description: 'The shorthand properties to ignore.',
						type: 'array',
						uniqueItems: true,
						items: {
							type: 'string',
							enum: shorthandProperties.keys().toArray(),
						},
					},
				},
			},
		],
		defaultOptions: [{ignoreShorthands: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
