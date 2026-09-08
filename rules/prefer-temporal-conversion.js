import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isMemberExpression, isMethodCall} from './ast/index.js';
import {
	getParenthesizedText,
	isParenthesized,
	isSameReference,
	needsSemicolon,
	shouldAddParenthesesToMemberExpressionObject,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {createTypeCheckers} from './utils/type-helpers.js';

const MESSAGE_ID = 'prefer-temporal-conversion';
const MESSAGE_ID_SUGGESTION = 'prefer-temporal-conversion/suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `.{{method}}()` over reconstructing `Temporal.{{target}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace with `.{{method}}()`.',
};
const dateFields = ['year', 'month', 'day'];
const timeFields = ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'];

const isProperty = (node, property) => isMemberExpression(unwrapTypeScriptExpression(node), {property, computed: false, optional: false});
const isTemporalType = (node, name) => isMemberExpression(node, {object: 'Temporal', property: name, optional: false});

function isTemporalSource(node, name) {
	if (node.type === 'NewExpression') {
		return isTemporalType(node.callee, name);
	}

	if (isMethodCall(node, {
		method: 'from', minimumArguments: 1, maximumArguments: 2, optionalCall: false, optionalMember: false,
	})) {
		return isTemporalType(node.callee.object, name);
	}

	return isMethodCall(node, {
		method: name === 'ZonedDateTime' ? 'zonedDateTimeISO' : 'plainDateTimeISO',
		maximumArguments: 1,
		optionalCall: false,
		optionalMember: false,
	}) && isTemporalType(node.callee.object, 'Now');
}

const conversions = new Map([
	['Instant', {sources: ['ZonedDateTime'], fields: []}],
	['PlainDateTime', {sources: ['ZonedDateTime'], fields: [...dateFields, ...timeFields]}],
	['PlainDate', {sources: ['ZonedDateTime', 'PlainDateTime'], fields: dateFields}],
	['PlainTime', {sources: ['ZonedDateTime', 'PlainDateTime'], fields: timeFields}],
].map(([name, {sources, fields}]) => {
	const {isTarget: isSource} = createTypeCheckers({
		targetTypeNames: new Set(sources.map(name => `Temporal.${name}`)),
		checkClassHeritage: false,
		isTargetNode: node => sources.some(name => isTemporalSource(node, name)),
		isTargetType(type, checker) {
			const symbol = type.getSymbol();
			if (!symbol) {
				return false;
			}

			const qualifiedName = checker.getFullyQualifiedName(symbol);
			return sources.some(name => qualifiedName === `Temporal.${name}` || qualifiedName.endsWith(`.Temporal.${name}`));
		},
	});
	return [name, {fields, isSource}];
}));

function getFieldEntries(node, fields) {
	if (node.type === 'NewExpression') {
		return node.arguments.map((value, index) => [fields[index] ?? 'calendar', value]);
	}

	const argument = unwrapTypeScriptExpression(node.arguments[0]);
	if (argument.type !== 'ObjectExpression') {
		return;
	}

	const entries = [];
	for (const property of argument.properties) {
		if (property.type !== 'Property' || property.computed || property.method || property.kind !== 'init') {
			return;
		}

		entries.push([property.key.name ?? property.key.value, property.value]);
	}

	return entries;
}

function getFieldReconstruction(node, fields, context) {
	const entries = getFieldEntries(node, fields);
	if (!entries) {
		return;
	}

	const hasDate = fields.includes('year');
	const isConstructor = node.type === 'NewExpression';
	const hasCalendar = entries.some(([name]) => name === 'calendar');
	const remainingFields = new Set(fields);
	if (hasDate && hasCalendar) {
		remainingFields.add('calendar');
	}

	let source;
	for (const [name, value] of entries) {
		if (
			!remainingFields.delete(name === 'monthCode' ? 'month' : name)
			|| !isProperty(value, name === 'calendar' ? 'calendarId' : name)
		) {
			return;
		}

		const receiver = unwrapTypeScriptExpression(value).object;
		if (hasSideEffect(receiver, context.sourceCode) || (source && !isSameReference(source, receiver))) {
			return;
		}

		source ??= receiver;
	}

	if (remainingFields.size > 0) {
		return;
	}

	return {source, canAutofix: !hasDate || (!isConstructor && hasCalendar)};
}

function getReconstruction(node, target, fields, context) {
	const [argument] = node.arguments;
	if (node.type === 'CallExpression' && node.callee.property.name === 'from' && isMethodCall(unwrapTypeScriptExpression(argument), {
		methods: ['toString', 'toJSON'], argumentsLength: 0, optionalCall: false, optionalMember: false,
	})) {
		return {source: unwrapTypeScriptExpression(argument).callee.object, canAutofix: target !== 'Instant'};
	}

	if (target !== 'Instant') {
		return getFieldReconstruction(node, fields, context);
	}

	const isMilliseconds = node.type === 'CallExpression' && node.callee.property.name === 'fromEpochMilliseconds';
	if (!isProperty(argument, isMilliseconds ? 'epochMilliseconds' : 'epochNanoseconds')) {
		return;
	}

	// `Instant.from()` does not accept epoch counts.
	if (node.type === 'CallExpression' && node.callee.property.name === 'from') {
		return;
	}

	return {source: unwrapTypeScriptExpression(argument).object, canAutofix: !isMilliseconds};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const getProblem = node => {
		let constructor;
		if (node.type === 'NewExpression') {
			constructor = node.callee;
		} else if (isMethodCall(node, {
			methods: ['from', 'fromEpochMilliseconds', 'fromEpochNanoseconds'], argumentsLength: 1, optionalCall: false, optionalMember: false,
		})) {
			constructor = node.callee.object;
		} else {
			return;
		}

		if (!isMemberExpression(constructor, {object: 'Temporal', computed: false, optional: false})) {
			return;
		}

		const target = constructor.property.name;
		const conversion = conversions.get(target);
		if (
			!conversion
			|| node.arguments.length === 0
			|| node.arguments.some(argument => argument.type === 'SpreadElement')
			|| (target === 'Instant' && node.arguments.length !== 1)
			|| (target !== 'Instant' && node.type === 'CallExpression' && node.callee.property.name !== 'from')
		) {
			return;
		}

		const reconstruction = getReconstruction(node, target, conversion.fields, context);
		if (!reconstruction || !conversion.isSource(reconstruction.source, context)) {
			return;
		}

		const {source, canAutofix} = reconstruction;
		const method = `to${target}`;
		const problem = {node, messageId: MESSAGE_ID, data: {method, target}};
		if (sourceCode.getCommentsInside(node).length > 0) {
			return problem;
		}

		const fix = fixer => {
			let text = getParenthesizedText(source, context);
			if (shouldAddParenthesesToMemberExpressionObject(source, context) && !isParenthesized(source, context)) {
				text = `(${text})`;
			}

			text += `.${method}()`;
			if (needsSemicolon(sourceCode.getTokenBefore(node), context, text)) {
				text = `;${text}`;
			}

			return fixer.replaceText(node, text);
		};

		if (canAutofix) {
			problem.fix = fix;
		} else {
			problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, data: {method}, fix}];
		}

		return problem;
	};

	context.on('CallExpression', getProblem);
	context.on('NewExpression', getProblem);
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer direct Temporal conversion methods over reconstruction.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
