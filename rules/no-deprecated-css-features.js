import {
	ident,
	parse,
	tokenize,
	tokenTypes,
} from '@eslint/css-tree';
import {toLocation} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-deprecated-css-features/error';
const MESSAGE_ID_SUGGESTION = 'no-deprecated-css-features/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not use deprecated CSS {{feature}} `{{name}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{name}}` with `{{replacement}}`.',
};

const deprecatedAtRules = new Set(['document', 'nest', 'viewport']);
const deprecatedMediaTypes = new Set(['aural', 'braille', 'embossed', 'handheld', 'projection', 'speech', 'tty', 'tv']);

const deprecatedProperties = {
	'-khtml-box-align': 'align-items',
	'-khtml-box-direction': undefined,
	'-khtml-box-flex': 'flex-grow',
	'-khtml-box-lines': undefined,
	'-khtml-box-ordinal-group': 'order',
	'-khtml-box-orient': undefined,
	'-khtml-box-pack': undefined,
	'-khtml-user-modify': undefined,
	'-moz-box-align': 'align-items',
	'-moz-box-direction': undefined,
	'-moz-box-flex': 'flex-grow',
	'-moz-box-lines': undefined,
	'-moz-box-ordinal-group': 'order',
	'-moz-box-orient': undefined,
	'-moz-box-pack': undefined,
	'-moz-user-modify': undefined,
	'-ms-box-align': 'align-items',
	'-ms-box-direction': undefined,
	'-ms-box-flex': 'flex-grow',
	'-ms-box-lines': undefined,
	'-ms-box-ordinal-group': 'order',
	'-ms-box-orient': undefined,
	'-ms-box-pack': undefined,
	'-webkit-box-align': 'align-items',
	'-webkit-box-direction': undefined,
	'-webkit-box-flex': 'flex-grow',
	'-webkit-box-lines': undefined,
	'-webkit-box-ordinal-group': 'order',
	'-webkit-box-orient': undefined,
	'-webkit-box-pack': undefined,
	'-webkit-user-modify': undefined,
	'grid-column-gap': 'column-gap',
	'grid-gap': 'gap',
	'grid-row-gap': 'row-gap',
	'ime-mode': undefined,
	'page-break-after': 'break-after',
	'page-break-before': 'break-before',
	'page-break-inside': 'break-inside',
	'position-try-options': 'position-try-fallbacks',
	'scroll-snap-coordinate': undefined,
	'scroll-snap-destination': undefined,
	'scroll-snap-margin-bottom': 'scroll-margin-bottom',
	'scroll-snap-margin-left': 'scroll-margin-left',
	'scroll-snap-margin-right': 'scroll-margin-right',
	'scroll-snap-margin-top': 'scroll-margin-top',
	'scroll-snap-margin': 'scroll-margin',
	'scroll-snap-points-x': undefined,
	'scroll-snap-points-y': undefined,
	'scroll-snap-type-x': undefined,
	'scroll-snap-type-y': undefined,
	'word-wrap': 'overflow-wrap',
	clip: undefined,
};

const fixablePropertyAliases = new Set(['grid-column-gap', 'grid-gap', 'grid-row-gap', 'page-break-after', 'page-break-before', 'page-break-inside', 'word-wrap']);
const deprecatedAppearanceValues = {
	button: 'auto',
	checkbox: 'auto',
	listbox: 'auto',
	menulist: 'auto',
	meter: 'auto',
	'progress-bar': 'auto',
	'push-button': 'auto',
	radio: 'auto',
	searchfield: 'auto',
	'slider-horizontal': 'auto',
	'square-button': 'auto',
	textarea: 'auto',
};

const deprecatedSystemColors = {
	activecaption: 'canvas',
	appworkspace: 'canvas',
	background: 'canvas',
	inactivecaption: 'canvas',
	infobackground: 'canvas',
	menu: 'canvas',
	scrollbar: 'canvas',
	window: 'canvas',
	activeborder: 'ButtonBorder',
	inactiveborder: 'ButtonBorder',
	threeddarkshadow: 'ButtonBorder',
	threedhighlight: 'ButtonBorder',
	threedlightshadow: 'ButtonBorder',
	threedshadow: 'ButtonBorder',
	windowframe: 'ButtonBorder',
	captiontext: 'CanvasText',
	infotext: 'CanvasText',
	menutext: 'CanvasText',
	windowtext: 'CanvasText',
	buttonhighlight: 'ButtonFace',
	buttonshadow: 'ButtonFace',
	threedface: 'ButtonFace',
	inactivecaptiontext: 'GrayText',
};

