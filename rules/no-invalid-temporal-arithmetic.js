import {getPropertyName} from '@eslint-community/eslint-utils';
import {isMemberExpression, isMethodCall} from './ast/index.js';
import {getConstVariableInitializer, getStaticValueForControlFlow, unwrapTypeScriptExpression} from './utils/index.js';
import {createTypeCheckers} from './utils/type-helpers.js';

const messages = {
	'instant-calendar-unit': '`Temporal.Instant.{{method}}()` does not support nonzero years, months, weeks, or days. Use elapsed time units or calendar arithmetic on a `Temporal.ZonedDateTime`.',
	'duration-calendar-unit': '`Temporal.Duration.{{method}}()` does not support nonzero years, months, or weeks. Use date arithmetic relative to a starting point.',
	'year-month-unit': '`Temporal.PlainYearMonth.{{method}}()` does not support nonzero weeks, days, or time units. Use years or months, or date arithmetic on a `Temporal.PlainDate`.',
	'relative-to': '`Temporal.Duration.{{method}}()` requires `relativeTo` for calendar units.',
	'invalid-option': 'Invalid `{{option}}` for `Temporal.{{type}}.{{method}}()`.',
	'missing-unit': '`Temporal.{{type}}.{{method}}()` requires {{required}}.',
	'unit-order': '`largestUnit` must be at least as large as `smallestUnit`.',
	'invalid-increment': 'Invalid `roundingIncrement` for `Temporal.{{type}}.{{method}}()` and the selected units.',
	'correct-unit-key': 'Use `{{expected}}` instead of `{{actual}}`.',
	'elapsed-days': 'Treat each day as 24 elapsed hours.',
};
const unknown = Symbol('unknown');
const units = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'];
const durationFields = units.map(unit => `${unit}s`);
const timeUnits = units.slice(4);
const dateUnits = units.slice(0, 4);
const roundingModes = new Set(['ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven']);
const maximumIncrements = new Map([['hour', 24], ['minute', 60], ['second', 60], ['millisecond', 1000], ['microsecond', 1000], ['nanosecond', 1000]]);
const instantIncrements = new Map([
	['hour', 24],
	['minute', 1440],
	['second', 86_400],
	['millisecond', 86_400_000],
	['microsecond', 86_400_000_000],
	['nanosecond', 86_400_000_000_000],
]);
const typeNames = ['Instant', 'Duration', 'PlainTime', 'PlainDate', 'PlainYearMonth', 'PlainDateTime', 'ZonedDateTime'];
const nowMethods = new Map([
	['Instant', 'instant'],
	['PlainTime', 'plainTimeISO'],
	['PlainDate', 'plainDateISO'],
	['PlainDateTime', 'plainDateTimeISO'],
	['ZonedDateTime', 'zonedDateTimeISO'],
]);
const differenceDefaults = new Map([
	['Instant', ['second', 'nanosecond']],
	['PlainTime', ['hour', 'nanosecond']],
	['PlainDate', ['day', 'day']],
	['PlainYearMonth', ['year', 'month']],
	['PlainDateTime', ['day', 'nanosecond']],
	['ZonedDateTime', ['hour', 'nanosecond']],
]);
const methodsByType = new Map(typeNames.map(type => {
	const methods = ['add', 'subtract'];
	if (type === 'Duration') {
		methods.push('round', 'total');
	} else {
		methods.push('since', 'until');
		if (type !== 'PlainDate' && type !== 'PlainYearMonth') {
			methods.push('round');
		}
	}

	return [type, new Set(methods)];
}));
const arithmeticMethods = new Set(methodsByType.values().flatMap(methods => methods.values()));

const isTemporalType = (node, type) => isMemberExpression(node, {object: 'Temporal', property: type, optional: false});

function isTemporalSource(node, type) {
	if (node.type === 'NewExpression') {
		return isTemporalType(node.callee, type);
	}

	const factories = type === 'Instant' ? ['from', 'fromEpochMilliseconds', 'fromEpochNanoseconds'] : ['from'];
	if (isMethodCall(node, {
		methods: factories, minimumArguments: 1, maximumArguments: type === 'Duration' || type === 'Instant' ? 1 : 2, optionalCall: false, optionalMember: false,
	})) {
		return isTemporalType(node.callee.object, type);
	}

	return nowMethods.has(type)
		&& isMethodCall(node, {
			method: nowMethods.get(type), maximumArguments: type === 'Instant' ? 0 : 1, optionalCall: false, optionalMember: false,
		})
		&& isTemporalType(node.callee.object, 'Now');
}

