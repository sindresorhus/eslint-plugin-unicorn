import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	isMap,
	isSet,
	isWeakMap,
	isWeakSet,
	isLeftHandSide,
	getParenthesizedText,
	getStaticValueIfNoSideEffects,
	unwrapTypeScriptExpression,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID_READ = 'no-collection-bracket-access/read';
const MESSAGE_ID_WRITE = 'no-collection-bracket-access/write';
const MESSAGE_ID_DELETE = 'no-collection-bracket-access/delete';
const MESSAGE_ID_SUGGESTION_SET = 'no-collection-bracket-access/suggestion-set';
const MESSAGE_ID_SUGGESTION_DELETE = 'no-collection-bracket-access/suggestion-delete';
const messages = {
	[MESSAGE_ID_READ]: 'Do not read from a `{{type}}` using bracket notation.',
	[MESSAGE_ID_WRITE]: 'Do not write to a `{{type}}` using bracket notation.',
	[MESSAGE_ID_DELETE]: 'Do not delete from a `{{type}}` using bracket notation.',
	[MESSAGE_ID_SUGGESTION_SET]: 'Switch to `{{type}}#set()`.',
	[MESSAGE_ID_SUGGESTION_DELETE]: 'Switch to `{{type}}#delete()`.',
};

const collectionTypes = [
	{
		name: 'Map',
		is: isMap,
		prototype: Map.prototype,
		hasSetMethod: true,
	},
	{
		name: 'WeakMap',
		is: isWeakMap,
		prototype: WeakMap.prototype,
		hasSetMethod: true,
	},
	{
		name: 'Set',
		is: isSet,
		prototype: Set.prototype,
		hasSetMethod: false,
	},
	{
		name: 'WeakSet',
		is: isWeakSet,
		prototype: WeakSet.prototype,
		hasSetMethod: false,
	},
];

// Only `Identifier`/`ThisExpression`/`MemberExpression` receivers can be placed before
// `.method(…)` without parentheses, so suggestions are limited to them.
const simpleObjectTypes = new Set(['Identifier', 'ThisExpression', 'MemberExpression']);
const skipPropertyCheck = Symbol('skipPropertyCheck');

function getStaticPropertyValues(node, context) {
	node = unwrapTypeScriptExpression(node);
	const {sourceCode} = context;
	const isBranch = node.type === 'ConditionalExpression' || node.type === 'LogicalExpression';
	if (
		(isBranch || node.type === 'SequenceExpression')
		&& hasSideEffect(node, sourceCode, {considerGetters: true})
	) {
		// Do not report when the key depends on a mutable member, getter, or side effect. The static value is unreliable, and resolving it would require flow analysis.
		return skipPropertyCheck;
	}

	const staticResult = getStaticValueIfNoSideEffects(node, context);
	if (staticResult) {
		return [staticResult.value];
	}

	// `hasSideEffect` conservatively treats member reads as getter-backed. Keep allowing
	// the well-known `Symbol` properties that ESLint can evaluate without executing user code.
	if (
		node.type === 'MemberExpression'
		&& node.object.type === 'Identifier'
		&& node.object.name === 'Symbol'
		&& (
			(!node.computed && node.property.type === 'Identifier')
			|| (node.computed && node.property.type === 'Literal')
		)
	) {
		const staticResult = getStaticValue(node, sourceCode.getScope(node));
		if (staticResult) {
			return [staticResult.value];
		}
	}

	if (!isBranch) {
		return;
	}

	const childNodes = node.type === 'ConditionalExpression'
		? [node.consequent, node.alternate]
		: [node.left, node.right];
	const propertyValues = childNodes.map(child => getStaticPropertyValues(child, context));
	if (propertyValues.includes(skipPropertyCheck)) {
		return skipPropertyCheck;
	}

	if (propertyValues.some(values => !values)) {
		return;
	}

	return propertyValues.flat();
}

function getProblem(node, collection, context) {
	const {sourceCode} = context;
	const {name: type} = collection;

	// An optional access (`map?.['foo']`) wraps the member in a `ChainExpression`.
	const outerNode = node.parent.type === 'ChainExpression' ? node.parent : node;
	const {parent} = outerNode;
	const object = getParenthesizedText(node.object, context);
	const key = getParenthesizedText(node.property, context);

	let messageId = MESSAGE_ID_READ;
	let suggestionMessageId;
	let replacement;
	if (
		parent.type === 'UnaryExpression'
		&& parent.operator === 'delete'
		&& parent.argument === outerNode
	) {
		messageId = MESSAGE_ID_DELETE;
		suggestionMessageId = MESSAGE_ID_SUGGESTION_DELETE;
		replacement = `${object}.delete(${key})`;
	} else if (
		isLeftHandSide(node)
		|| (
			(parent.type === 'ForOfStatement' || parent.type === 'ForInStatement')
			&& parent.left === outerNode
		)
	) {
		messageId = MESSAGE_ID_WRITE;
		if (
			collection.hasSetMethod
			&& parent.type === 'AssignmentExpression'
			&& parent.operator === '='
			&& parent.left === node
		) {
			suggestionMessageId = MESSAGE_ID_SUGGESTION_SET;
			replacement = `${object}.set(${key}, ${getParenthesizedText(parent.right, context)})`;
		}
	}

	const problem = {node, messageId, data: {type}};

	// Only suggest for the simple, statement-level case, to avoid changing the value of the
	// surrounding expression, dropping comments, or needing to parenthesize the receiver.
	if (
		suggestionMessageId
		&& !node.optional
		&& simpleObjectTypes.has(node.object.type)
		&& parent.parent.type === 'ExpressionStatement'
		&& sourceCode.getCommentsInside(parent).length === 0
	) {
		problem.suggest = [
			{
				messageId: suggestionMessageId,
				data: {type},
				fix: fixer => fixer.replaceText(parent, replacement),
			},
		];
	}

	return problem;
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		if (!node.computed) {
			return;
		}

		const collection = collectionTypes.find(({is}) => is(node.object, context));
		if (!collection) {
			return;
		}

		// Allow accessing a real member, including `Symbol` ones like `map[Symbol.iterator]`.
		const staticPropertyValues = getStaticPropertyValues(node.property, context);
		if (staticPropertyValues === skipPropertyCheck) {
			return;
		}

		if (
			staticPropertyValues?.every(value =>
				(typeof value === 'string' || typeof value === 'symbol')
				&& Reflect.has(collection.prototype, value),
			)
		) {
			return;
		}

		return getProblem(node, collection, context);
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow accessing `Map`, `Set`, `WeakMap`, and `WeakSet` entries with bracket notation.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