const deprecatedSizeValues = {intrinsic: undefined, 'min-intrinsic': undefined};
const deprecatedValueKeywords = {
	appearance: deprecatedAppearanceValues,
	'image-rendering': {optimizequality: 'smooth', optimizespeed: 'pixelated'},
	overflow: {overlay: 'auto'},
	'overflow-x': {overlay: 'auto'},
	'overflow-y': {overlay: 'auto'},
	'text-justify': {distribute: 'inter-character'},
	'text-orientation': {'sideways-right': 'sideways'},
	'user-select': {element: 'contain'},
	zoom: {reset: '1'},
	'text-decoration': {blink: undefined},
	'text-decoration-line': {blink: undefined},
	'box-sizing': {'padding-box': undefined},
	'image-orientation': {flip: undefined},
	'min-height': deprecatedSizeValues,
	'min-width': deprecatedSizeValues,
	'max-height': deprecatedSizeValues,
	'max-width': deprecatedSizeValues,
	height: deprecatedSizeValues,
	width: deprecatedSizeValues,
	'word-break': {'break-word': undefined},
	'border-color': deprecatedSystemColors,
	'scrollbar-color': deprecatedSystemColors,
	'accent-color': deprecatedSystemColors,
	'background-color': deprecatedSystemColors,
	'border-block-color': deprecatedSystemColors,
	'border-block-end-color': deprecatedSystemColors,
	'border-block-start-color': deprecatedSystemColors,
	'border-bottom-color': deprecatedSystemColors,
	'border-inline-color': deprecatedSystemColors,
	'border-inline-end-color': deprecatedSystemColors,
	'border-inline-start-color': deprecatedSystemColors,
	'border-left-color': deprecatedSystemColors,
	'border-right-color': deprecatedSystemColors,
	'border-top-color': deprecatedSystemColors,
	'caret-color': deprecatedSystemColors,
	color: deprecatedSystemColors,
	'column-rule-color': deprecatedSystemColors,
	'outline-color': deprecatedSystemColors,
	'text-decoration-color': deprecatedSystemColors,
	'text-emphasis-color': deprecatedSystemColors,
	'flood-color': deprecatedSystemColors,
	'lighting-color': deprecatedSystemColors,
	'stop-color': deprecatedSystemColors,
};

const fixableValueAliases = new Set(['overflow: overlay', 'overflow-x: overlay', 'overflow-y: overlay', 'text-orientation: sideways-right']);
const colorFunctions = new Set(['color', 'color-contrast', 'color-mix', 'contrast-color', 'device-cmyk', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'light-dark', 'oklab', 'oklch', 'rgb', 'rgba']);

const deprecatedHtmlSelectors = new Set([
	'acronym',
	'applet',
	'basefont',
	'big',
	'bgsound',
	'blink',
	'center',
	'content',
	'dir',
	'font',
	'frame',
	'frameset',
	'isindex',
	'keygen',
	'listing',
	'marquee',
	'menuitem',
	'multicol',
	'nextid',
	'nobr',
	'noembed',
	'noframes',
	'plaintext',
	'param',
	'popup',
	'rb',
	'rtc',
	'selectmenu',
	'shadow',
	'spacer',
	'strike',
	'tt',
	'xmp',
]);
const deprecatedSvgSelectors = new Set([
	'altGlyph',
	'altGlyphDef',
	'altGlyphItem',
	'cursor',
	'font',
	'font-face',
	'font-face-format',
	'font-face-name',
	'font-face-src',
	'font-face-uri',
	'glyph',
	'glyphRef',
	'hatchPath',
	'hkern',
	'missing-glyph',
	'tref',
	'vkern',
]);
const deprecatedPseudoClasses = new Set(['-moz-any', '-webkit-any', 'contains', 'drop', 'focus-ring', 'fullscreen-ancestor', 'matches', 'popup-open', 'top-layer', 'user-error']);
const deprecatedPseudoElements = new Set(['content', 'shadow']);
const nonSelectorArgumentPseudoClasses = new Set(['active-view-transition-type', 'heading', 'state']);
const selectorArgumentPseudoElements = new Set(['cue', 'cue-region']);

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			allow: {
				description: 'Deprecated CSS features to allow.',
				type: 'array',
				items: {type: 'string'},
				uniqueItems: true,
			},
		},
	},
];