const receiverCheckers = new Map(typeNames.map(type => [type, createTypeCheckers({
	targetTypeNames: new Set([`Temporal.${type}`]),
	checkClassHeritage: false,
	isTargetNode: node => isTemporalSource(node, type),
	isTargetType(value, checker) {
		const symbol = value.getSymbol();
		if (!symbol) {
			return false;
		}

		const name = checker.getFullyQualifiedName(symbol);
		return name === `Temporal.${type}` || name.endsWith(`.Temporal.${type}`);
	},
}).isTarget]));

function getPrimitive(node, context) {
	if (!node) {
		return;
	}

	const result = getStaticValueForControlFlow(node, context);
	if (!result || (result.value !== null && ['object', 'function'].includes(typeof result.value))) {
		return unknown;
	}

	return result.value;
}

function getProperties(node) {
	node = unwrapTypeScriptExpression(node);
	if (node?.type !== 'ObjectExpression') {
		return;
	}

	const properties = new Map();
	for (const property of node.properties) {
		if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') {
			return;
		}

		const name = getPropertyName(property);
		if (name === undefined || name === '__proto__') {
			return;
		}

		properties.set(name, property);
	}

	return properties;
}

function getOptions(node, shorthand, context) {
	const properties = getProperties(node);
	if (properties) {
		return new Map([...properties].map(([name, property]) => [name, {value: getPrimitive(property.value, context), node: property.value, property}]));
	}

	const value = getPrimitive(node, context);
	if (value === undefined) {
		return new Map();
	}

	if (shorthand && typeof value === 'string') {
		return new Map([[shorthand, {value, node}]]);
	}
}

function getInteger(value) {
	if (value === unknown || typeof value === 'bigint' || typeof value === 'symbol') {
		return unknown;
	}

	const number = value === undefined ? 0 : Number(value);
	return Number.isSafeInteger(number) ? number : unknown;
}

// Deliberately recognize a common ISO subset rather than implementing Temporal's duration parser.
const durationPattern = /^([+\-]?)P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)(?:\.(\d{1,9}))?S)?)?$/v;
function getStringDuration(value) {
	const match = durationPattern.exec(value);
	if (!match || match.slice(2).every(component => component === undefined) || (value.includes('T') && match.slice(6).every(component => component === undefined))) {
		return;
	}

	const sign = match[1] === '-' ? -1 : 1;
	const fields = match.slice(2, 9).map(component => {
		const value = getInteger(component);
		return value === unknown ? unknown : value * sign;
	});
	if (fields.some(value => !Number.isSafeInteger(value))) {
		return;
	}

	const fraction = (match[9] ?? '').padEnd(9, '0');
	return [...fields, ...[0, 3, 6].map(start => Number(fraction.slice(start, start + 3)) * sign)];
}

function getDuration(node, context, visited = new Set()) {
	node = unwrapTypeScriptExpression(node);
	if (!node || visited.has(node)) {
		return;
	}

	visited.add(node);
	if (node.type === 'Identifier') {
		const initializer = getConstVariableInitializer(node, context);
		// Object bindings may have been mutated. Only follow immutable durations and primitive strings.
		if (!initializer || initializer.parent.id.type !== 'Identifier' || unwrapTypeScriptExpression(initializer).type === 'ObjectExpression') {
			return;
		}

		return getDuration(initializer, context, visited);
	}

	if (node.type === 'NewExpression' && isTemporalType(node.callee, 'Duration')) {
		if (node.arguments.some(argument => argument.type === 'SpreadElement')) {
			return;
		}

		return durationFields.map((field, index) => getInteger(getPrimitive(node.arguments[index], context)));
	}

	if (isMethodCall(node, {
		method: 'from', argumentsLength: 1, optionalCall: false, optionalMember: false,
	}) && isTemporalType(node.callee.object, 'Duration')) {
		return getDuration(node.arguments[0], context, visited);
	}

	const properties = getProperties(node);
	if (properties) {
		return durationFields.map(field => getInteger(getPrimitive(properties.get(field)?.value, context)));
	}

	const value = getPrimitive(node, context);
	return typeof value === 'string' ? getStringDuration(value) : undefined;
}

