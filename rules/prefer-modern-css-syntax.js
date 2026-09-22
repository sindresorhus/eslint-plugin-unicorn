import {ident, parse, walk} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

const MESSAGE_ID_COLOR = 'prefer-modern-css-syntax/color';
const MESSAGE_ID_PSEUDO_ELEMENT = 'prefer-modern-css-syntax/pseudo-element';
const messages = {
	[MESSAGE_ID_COLOR]: 'Prefer modern color syntax for `{{name}}()`.',
	[MESSAGE_ID_PSEUDO_ELEMENT]: 'Use `::{{name}}` instead of `:{{name}}`.',
};

const legacyColorFunctions = new Set(['rgb', 'rgba', 'hsl', 'hsla']);
const colorFunctionsWithAlpha = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);
const legacyPseudoElements = new Set(['before', 'after', 'first-line', 'first-letter']);
const decimalPattern = /^(?<sign>[+\-]?)(?<integer>\d*)(?:\.(?<fraction>\d+))?$/v;

const getRange = (node, offset, sourceCode) => sourceCode.getRange(node).map(index => index + offset);
const normalizeIdentifier = value => ident.decode(value).toLowerCase();
const hasLinebreak = text => text.includes('\n') || text.includes('\r') || text.includes('\f');
const hasKnownColorComponents = (children, commas, slash) => (commas.length === 2 || commas.length === 3) && !slash && children.length === (commas.length * 2) + 1;

function toPercentage(number) {
	const match = decimalPattern.exec(number);
	if (!match) {
		return;
	}

	const {sign, fraction = ''} = match.groups;
	const integer = match.groups.integer || '0';
	const decimalIndex = integer.length + 2;
	const digits = (integer + fraction).padEnd(decimalIndex, '0');
	const whole = digits.slice(0, decimalIndex).replace(/^0+(?=\d)/v, '');
	const remainder = digits.slice(decimalIndex).replace(/0+$/v, '');
	return `${sign}${whole}${remainder ? `.${remainder}` : ''}%`;
}

function getSeparatorFixes(children, commas, offset, sourceCode) {
	const fixes = [];
	for (const comma of commas) {
		const index = children.indexOf(comma);
		const previousRange = getRange(children[index - 1], offset, sourceCode);
		const nextRange = getRange(children[index + 1], offset, sourceCode);
		const commaRange = getRange(comma, offset, sourceCode);
		const betweenRange = [previousRange[1], nextRange[0]];
		const between = sourceCode.text.slice(...betweenRange);
		const isAlphaSeparator = index === 5;
		const beforeComma = sourceCode.text.slice(previousRange[1], commaRange[0]);
		if (hasLinebreak(beforeComma)) {
			return [];
		}

		if (hasLinebreak(between)) {
			const afterComma = sourceCode.text.slice(commaRange[1], nextRange[0]).replace(/^[\t ]+(?=[\n\f\r])/u, '');
			fixes.push({span: betweenRange, replacement: `${isAlphaSeparator ? ' /' : ''}${afterComma}`});
		} else {
			fixes.push({span: betweenRange, replacement: isAlphaSeparator ? ' / ' : ' '});
		}
	}

	return fixes;
}

function getColorFixes({node, name, children, commas, hasKnownComponents, alpha, offset, sourceCode}) {
	const span = getRange(node, offset, sourceCode);
	const fixes = [];
	if (name === 'rgba' || name === 'hsla') {
		fixes.push({span: [span[0], span[0] + node.name.length], replacement: name.slice(0, -1)});
	}

	if (hasKnownComponents) {
		const separatorFixes = getSeparatorFixes(children, commas, offset, sourceCode);
		if (separatorFixes.length === 0) {
			return [];
		}

		fixes.push(...separatorFixes);
	}

	if (alpha?.type === 'Number') {
		const replacement = toPercentage(alpha.value);
		if (replacement) {
			fixes.push({span: getRange(alpha, offset, sourceCode), replacement});
		}
	}

	return fixes;
}

function getColorProblem(node, offset, context, reportNode = node) {
	const {sourceCode} = context;
	const name = normalizeIdentifier(node.name);
	if (!colorFunctionsWithAlpha.has(name)) {
		return;
	}

	const children = [...node.children];
	const operators = children.filter(child => child.type === 'Operator');
	const commas = operators.filter(child => child.value === ',');
	const slash = operators.find(child => child.value === '/');
	const isAlias = name === 'rgba' || name === 'hsla';
	const hasLegacyCommas = legacyColorFunctions.has(name) && commas.length > 0;
	const hasKnownComponents = hasLegacyCommas && hasKnownColorComponents(children, commas, slash);
	let alpha;
	if ((hasKnownComponents && commas.length === 3) || (slash && children.at(-2) === slash)) {
		alpha = children.at(-1);
	}

	const hasNumericAlpha = alpha?.type === 'Number';
	if (!isAlias && !hasLegacyCommas && !hasNumericAlpha) {
		return;
	}

	const span = getRange(node, offset, sourceCode);
	const problem = {
		node: reportNode,
		loc: toLocation(span, context),
		messageId: MESSAGE_ID_COLOR,
		data: {name},
	};
	if (
		sourceCode.text.slice(...span).includes('/*')
		|| (hasLegacyCommas && !hasKnownComponents)
	) {
		return problem;
	}

	const fixes = getColorFixes({
		node,
		name,
		children,
		commas,
		hasKnownComponents,
		alpha,
		offset,
		sourceCode,
	});
	if (fixes.length === 0) {
		return problem;
	}

	return {
		...problem,
		* fix(fixer) {
			for (const {span, replacement} of fixes) {
				yield fixer.replaceTextRange(span, replacement);
			}
		},
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Function', node => getColorProblem(node, 0, context));

	context.on('Declaration', declaration => {
		if (!declaration.property.startsWith('--') || declaration.value.type !== 'Raw') {
			return;
		}

		let parsed;
		try {
			parsed = parse(context.sourceCode.getText(declaration), {
				context: 'declaration',
				parseCustomProperty: true,
				positions: true,
			});
		} catch {
			return;
		}

		if (parsed.value.type !== 'Value') {
			return;
		}

		const problems = [];
		const [offset] = context.sourceCode.getRange(declaration);
		walk(parsed.value, node => {
			if (node.type !== 'Function') {
				return;
			}

			const problem = getColorProblem(node, offset, context, declaration);
			if (problem) {
				problems.push(problem);
			}
		});
		return problems;
	});

	context.on('PseudoClassSelector', node => {
		const name = normalizeIdentifier(node.name);
		if (!legacyPseudoElements.has(name)) {
			return;
		}

		const [start] = context.sourceCode.getRange(node);
		return {
			node,
			messageId: MESSAGE_ID_PSEUDO_ELEMENT,
			data: {name},
			fix: fixer => fixer.replaceTextRange([start, start + 1], '::'),
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
			description: 'Prefer modern CSS color and pseudo-element syntax.',
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
