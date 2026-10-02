import {getPropertyName} from '@eslint-community/eslint-utils';
import {
	isBigIntLiteral,
	isNumericLiteral,
	isStringLiteral,
	isMethodCall,
} from './ast/index.js';
import {getStaticValueForControlFlow, isString, unwrapTypeScriptExpression} from './utils/index.js';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {
	createBuiltinTypeCheckers,
	createTypeCheckers,
	target,
	unknown as unknownType,
} from './utils/type-helpers.js';
import typedArray from './shared/typed-array.js';

/**
@import * as ESLint from 'eslint';
*/

const messages = {
	unknown: '`{{option}}` is not a recognized {{api}} option.',
	invalid: '`{{option}}` must be {{expected}}.',
	required: 'The `{{required}}` option is required {{reason}}.',
	conflicting: '`{{option}}` {{reason}}.',
	ignored: '`{{option}}` is ignored {{reason}}.',
	rename: 'Rename `{{option}}` to `{{replacement}}`.',
};

// These tables describe the specification, not the host's ICU data or supported locales.
// https://tc39.es/ecma402/
const unicodeType = /^[\da-z]{3,8}(?:-[\da-z]{3,8})*$/i;
const textStyles = ['long', 'short', 'narrow'];
const numericStyles = ['numeric', '2-digit'];
const dateStyles = ['full', 'long', 'medium', 'short'];
const localeMatcher = ['lookup', 'best fit'];
const hourCycle = ['h11', 'h12', 'h23', 'h24'];
const caseFirst = ['upper', 'lower', 'false'];
const digitOptions = {
	minimumIntegerDigits: [1, 21],
	minimumFractionDigits: [0, 100],
	maximumFractionDigits: [0, 100],
	minimumSignificantDigits: [1, 21],
	maximumSignificantDigits: [1, 21],
	roundingIncrement: [1, 5000],
	roundingMode: ['ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven'],
	roundingPriority: ['auto', 'morePrecision', 'lessPrecision'],
	trailingZeroDisplay: ['auto', 'stripIfInteger'],
	notation: ['standard', 'scientific', 'engineering', 'compact'],
	compactDisplay: ['short', 'long'],
};
const roundingIncrements = new Set([1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000]);
const fractionOptions = ['minimumFractionDigits', 'maximumFractionDigits'];
const significantOptions = ['minimumSignificantDigits', 'maximumSignificantDigits'];
const dateComponents = {
	weekday: textStyles,
	era: textStyles,
	year: numericStyles,
	month: [...numericStyles, ...textStyles],
	day: numericStyles,
	dayPeriod: textStyles,
	hour: numericStyles,
	minute: numericStyles,
	second: numericStyles,
	fractionalSecondDigits: [1, 3],
	timeZoneName: ['short', 'long', 'shortOffset', 'longOffset', 'shortGeneric', 'longGeneric'],
};
const durationUnits = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds'];
const timeUnits = durationUnits.slice(4);
const fractionalUnits = new Set(durationUnits.slice(7));
const units = new Set([
	'acre',
	'bit',
	'byte',
	'celsius',
	'centimeter',
	'day',
	'degree',
	'fahrenheit',
	'fluid-ounce',
	'foot',
	'gallon',
	'gigabit',
	'gigabyte',
	'gram',
	'hectare',
	'hour',
	'inch',
	'kilobit',
	'kilobyte',
	'kilogram',
	'kilometer',
	'liter',
	'megabit',
	'megabyte',
	'meter',
	'microsecond',
	'mile',
	'mile-scandinavian',
	'milliliter',
	'millimeter',
	'millisecond',
	'minute',
	'month',
	'nanosecond',
	'ounce',
	'percent',
	'petabyte',
	'pound',
	'second',
	'stone',
	'terabit',
	'terabyte',
	'week',
	'yard',
	'year',
]);

const isUnit = value => {
	if (units.has(value)) {
		return true;
	}

	const parts = value.split('-per-');
	return parts.length === 2 && parts.every(part => units.has(part));
};