const hasCalendarUnits = fields => fields?.slice(0, 3).some(value => value !== unknown && value !== 0) ?? false;
const getLargestDurationUnit = fields => {
	if (!fields) {
		return unknown;
	}

	for (const [index, value] of fields.entries()) {
		if (value === unknown) {
			return unknown;
		}

		if (value !== 0) {
			return units[index];
		}
	}

	return 'nanosecond';
};

const getOption = (options, name) => options.get(name)?.value;
const normalizeUnit = value => {
	if (value === undefined || value === unknown) {
		return value;
	}

	const name = String(value);
	return durationFields.includes(name) ? name.slice(0, -1) : name;
};

const isCalendarUnit = unit => units.includes(unit) && units.indexOf(unit) < 3;
const largerUnit = (first, second) => first === unknown || second === unknown ? unknown : units[Math.min(units.indexOf(first), units.indexOf(second))];

function getAllowedUnits(type, method) {
	if (type === 'Duration') {
		return units;
	}

	if (type === 'Instant' || type === 'PlainTime') {
		return timeUnits;
	}

	if (method === 'round') {
		return units.slice(3);
	}

	if (type === 'PlainDate') {
		return dateUnits;
	}

	return type === 'PlainYearMonth' ? units.slice(0, 2) : units;
}

function getRoundingIncrement(options) {
	const value = getOption(options, 'roundingIncrement');
	if (value === unknown) {
		return unknown;
	}

	if (value === undefined) {
		return 1;
	}

	return typeof value === 'bigint' || typeof value === 'symbol' ? NaN : Math.trunc(Number(value));
}

function getIndividualOptionProblem(type, method, options) {
	let unitKeys = ['smallestUnit'];
	if (method === 'total') {
		unitKeys = ['unit'];
	} else if (type === 'Duration' || method !== 'round') {
		unitKeys = ['largestUnit', 'smallestUnit'];
	}

	const allowed = getAllowedUnits(type, method);
	for (const key of unitKeys) {
		const unit = normalizeUnit(getOption(options, key));
		if (unit !== undefined && unit !== unknown && !(key === 'largestUnit' && unit === 'auto') && !allowed.includes(unit)) {
			return {messageId: 'invalid-option', option: key};
		}
	}

	if (method === 'total') {
		return;
	}

	const mode = getOption(options, 'roundingMode');
	if (mode !== undefined && mode !== unknown && !roundingModes.has(String(mode))) {
		return {messageId: 'invalid-option', option: 'roundingMode'};
	}

	const increment = getRoundingIncrement(options);
	if (increment !== unknown && (!Number.isFinite(increment) || increment < 1 || increment > 1_000_000_000)) {
		return {messageId: 'invalid-increment', option: 'roundingIncrement'};
	}
}

function getRoundingUnits(type, method, options, fields) {
	let smallest = normalizeUnit(getOption(options, method === 'total' ? 'unit' : 'smallestUnit'));
	let largest = normalizeUnit(getOption(options, 'largestUnit'));
	if (method === 'since' || method === 'until') {
		const [defaultLargest, defaultSmallest] = differenceDefaults.get(type);
		smallest ??= defaultSmallest;
		if (largest === undefined || largest === 'auto') {
			largest = largerUnit(defaultLargest, smallest);
		}
	} else if (type === 'Duration' && method === 'round') {
		smallest ??= 'nanosecond';
		if (largest === undefined || largest === 'auto') {
			largest = largerUnit(getLargestDurationUnit(fields), smallest);
		}
	}

	return {smallest, largest};
}