const normalizeIdentifier = value => ident.decode(value).toLowerCase();
const getRange = (node, context) => context.sourceCode.getRange(node);
const getNameRange = (node, prefixLength, context) => {
	const [start] = getRange(node, context);
	return [start, start + prefixLength + node.name.length];
};

const getDeprecatedTypeSelector = value => {
	let identifier;
	let lastTokenType;
	tokenize(value, (type, start, end) => {
		lastTokenType = type;
		if (type === tokenTypes.Ident) {
			identifier = {value: value.slice(start, end), offsets: [start, end]};
		}
	});

	if (lastTokenType !== tokenTypes.Ident) {
		return;
	}

	const decodedName = ident.decode(identifier.value);
	const htmlName = decodedName.toLowerCase();
	if (deprecatedHtmlSelectors.has(htmlName)) {
		return {name: htmlName, offsets: identifier.offsets};
	}

	if (deprecatedSvgSelectors.has(decodedName)) {
		return {name: decodedName, offsets: identifier.offsets};
	}
};

const getMediaTypeRange = (node, mediaType, context) => {
	const [start] = getRange(node, context);
	const text = context.sourceCode.getText(node);
	let mediaTypeRange;

	tokenize(text, (type, tokenStart, tokenEnd) => {
		if (
			!mediaTypeRange
			&& type === tokenTypes.Ident
			&& normalizeIdentifier(text.slice(tokenStart, tokenEnd)) === mediaType
		) {
			mediaTypeRange = [start + tokenStart, start + tokenEnd];
		}
	});

	return mediaTypeRange;
};

const shouldParseRawSelectorArguments = node => {
	if (node.type === 'PseudoElementSelector') {
		return selectorArgumentPseudoElements.has(normalizeIdentifier(node.name));
	}

	return node.type !== 'PseudoClassSelector' || !nonSelectorArgumentPseudoClasses.has(normalizeIdentifier(node.name));
};

const getParsedSelectorProblems = ({selector, sourceStart, node, context, allow}) => {
	const problems = [];

	const visit = currentSelector => {
		const {start} = Reflect.get(currentSelector, 'loc');
		let name;
		let range;
		let fix;
		switch (currentSelector.type) {
			case 'TypeSelector': {
				const deprecatedSelector = getDeprecatedTypeSelector(currentSelector.name);
				if (deprecatedSelector) {
					name = deprecatedSelector.name;
					range = deprecatedSelector.offsets.map(index => sourceStart + start.offset + index);
				}

				break;
			}

			case 'PseudoClassSelector': {
				const pseudoClass = normalizeIdentifier(currentSelector.name);
				if (deprecatedPseudoClasses.has(pseudoClass)) {
					name = `:${pseudoClass}`;
					range = [sourceStart + start.offset, sourceStart + start.offset + 1 + currentSelector.name.length];
					fix = pseudoClass === 'matches' ? fixer => fixer.replaceTextRange(range, ':is') : undefined;
				}

				break;
			}

			case 'PseudoElementSelector': {
				const pseudoElement = normalizeIdentifier(currentSelector.name);
				if (deprecatedPseudoElements.has(pseudoElement)) {
					name = `::${pseudoElement}`;
					range = [sourceStart + start.offset, sourceStart + start.offset + 2 + currentSelector.name.length];
				}

				break;
			}

			default: {
				break;
			}
		}

		if (name) {
			const problem = getProblem({
				node, location: toLocation(range, context), feature: 'selector', name, fix,
			}, allow);
			if (problem) {
				problems.push(problem);
			}
		}

		if (!currentSelector.children) {
			return;
		}

		for (const child of currentSelector.children) {
			if (child.type !== 'Raw') {
				visit(child);
				continue;
			}

			if (!shouldParseRawSelectorArguments(currentSelector)) {
				continue;
			}

			let selectorList;
			try {
				selectorList = parse(child.value, {context: 'selectorList', positions: true});
			} catch {
				continue;
			}

			const {start} = Reflect.get(child, 'loc');
			problems.push(...getParsedSelectorProblems({
				selector: selectorList,
				sourceStart: sourceStart + start.offset,
				node,
				context,
				allow,
			}));
		}
	};

	visit(selector);
	return problems;
};