const isVariants = value => {
	const parts = value.split('-');
	const uniqueParts = new Set(parts.map(part => part.toLowerCase()));
	return parts.every(part => /^(?:[\da-z]{5,8}|\d[\da-z]{3})$/i.test(part))
		&& uniqueParts.size === parts.length;
};

const isFirstDayOfWeek = value => /^[0-7]$/.test(value) || unicodeType.test(value);

const optionsByConstructor = {
	Collator: {
		localeMatcher,
		usage: ['sort', 'search'],
		collation: unicodeType,
		numeric: Boolean,
		caseFirst,
		sensitivity: ['base', 'accent', 'case', 'variant'],
		ignorePunctuation: Boolean,
	},
	DateTimeFormat: {
		localeMatcher,
		calendar: unicodeType,
		numberingSystem: unicodeType,
		hour12: Boolean,
		hourCycle,
		timeZone: String,
		...dateComponents,
		formatMatcher: ['basic', 'best fit'],
		dateStyle: dateStyles,
		timeStyle: dateStyles,
	},
	DisplayNames: {
		localeMatcher,
		style: textStyles,
		type: ['language', 'region', 'script', 'currency', 'calendar', 'dateTimeField'],
		fallback: ['code', 'none'],
		languageDisplay: ['dialect', 'standard'],
	},
	DurationFormat: {
		localeMatcher,
		numberingSystem: unicodeType,
		style: [...textStyles, 'digital'],
		...Object.fromEntries(durationUnits.map((unit, index) => {
			if (index < 4) {
				return [unit, textStyles];
			}

			return [unit, [...textStyles, ...(index < 7 ? numericStyles : ['numeric'])]];
		})),
		...Object.fromEntries(durationUnits.map(unit => [`${unit}Display`, ['auto', 'always']])),
		fractionalDigits: [0, 9],
	},
	ListFormat: {localeMatcher, type: ['conjunction', 'disjunction', 'unit'], style: textStyles},
	Locale: {
		language: /^[a-z]{2,3}$|^[a-z]{5,8}$/i,
		script: /^[a-z]{4}$/i,
		region: /^[a-z]{2}$|^\d{3}$/i,
		variants: isVariants,
		calendar: unicodeType,
		collation: unicodeType,
		firstDayOfWeek: isFirstDayOfWeek,
		hourCycle,
		caseFirst,
		numeric: Boolean,
		numberingSystem: unicodeType,
	},
	NumberFormat: {
		localeMatcher,
		numberingSystem: unicodeType,
		style: ['decimal', 'percent', 'currency', 'unit'],
		currency: /^[a-z]{3}$/i,
		currencyDisplay: ['code', 'symbol', 'narrowSymbol', 'name'],
		currencySign: ['standard', 'accounting'],
		unit: isUnit,
		unitDisplay: ['short', 'narrow', 'long'],
		...digitOptions,
		useGrouping: ['min2', 'auto', 'always', 'true', 'false'],
		signDisplay: ['auto', 'never', 'always', 'exceptZero', 'negative'],
	},
	PluralRules: {localeMatcher, type: ['cardinal', 'ordinal'], ...digitOptions},
	RelativeTimeFormat: {
		localeMatcher,
		numberingSystem: unicodeType,
		style: textStyles,
		numeric: ['always', 'auto'],
	},
	Segmenter: {localeMatcher, granularity: ['grapheme', 'word', 'sentence']},
};
const unknown = Symbol('unknown');

const getOptionValue = (values, name, fallback) => values.get(name) === undefined ? fallback : values.get(name);
const isDefinedOption = (values, name) => values.get(name) !== undefined && values.get(name) !== unknown;

function getDigitUsage(values) {
	const priority = getOptionValue(values, 'roundingPriority', 'auto');
	if (priority === unknown) {
		return {fraction: unknown, significant: unknown};
	}

	if (priority !== 'auto') {
		return {fraction: true, significant: true};
	}

	const hasSignificant = significantOptions.some(name => isDefinedOption(values, name));
	if (!hasSignificant && significantOptions.some(name => values.get(name) === unknown)) {
		return {fraction: unknown, significant: unknown};
	}

	const hasFraction = fractionOptions.some(name => isDefinedOption(values, name));
	const notation = getOptionValue(values, 'notation', 'standard');
	if (!hasSignificant && !hasFraction && (notation === unknown || (notation === 'compact' && fractionOptions.some(name => values.get(name) === unknown)))) {
		return {significant: false, fraction: unknown};
	}

	return {
		significant: hasSignificant,
		fraction: !hasSignificant && (hasFraction || (notation !== unknown && notation !== 'compact')),
	};
}