function isInvalidRoundingIncrement(type, method, increment, {smallest, largest}) {
	if (method === 'total' || smallest === unknown || increment === unknown) {
		return false;
	}

	let maximum = maximumIncrements.get(smallest);
	let inclusive = false;
	if (type === 'Instant' && method === 'round') {
		maximum = instantIncrements.get(smallest);
		inclusive = true;
	} else if (method === 'round' && type !== 'Duration' && smallest === 'day') {
		maximum = 1;
		inclusive = true;
	}

	if (maximum && (increment > maximum || (!inclusive && increment === maximum) || maximum % increment !== 0)) {
		return true;
	}

	return type === 'Duration' && method === 'round' && dateUnits.includes(smallest) && increment > 1 && largest !== unknown && largest !== smallest;
}

function getRequiredUnit(type, method, options) {
	if (method === 'total' && getOption(options, 'unit') === undefined) {
		return '`unit`';
	}

	if (method === 'round' && getOption(options, 'smallestUnit') === undefined) {
		if (type !== 'Duration') {
			return '`smallestUnit`';
		}

		if (getOption(options, 'largestUnit') === undefined) {
			return '`smallestUnit` or `largestUnit`';
		}
	}
}

function getOptionsProblem(node, {type, method, options, fields}) {
	const problem = (messageId, option, extra = {}) => ({
		node: options.get(option)?.node ?? node.callee.property,
		messageId,
		data: {
			type, method, option, ...extra,
		},
	});
	const individualProblem = getIndividualOptionProblem(type, method, options);
	if (individualProblem) {
		return problem(individualProblem.messageId, individualProblem.option);
	}

	const required = getRequiredUnit(type, method, options);
	if (required) {
		return problem('missing-unit', undefined, {required});
	}

	const selectedUnits = getRoundingUnits(type, method, options, fields);
	const {smallest, largest} = selectedUnits;
	const isDurationRound = type === 'Duration' && method === 'round';
	const isDifference = method === 'since' || method === 'until';
	if ((isDifference || isDurationRound) && largest !== unknown && smallest !== unknown && units.indexOf(largest) > units.indexOf(smallest)) {
		return problem('unit-order', 'largestUnit');
	}

	if (isInvalidRoundingIncrement(type, method, getRoundingIncrement(options), selectedUnits)) {
		return problem('invalid-increment', 'roundingIncrement');
	}

	if (type === 'Duration' && getOption(options, 'relativeTo') === undefined && (hasCalendarUnits(fields) || isCalendarUnit(smallest) || (isDurationRound && isCalendarUnit(largest)))) {
		return problem('relative-to', 'relativeTo');
	}
}

function getUnitKeySuggestion(node, operation) {
	const {method, options} = operation;
	const expected = method === 'total' ? 'unit' : 'smallestUnit';
	const actual = method === 'total' ? 'smallestUnit' : 'unit';
	const property = options.get(actual)?.property;
	if (!property || options.has(expected)) {
		return;
	}

	const corrected = new Map(options);
	corrected.set(expected, options.get(actual));
	if (getOption(corrected, expected) === unknown || getOption(corrected, expected) === undefined || getOptionsProblem(node, {...operation, options: corrected})) {
		return;
	}

	return {messageId: 'correct-unit-key', data: {expected, actual}, fix: fixer => fixer.replaceText(property.key, property.shorthand ? `${expected}: ${actual}` : expected)};
}

function getElapsedDaysSuggestion(argument, context) {
	argument = unwrapTypeScriptExpression(argument);
	const properties = getProperties(argument);
	const property = properties?.get('days');
	const days = getInteger(getPrimitive(property?.value, context));
	if (!property || argument.properties.length !== 1 || days === unknown || days === 0 || !Number.isSafeInteger(days * 24) || context.sourceCode.getCommentsInside(property.value).length > 0) {
		return;
	}

	return {
		messageId: 'elapsed-days',
		* fix(fixer) {
			if (property.shorthand) {
				yield fixer.replaceText(property, `hours: ${days * 24}`);
			} else {
				yield fixer.replaceText(property.key, 'hours');
				yield fixer.replaceText(property.value, String(days * 24));
			}
		},
	};
}