const getDeprecatedRawSelectorProblems = ({node, context, allow}) => {
	if (!shouldParseRawSelectorArguments(node)) {
		return [];
	}

	const problems = [];

	for (const child of node.children ?? []) {
		if (child.type !== 'Raw') {
			continue;
		}

		let selectorList;
		try {
			selectorList = parse(child.value, {context: 'selectorList', positions: true});
		} catch {
			continue;
		}

		const [rawStart] = getRange(child, context);
		problems.push(...getParsedSelectorProblems({
			selector: selectorList, sourceStart: rawStart, node, context, allow,
		}));
	}

	return problems;
};

function * getValueIdentifiers(node, property) {
	if (node.type === 'Identifier') {
		yield node;
		return;
	}

	if (!node.children) {
		return;
	}

	if (
		node.type === 'Function'
		&& (
			deprecatedValueKeywords[property] !== deprecatedSystemColors
			|| !colorFunctions.has(normalizeIdentifier(node.name))
		)
	) {
		return;
	}

	for (const child of node.children) {
		yield * getValueIdentifiers(child, property);
	}
}

const getSingleValueIdentifier = declaration => {
	if (
		declaration.value.type !== 'Value'
		|| declaration.value.children.length !== 1
		|| declaration.value.children.at(0).type !== 'Identifier'
	) {
		return;
	}

	return declaration.value.children.at(0);
};

const canParseDeclarationReplacement = (declaration, range, replacement, context) => {
	const {sourceCode} = context;
	const declarationText = sourceCode.getText(declaration);
	const [declarationStart] = getRange(declaration, context);
	const [start, end] = range;
	const replacementText = declarationText.slice(0, start - declarationStart) + replacement + declarationText.slice(end - declarationStart);

	try {
		parse(replacementText, {context: 'declaration'});
		return true;
	} catch {
		return false;
	}
};

const getSuggestion = ({declaration, replacementRange, name, replacement, context}) => {
	if (!canParseDeclarationReplacement(declaration, replacementRange, replacement, context)) {
		return;
	}

	return {
		messageId: MESSAGE_ID_SUGGESTION,
		data: {name, replacement},
		fix: fixer => fixer.replaceTextRange(replacementRange, replacement),
	};
};

const getProblem = ({node, location, feature, name, fix, suggest}, allow) => {
	if (allow.has(name)) {
		return;
	}

	return {
		node,
		loc: location,
		messageId: MESSAGE_ID_ERROR,
		data: {feature, name},
		fix,
		suggest: suggest ? [suggest] : undefined,
	};
};

const getDeprecatedPropertyProblem = ({declaration, property, singleValueIdentifier, singleValue, context, allow}) => {
	if (
		!Object.hasOwn(deprecatedProperties, property)
		|| (property === '-webkit-box-orient' && singleValue === 'vertical')
	) {
		return;
	}

	const replacement = deprecatedProperties[property];
	const name = property;
	const [declarationStart] = getRange(declaration, context);
	const propertyRange = [declarationStart, declarationStart + declaration.property.length];
	const isPageBreakWithValueMapping = property === 'page-break-before' || property === 'page-break-after';
	const canFixAlias = !isPageBreakWithValueMapping || Boolean(singleValueIdentifier);
	let fix;
	let suggest;

	if (replacement && fixablePropertyAliases.has(property) && canFixAlias) {
		fix = function * (fixer) {
			yield fixer.replaceTextRange(propertyRange, replacement);

			if (isPageBreakWithValueMapping && singleValue === 'always') {
				yield fixer.replaceText(singleValueIdentifier, 'page');
			}
		};
	} else if (replacement && !fixablePropertyAliases.has(property)) {
		suggest = getSuggestion({
			declaration, replacementRange: propertyRange, name, replacement, context,
		});
	}

	return getProblem({
		node: declaration, location: toLocation(propertyRange, context), feature: 'property', name, fix, suggest,
	}, allow);
};