// One edit, including adjacent transposition. The option names are short and the table is small.
function isSimilarOptionName(left, right) {
	left = left.toLowerCase();
	right = right.toLowerCase();
	if (left === right) {
		return true;
	}

	if (Math.abs(left.length - right.length) > 1) {
		return false;
	}

	let index = 0;
	while (left[index] === right[index] && index < Math.min(left.length, right.length)) {
		index++;
	}

	if (left.length === right.length) {
		return left.slice(index + 1) === right.slice(index + 1)
			|| (left[index] === right[index + 1] && left[index + 1] === right[index] && left.slice(index + 2) === right.slice(index + 2));
	}

	return left.length > right.length
		? left.slice(index + 1) === right.slice(index)
		: left.slice(index) === right.slice(index + 1);
}

function getRenameSuggestion(property, definitions, properties, context) {
	const name = getStaticPropertyName(property, context);
	const matches = Object.keys(definitions).filter(candidate => isSimilarOptionName(name, candidate));
	if (matches.length !== 1 || properties.has(matches[0])) {
		return;
	}

	const replacement = matches[0];
	const {sourceCode} = context;
	if (sourceCode.getCommentsInside(property.key).length > 0) {
		return;
	}

	const keyText = sourceCode.getText(property.key);
	let replacementText = replacement;
	if (property.shorthand) {
		replacementText = `${replacement}: ${keyText}`;
	} else if (property.computed || property.key.type !== 'Identifier') {
		replacementText = `'${replacement}'`;
	}

	return {
		messageId: 'rename',
		data: {option: name, replacement},
		/**
		@param {ESLint.Rule.RuleFixer} fixer
		*/
		fix: fixer => fixer.replaceText(property.key, replacementText),
	};
}

function getProperties(node, context) {
	const properties = new Map();
	for (const property of node.properties) {
		if (property.type !== 'Property' || property.kind !== 'init' || property.method) {
			return;
		}

		const name = getStaticPropertyName(property, context);
		if (name === undefined || properties.has(name) || (name === '__proto__' && !property.computed && !property.shorthand)) {
			return;
		}

		properties.set(name, property);
	}

	return properties;
}

function getNumericOptionValue(value, [minimum, maximum], name) {
	const number = typeof value === 'bigint' || typeof value === 'symbol' ? NaN : Number(value);
	if (!Number.isFinite(number) || number < minimum || number > maximum) {
		return {expected: `a number between ${minimum} and ${maximum}`};
	}

	const integer = Math.floor(number);
	if (name === 'roundingIncrement' && !roundingIncrements.has(integer)) {
		return {expected: `one of ${[...roundingIncrements].join(', ')}`};
	}

	return {value: integer};
}

function getNormalizedValue(value, definition, name) {
	if (value === undefined) {
		return {value};
	}

	if (definition === Boolean) {
		return {value: Boolean(value)};
	}

	if (Array.isArray(definition) && typeof definition[0] === 'number') {
		return getNumericOptionValue(value, definition, name);
	}

	if (name === 'useGrouping' && (value === true || !value)) {
		return {value: Boolean(value)};
	}

	if (typeof value === 'symbol') {
		return {expected: 'convertible to a string'};
	}

	const string = String(value);
	if (definition === String) {
		return {value: string};
	}

	if (Array.isArray(definition)) {
		return definition.includes(string)
			? {value: string}
			: {expected: `one of ${definition.map(value => `"${value}"`).join(', ')}`};
	}

	const isValid = definition instanceof RegExp ? definition.test(string) : definition(string);
	return isValid ? {value: string} : {expected: 'a well-formed identifier'};
}

function validateDigitOptions(values, validate) {
	if (getDigitUsage(values).significant === true) {
		for (const name of significantOptions) {
			validate(name);
		}
	}

	if (getDigitUsage(values).fraction === true) {
		for (const name of fractionOptions) {
			validate(name);
		}
	}
}