function getCalendarAdditionProblem(node, type, method, context) {
	if (type === 'PlainTime') {
		return;
	}

	const options = getOptions(node.arguments[1], undefined, context);
	const overflow = options && getOption(options, 'overflow');
	if (overflow !== undefined && overflow !== unknown && !['constrain', 'reject'].includes(String(overflow))) {
		return {node: options.get('overflow').node, messageId: 'invalid-option', data: {type, method, option: 'overflow'}};
	}

	if (type !== 'PlainYearMonth') {
		return;
	}

	const argument = getDuration(node.arguments[0], context);
	const forbiddenIndex = argument?.findIndex((value, index) => index >= 2 && value !== unknown && value !== 0) ?? -1;
	if (forbiddenIndex !== -1) {
		return {
			node: getProperties(node.arguments[0])?.get(durationFields[forbiddenIndex])?.value ?? node.arguments[0],
			messageId: 'year-month-unit',
			data: {method},
		};
	}
}

function getAdditionProblem(node, type, method, context) {
	if (node.arguments.length === 0) {
		return;
	}

	if (type === 'Instant' || type === 'Duration') {
		const argument = getDuration(node.arguments[0], context);
		const fields = type === 'Duration' ? getDuration(node.callee.object, context) : undefined;
		const forbiddenIndex = argument?.slice(0, type === 'Instant' ? 4 : 3).findIndex(value => value !== unknown && value !== 0) ?? -1;
		if (forbiddenIndex === -1 && !hasCalendarUnits(fields)) {
			return;
		}

		const argumentNode = getProperties(node.arguments[0])?.get(durationFields[forbiddenIndex])?.value ?? node.arguments[0];
		const problem = {
			node: forbiddenIndex === -1 ? node.callee.property : argumentNode,
			messageId: type === 'Instant' ? 'instant-calendar-unit' : 'duration-calendar-unit',
			data: {method},
		};
		const suggestion = type === 'Instant' ? getElapsedDaysSuggestion(node.arguments[0], context) : undefined;
		if (suggestion) {
			problem.suggest = [suggestion];
		}

		return problem;
	}

	return getCalendarAdditionProblem(node, type, method, context);
}

function getArithmeticProblem(node, type, method, context) {
	if (method === 'add' || method === 'subtract') {
		return getAdditionProblem(node, type, method, context);
	}

	const isDifference = method === 'since' || method === 'until';
	const shorthand = method === 'total' ? 'unit' : 'smallestUnit';
	const options = getOptions(node.arguments[isDifference ? 1 : 0], isDifference ? undefined : shorthand, context);
	if (!options) {
		return;
	}

	const fields = type === 'Duration' ? getDuration(node.callee.object, context) : undefined;
	const operation = {
		type, method, options, fields,
	};
	const problem = getOptionsProblem(node, operation);
	if (problem?.messageId === 'missing-unit') {
		const suggestion = getUnitKeySuggestion(node, operation);
		if (suggestion) {
			problem.suggest = [suggestion];
		}
	}

	return problem;
}

function getCompareProblem(node, context) {
	if (node.arguments.length < 2) {
		return;
	}

	const options = getOptions(node.arguments[2], undefined, context);
	if (!options || getOption(options, 'relativeTo') !== undefined) {
		return;
	}

	const first = getDuration(node.arguments[0], context);
	const second = getDuration(node.arguments[1], context);
	if (!first || !second || first.includes(unknown) || second.includes(unknown)) {
		return;
	}

	if (first.some((value, index) => value !== second[index]) && (hasCalendarUnits(first) || hasCalendarUnits(second))) {
		return {node: options.get('relativeTo')?.node ?? node.callee.property, messageId: 'relative-to', data: {method: 'compare'}};
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('CallExpression', node => {
		if (!isMethodCall(node) || node.arguments.some(argument => argument.type === 'SpreadElement')) {
			return;
		}

		const method = getPropertyName(node.callee);
		if (method === 'compare' && isTemporalType(node.callee.object, 'Duration')) {
			return getCompareProblem(node, context);
		}

		if (!arithmeticMethods.has(method)) {
			return;
		}

		for (const [type, isReceiver] of receiverCheckers) {
			if (!methodsByType.get(type).has(method)) {
				continue;
			}

			if (isReceiver(node.callee.object, context)) {
				return getArithmeticProblem(node, type, method, context);
			}
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {description: 'Disallow statically known invalid Temporal arithmetic.', recommended: 'unopinionated'},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};
export default config;