function * getDeprecatedValueProblems({declaration, property, context, allow}) {
	if (!Object.hasOwn(deprecatedValueKeywords, property)) {
		return;
	}

	if (declaration.value.type !== 'Value') {
		return;
	}

	const deprecatedValues = deprecatedValueKeywords[property];
	for (const identifier of getValueIdentifiers(declaration.value, property)) {
		const keyword = normalizeIdentifier(identifier.name);
		if (!Object.hasOwn(deprecatedValues, keyword)) {
			continue;
		}

		const name = `${property}: ${keyword}`;
		const replacement = deprecatedValues[keyword];
		const range = getRange(identifier, context);
		const fix = replacement && fixableValueAliases.has(name) ? fixer => fixer.replaceText(identifier, replacement) : undefined;
		const suggest = replacement && !fix
			? getSuggestion({
				declaration, replacementRange: range, name, replacement, context,
			})
			: undefined;
		const problem = getProblem({
			node: identifier, feature: 'property value', name, fix, suggest,
		}, allow);
		if (problem) {
			yield problem;
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const [{allow: allowedFeatures}] = context.options;
	const allow = new Set(allowedFeatures);

	context.on('Declaration', declaration => {
		const property = normalizeIdentifier(declaration.property);
		const singleValueIdentifier = getSingleValueIdentifier(declaration);
		const singleValue = normalizeIdentifier(singleValueIdentifier?.name ?? '');
		return [
			getDeprecatedPropertyProblem({
				declaration, property, singleValueIdentifier, singleValue, context, allow,
			}),
			...getDeprecatedValueProblems({
				declaration, property, context, allow,
			}),
		].filter(Boolean);
	});

	context.on('Atrule', node => {
		const atRule = normalizeIdentifier(node.name);
		if (!deprecatedAtRules.has(atRule)) {
			return;
		}

		const name = `@${atRule}`;
		return getProblem({
			node, location: toLocation(getNameRange(node, 1, context), context), feature: 'at-rule', name,
		}, allow);
	});

	context.on('MediaQuery', node => {
		if (!node.mediaType) {
			return;
		}

		const mediaType = normalizeIdentifier(node.mediaType);
		if (!deprecatedMediaTypes.has(mediaType)) {
			return;
		}

		const name = `@media ${mediaType}`;
		const range = getMediaTypeRange(node, mediaType, context);
		return getProblem({
			node, location: toLocation(range, context), feature: 'media type', name,
		}, allow);
	});

	context.on('TypeSelector', node => {
		const deprecatedSelector = getDeprecatedTypeSelector(node.name);
		if (!deprecatedSelector) {
			return;
		}

		const [start] = getRange(node, context);
		const range = deprecatedSelector.offsets.map(index => start + index);
		return getProblem({
			node,
			location: toLocation(range, context),
			feature: 'selector',
			name: deprecatedSelector.name,
		}, allow);
	});

	context.on('PseudoClassSelector', node => {
		const pseudoClass = normalizeIdentifier(node.name);
		const nestedProblems = getDeprecatedRawSelectorProblems({node, context, allow});
		if (!deprecatedPseudoClasses.has(pseudoClass)) {
			return nestedProblems;
		}

		const name = `:${pseudoClass}`;
		const range = getNameRange(node, 1, context);
		const fix = pseudoClass === 'matches' ? fixer => fixer.replaceTextRange(range, ':is') : undefined;
		return [
			getProblem({
				node, location: toLocation(range, context), feature: 'selector', name, fix,
			}, allow),
			...nestedProblems,
		].filter(Boolean);
	});

	context.on('PseudoElementSelector', node => {
		const pseudoElement = normalizeIdentifier(node.name);
		const nestedProblems = getDeprecatedRawSelectorProblems({node, context, allow});
		if (!deprecatedPseudoElements.has(pseudoElement)) {
			return nestedProblems;
		}

		const name = `::${pseudoElement}`;
		const range = getNameRange(node, 2, context);
		return [
			getProblem({
				node, location: toLocation(range, context), feature: 'selector', name,
			}, allow),
			...nestedProblems,
		].filter(Boolean);
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow deprecated CSS features.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{allow: []}],
		messages,
		languages: [
			'css/css',
		],
	},
};

export default config;