function getRoundingIncrementConflictReason(values, usage) {
	const increment = getOptionValue(values, 'roundingIncrement', 1);
	if (increment === unknown || increment === 1) {
		return;
	}

	const priority = getOptionValue(values, 'roundingPriority', 'auto');
	if (priority !== unknown && priority !== 'auto') {
		return 'requires `roundingPriority` to be "auto"';
	}

	if (usage.significant === true) {
		return 'cannot be combined with significant-digit rounding';
	}

	if (usage.fraction === false) {
		return 'requires fraction-digit rounding instead of the default compact rounding';
	}

	if (usage.fraction === true && fractionOptions.every(name => typeof values.get(name) === 'number') && values.get(fractionOptions[0]) !== values.get(fractionOptions[1])) {
		return 'requires equal `minimumFractionDigits` and `maximumFractionDigits`';
	}
}

function validateDigitCombinations(values, addProblem) {
	const usage = getDigitUsage(values);
	for (const [names, active] of [[fractionOptions, usage.fraction], [significantOptions, usage.significant]]) {
		const [minimum, maximum] = names;
		if (active === true && typeof values.get(minimum) === 'number' && typeof values.get(maximum) === 'number' && values.get(minimum) > values.get(maximum)) {
			addProblem(maximum, 'conflicting', {reason: `must be greater than or equal to \`${minimum}\``});
		}
	}

	const priority = getOptionValue(values, 'roundingPriority', 'auto');
	const roundingConflict = getRoundingIncrementConflictReason(values, usage);
	if (roundingConflict) {
		addProblem('roundingIncrement', 'conflicting', {reason: roundingConflict});
	}

	if (usage.significant === true && priority === 'auto') {
		for (const name of fractionOptions) {
			if (isDefinedOption(values, name)) {
				addProblem(name, 'ignored', {reason: 'when significant-digit rounding takes precedence'});
			}
		}
	}

	const notation = getOptionValue(values, 'notation', 'standard');
	if (notation !== unknown && notation !== 'compact' && isDefinedOption(values, 'compactDisplay')) {
		addProblem('compactDisplay', 'ignored', {reason: 'unless `notation` is "compact"'});
	}
}

function validateDurationOptions(values, addProblem) {
	const baseStyle = getOptionValue(values, 'style', 'short');
	let previousStyle = '';
	for (const unit of timeUnits) {
		let style = values.get(unit);
		if (style === undefined) {
			if (baseStyle === 'digital' || ['numeric', '2-digit', 'fractional'].includes(previousStyle)) {
				style = 'numeric';
			} else if (baseStyle === unknown || previousStyle === unknown) {
				style = unknown;
			} else {
				style = baseStyle;
			}
		}

		if (style === 'numeric' && fractionalUnits.has(unit)) {
			style = 'fractional';
		}

		const needsFractional = previousStyle === 'fractional' && style !== 'fractional';
		const needsNumeric = numericStyles.includes(previousStyle) && ![...numericStyles, 'fractional'].includes(style);
		if (style !== unknown && previousStyle !== unknown && (needsFractional || needsNumeric)) {
			addProblem(unit, 'conflicting', {reason: 'must continue the preceding numeric or fractional unit style'});
		}

		if (style === 'fractional' && values.get(`${unit}Display`) === 'always') {
			addProblem(`${unit}Display`, 'conflicting', {reason: 'cannot be "always" for a fractional unit'});
		}

		previousStyle = style;
	}
}

function validateNumberFormatOptions(values, addProblem) {
	const style = getOptionValue(values, 'style', 'decimal');
	for (const [required, companions] of [['currency', ['currency', 'currencyDisplay', 'currencySign']], ['unit', ['unit', 'unitDisplay']]]) {
		if (style === required && values.get(required) === undefined) {
			addProblem('style', 'required', {required, reason: `when \`style\` is "${style}"`});
		}

		if (style !== unknown && style !== required) {
			for (const name of companions) {
				if (isDefinedOption(values, name)) {
					addProblem(name, 'ignored', {reason: `unless \`style\` is "${required}"`});
				}
			}
		}
	}
}

function validateDisplayNamesOptions(values, addProblem) {
	const type = values.get('type');
	if (type === undefined) {
		addProblem('type', 'required', {required: 'type', reason: 'for Intl.DisplayNames'});
	} else if (type !== unknown && type !== 'language' && isDefinedOption(values, 'languageDisplay')) {
		addProblem('languageDisplay', 'ignored', {reason: 'unless `type` is "language"'});
	}
}

function validateDateTimeOptions(values, api, addProblem) {
	for (const [method, forbidden] of [['toLocaleDateString', 'timeStyle'], ['toLocaleTimeString', 'dateStyle']]) {
		if (api.endsWith(`.${method}`) && isDefinedOption(values, forbidden)) {
			addProblem(forbidden, 'conflicting', {reason: `cannot be used with \`${method}()\``});
		}
	}

	const style = ['dateStyle', 'timeStyle'].find(name => isDefinedOption(values, name));
	if (style) {
		for (const name of Object.keys(dateComponents)) {
			if (isDefinedOption(values, name)) {
				addProblem(name, 'conflicting', {reason: `cannot be combined with \`${style}\``});
			}
		}

		if (isDefinedOption(values, 'formatMatcher')) {
			addProblem('formatMatcher', 'ignored', {reason: 'when `dateStyle` or `timeStyle` is used'});
		}
	}

	if (isDefinedOption(values, 'hour12') && isDefinedOption(values, 'hourCycle')) {
		addProblem('hourCycle', 'ignored', {reason: 'when `hour12` is provided'});
	}
}

function getStaticPrimitiveValue(node, context) {
	const result = getStaticValueForControlFlow(node, context);
	if (!result || (result.value !== null && ['object', 'function'].includes(typeof result.value))) {
		return unknown;
	}

	return result.value;
}

function getStaticPropertyName(node, context) {
	if (!node.computed) {
		return getPropertyName(node) ?? undefined;
	}

	const value = getStaticPrimitiveValue(node.key ?? node.property, context);
	return value === unknown || typeof value === 'symbol' ? undefined : String(value);
}

function * getOptionsProblems(node, constructor, api, context) {
	const optionsIndex = api === 'String.localeCompare' ? 2 : 1;
	if (node.arguments.slice(0, optionsIndex + 1).some(argument => argument.type === 'SpreadElement')) {
		return;
	}

	const argument = node.arguments[optionsIndex];
	const options = argument && unwrapTypeScriptExpression(argument);
	if (options?.type !== 'ObjectExpression') {
		return;
	}

	const properties = getProperties(options, context);
	if (!properties) {
		return;
	}

	const definitions = constructor === 'supportedLocalesOf' ? {localeMatcher} : optionsByConstructor[constructor];
	const values = new Map();
	const problems = new Map();
	const addProblem = (name, messageId, data) => {
		if (!problems.has(name)) {
			problems.set(name, {node: properties.get(name)?.key ?? options, messageId, data: {option: name, api, ...data}});
		}
	};

	for (const [name, property] of properties) {
		if (!Object.hasOwn(definitions, name)) {
			addProblem(name, 'unknown');
			const suggestion = getRenameSuggestion(property, definitions, properties, context);
			if (suggestion) {
				problems.get(name).suggest = [suggestion];
			}

			continue;
		}

		values.set(name, getStaticPrimitiveValue(property.value, context));
	}

	const validate = name => {
		const value = values.get(name);
		if (!values.has(name) || value === unknown) {
			return;
		}

		const result = getNormalizedValue(value, definitions[name], name);
		if (result.expected) {
			addProblem(name, 'invalid', {expected: result.expected});
			values.set(name, unknown);
		} else {
			values.set(name, result.value);
		}
	};

	for (const name of values.keys()) {
		if (!fractionOptions.includes(name) && !significantOptions.includes(name)) {
			validate(name);
		}
	}

	if (constructor === 'NumberFormat' || constructor === 'PluralRules') {
		validateDigitOptions(values, validate);

		validateDigitCombinations(values, addProblem);
	}

	switch (constructor) {
		case 'NumberFormat': {
			validateNumberFormatOptions(values, addProblem);
			break;
		}

		case 'DisplayNames': {
			validateDisplayNamesOptions(values, addProblem);
			break;
		}

		case 'DateTimeFormat': {
			validateDateTimeOptions(values, api, addProblem);
			break;
		}

		case 'DurationFormat': {
			validateDurationOptions(values, addProblem);
			break;
		}

		default: {
			break;
		}
	}

	yield * problems.values();
}

const constructorNames = Object.keys(optionsByConstructor);
const constructTracker = new GlobalReferenceTracker({
	objects: constructorNames.map(name => `Intl.${name}`),
	type: GlobalReferenceTracker.CONSTRUCT,
	handle: ({node, path}, context) => getOptionsProblems(node, path[1], path.join('.'), context),
});
const callTracker = new GlobalReferenceTracker({
	objects: [
		...['Collator', 'DateTimeFormat', 'NumberFormat'].map(name => `Intl.${name}`),
		...constructorNames.filter(name => name !== 'Locale').map(name => `Intl.${name}.supportedLocalesOf`),
	],
	type: GlobalReferenceTracker.CALL,
	handle: ({node, path}, context) => getOptionsProblems(node, path.length === 3 ? 'supportedLocalesOf' : path[1], path.join('.'), context),
});
const {isTarget: isDate} = createBuiltinTypeCheckers({
	name: 'Date',
	checkClassHeritage: false,
	allowNullishInMixedUnion: true,
});
const {isTarget: isStringReceiver} = createBuiltinTypeCheckers({
	name: 'String',
	checkClassHeritage: false,
	allowNullishInMixedUnion: true,
	isTargetTypeAnnotation: node => node?.type === 'TSStringKeyword' || (node?.type === 'TSLiteralType' && isStringLiteral(node.literal)),
	isTargetType: type => type.intrinsicName === 'string' || type.isStringLiteral?.(),
});
const {isTarget: isNumericReceiver} = createTypeCheckers({
	checkClassHeritage: false,
	allowNullishInMixedUnion: true,
	targetTypeNames: new Set(['Number', 'BigInt', ...typedArray]),
	targetCallNames: ['Number', 'BigInt'],
	targetConstructorNames: ['Number', ...typedArray],
	isTargetNode: node => isNumericLiteral(node) || isBigIntLiteral(node) || isMethodCall(node, {objects: typedArray, methods: ['from', 'of']}),
	isTargetTypeAnnotation(node) {
		if (node?.type === 'TSNumberKeyword' || node?.type === 'TSBigIntKeyword') {
			return true;
		}

		if (node?.type !== 'TSLiteralType') {
			return false;
		}

		const literal = node.literal.type === 'UnaryExpression' ? node.literal.argument : node.literal;
		return isNumericLiteral(literal) || isBigIntLiteral(literal);
	},
	isTargetType: type => type.intrinsicName === 'number' || type.intrinsicName === 'bigint' || type.isNumberLiteral?.() || type.isBigIntLiteral?.(),
	getStaticType: value => typeof value === 'number' || typeof value === 'bigint' ? target : unknownType,
});

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	constructTracker.listen({context});
	callTracker.listen({context});
	context.on('CallExpression', node => {
		const callee = unwrapTypeScriptExpression(node.callee);
		if (callee.type !== 'MemberExpression') {
			return;
		}

		const method = getStaticPropertyName(callee, context);
		if (!['localeCompare', 'toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].includes(method)) {
			return;
		}

		const receiver = callee.object;
		if (method === 'localeCompare' && (isString(receiver, context) || isStringReceiver(receiver, context))) {
			return getOptionsProblems(node, 'Collator', 'String.localeCompare', context);
		}

		if (method === 'toLocaleString' && isNumericReceiver(receiver, context)) {
			return getOptionsProblems(node, 'NumberFormat', 'Number.toLocaleString', context);
		}

		if (method !== 'localeCompare' && isDate(receiver, context)) {
			return getOptionsProblems(node, 'DateTimeFormat', `Date.${method}`, context);
		}
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
			description: 'Disallow invalid or ignored Intl options.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};
export default config;
