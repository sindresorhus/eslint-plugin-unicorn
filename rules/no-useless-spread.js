import {isCommaToken} from '@eslint-community/eslint-utils';
import typedArray from './shared/typed-array.js';
import {removeParentheses, fixSpaceAroundKeyword, addParenthesesToReturnOrThrowExpression} from './fix/index.js';
import {
	isArray,
	isKnownNonArray,
	isParenthesized,
	isOnSameLine,
	getParenthesizedText,
} from './utils/index.js';
import {
	isNewExpression,
	isMethodCall,
	isCallOrNewExpression,
	isEmptyArrayExpression,
	isEmptyObjectExpression,
} from './ast/index.js';

const SPREAD_IN_LIST = 'spread-in-list';
const ITERABLE_TO_ARRAY = 'iterable-to-array';
const ITERABLE_TO_ARRAY_IN_FOR_OF = 'iterable-to-array-in-for-of';
const ITERABLE_TO_ARRAY_IN_YIELD_STAR = 'iterable-to-array-in-yield-star';
const SPREAD_IN_COLLECTION_CONSTRUCTOR = 'spread-in-collection-constructor';
const SPREAD_IN_OBJECT_ASSIGN = 'spread-in-object-assign';
const CLONE_ARRAY = 'clone-array';
const SUGGESTION_REMOVE_OBJECT_ASSIGN_SPREAD = 'suggestion/remove-object-assign-spread';
const messages = {
	[SPREAD_IN_LIST]: 'Spread an {{argumentType}} literal in {{parentDescription}} is unnecessary.',
	[ITERABLE_TO_ARRAY]: '`{{parentDescription}}` accepts an iterable as an argument, it\'s unnecessary to convert to an array.',
	[ITERABLE_TO_ARRAY_IN_FOR_OF]: '`for…of` can iterate over an iterable, it\'s unnecessary to convert to an array.',
	[ITERABLE_TO_ARRAY_IN_YIELD_STAR]: '`yield*` can delegate to an iterable, it\'s unnecessary to convert to an array.',
	[SPREAD_IN_COLLECTION_CONSTRUCTOR]: '`{{constructorName}}` accepts a single iterable argument, spreading is misleading.',
	[SPREAD_IN_OBJECT_ASSIGN]: '`Object.assign(…)` source object with only spread properties is unnecessary.',
	[CLONE_ARRAY]: 'Unnecessarily cloning an array.',
	[SUGGESTION_REMOVE_OBJECT_ASSIGN_SPREAD]: 'Remove the object literal wrapper.',
};

const collectionConstructors = ['Map', 'WeakMap', 'Set', 'WeakSet'];
const arrayCloneMethodNames = [
	'copyWithin',
	'flat',
	'slice',
	'splice',
	'toReversed',
	'toSorted',
	'toSpliced',
	'with',
];
const typeCheckedArrayReturningMethodNames = [
	...arrayCloneMethodNames,
	'filter',
	'flatMap',
	'map',
];

const isSingleArraySpread = node =>
	node.type === 'ArrayExpression'
	&& node.elements.length === 1
	&& node.elements[0]?.type === 'SpreadElement';

const isObjectExpressionWithOnlySpreadProperties = node =>
	node.type === 'ObjectExpression'
	&& node.properties.length > 0
	&& node.properties.every(property =>
		property.type === 'SpreadElement'
		&& property.argument.type !== 'ObjectExpression');

const getObjectAssignReplacementText = (objectExpression, context) =>
	objectExpression.properties
		.map(property => getParenthesizedText(property.argument, context))
		.join(', ');

const parentDescriptions = {
	ArrayExpression: 'array literal',
	ObjectExpression: 'object literal',
	CallExpression: 'arguments',
	NewExpression: 'arguments',
};

function getCommaTokens(arrayExpression, sourceCode) {
	let startToken = sourceCode.getFirstToken(arrayExpression);

	return arrayExpression.elements.map((element, index, elements) => {
		if (index === elements.length - 1) {
			const penultimateToken = sourceCode.getLastToken(arrayExpression, {skip: 1});
			if (isCommaToken(penultimateToken)) {
				return penultimateToken;
			}

			return;
		}

		const commaToken = sourceCode.getTokenAfter(element || startToken, isCommaToken);
		startToken = commaToken;
		return commaToken;
	});
}

function * unwrapSingleArraySpread(fixer, arrayExpression, context) {
	const {sourceCode} = context;
	const [
		openingBracketToken,
		spreadToken,
		thirdToken,
	] = sourceCode.getFirstTokens(arrayExpression, 3);

	// `[...value]`
	//  ^
	yield fixer.remove(openingBracketToken);

	// `[...value]`
	//   ^^^
	yield fixer.remove(spreadToken);

	const [
		commaToken,
		closingBracketToken,
	] = sourceCode.getLastTokens(arrayExpression, 2);

	// `[...value]`
	//           ^
	yield fixer.remove(closingBracketToken);

	// `[...value,]`
	//           ^
	if (isCommaToken(commaToken)) {
		yield fixer.remove(commaToken);
	}

	/*
	```js
	function foo() {
		return [
			...value,
		];
	}
	```
	*/
	const {parent} = arrayExpression;
	if (
		(parent.type === 'ReturnStatement' || parent.type === 'ThrowStatement')
		&& parent.argument === arrayExpression
		&& !isOnSameLine(openingBracketToken, thirdToken, context)
		&& !isParenthesized(arrayExpression, context)
	) {
		yield addParenthesesToReturnOrThrowExpression(fixer, parent, context);
		return;
	}

	yield fixSpaceAroundKeyword(fixer, arrayExpression, context);
}

const isKnownNonArrayMethodReceiver = (node, context) =>
	node.type === 'CallExpression'
	&& node.callee.type === 'MemberExpression'
	&& isKnownNonArray(node.callee.object, context);

const isSliceCall = node =>
	isMethodCall(node, {
		method: 'slice',
		optionalCall: false,
		optionalMember: false,
	});

const isKnownArrayMethodClone = (node, context) => {
	if (!isMethodCall(node, {
		methods: typeCheckedArrayReturningMethodNames,
		optionalCall: false,
		optionalMember: false,
	})) {
		return false;
	}

	return isArray(node.callee.object, context) && isArray(node, context);
};

const isHeuristicArrayClone = (node, context) => {
	if (isKnownNonArray(node, context)) {
		return false;
	}

	if (
		isMethodCall(node, {
			methods: arrayCloneMethodNames,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return !isKnownNonArrayMethodReceiver(node, context);
	}

	if (
		isMethodCall(node, {
			method: 'concat',
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return !(
			(node.callee.object.type === 'Identifier' && node.callee.object.name === 'Iterator')
			|| isKnownNonArrayMethodReceiver(node, context)
		);
	}

	return (
		// `String#split()`
		isMethodCall(node, {
			method: 'split',
			optionalCall: false,
			optionalMember: false,
		})
		// `Object.keys()` and `Object.values()`
		|| isMethodCall(node, {
			object: 'Object',
			methods: ['keys', 'values'],
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
		// `await Promise.all()` and `await Promise.allSettled()`
		|| (
			node.type === 'AwaitExpression'
			&& isMethodCall(node.argument, {
				object: 'Promise',
				methods: ['all', 'allSettled'],
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
		)
		// `Array.from()`, `Array.of()`
		|| isMethodCall(node, {
			object: 'Array',
			methods: ['from', 'of'],
			optionalCall: false,
			optionalMember: false,
		})
		// `new Array()`
		|| isNewExpression(node, {name: 'Array'})
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	// Useless spread in list
	context.on(['ArrayExpression', 'ObjectExpression'], node => {
		if (!(
			node.parent.type === 'SpreadElement'
			&& node.parent.argument === node
			&& (
				(
					node.type === 'ObjectExpression'
					&& node.parent.parent.type === 'ObjectExpression'
					&& node.parent.parent.properties.includes(node.parent)
				)
				|| (
					node.type === 'ArrayExpression'
					&& (
						(
							node.parent.parent.type === 'ArrayExpression'
							&& node.parent.parent.elements.includes(node.parent)
						)
						|| (
							isCallOrNewExpression(node.parent.parent)
							&& node.parent.parent.arguments.includes(node.parent)
						)
					)
				)
			)
		)) {
			return;
		}

		const spreadObject = node;
		const spreadElement = spreadObject.parent;
		const spreadToken = sourceCode.getFirstToken(spreadElement);
		const parentType = spreadElement.parent.type;

		const problem = {
			node: spreadToken,
			messageId: SPREAD_IN_LIST,
			data: {
				argumentType: spreadObject.type === 'ArrayExpression' ? 'array' : 'object',
				parentDescription: parentDescriptions[parentType],
			},
		};

		if (
			parentType === 'NewExpression'
			&& isSingleArraySpread(spreadObject)
			&& isNewExpression(spreadElement.parent, {
				names: collectionConstructors,
				argumentsLength: 1,
				allowSpreadElement: true,
			})
		) {
			return problem;
		}

		return {
			...problem,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				// `[...[foo]]`
				//   ^^^
				yield fixer.remove(spreadToken);

				// `[...(( [foo] ))]`
				//      ^^       ^^
				yield removeParentheses(spreadObject, fixer, context);

				// `[...[foo]]`
				//      ^
				const firstToken = sourceCode.getFirstToken(spreadObject);
				yield fixer.remove(firstToken);

				const [
					penultimateToken,
					lastToken,
				] = sourceCode.getLastTokens(spreadObject, 2);

				// `[...[foo]]`
				//          ^
				yield fixer.remove(lastToken);

				// `[...[foo,]]`
				//          ^
				if (isCommaToken(penultimateToken)) {
					yield fixer.remove(penultimateToken);
				}

				// `[...[], 1]`
				//        ^
				if (isEmptyArrayExpression(node) || isEmptyObjectExpression(node)) {
					const nextToken = sourceCode.getTokenAfter(spreadElement);
					if (isCommaToken(nextToken)) {
						yield fixer.remove(nextToken);
					}
				}

				if (parentType !== 'CallExpression' && parentType !== 'NewExpression') {
					return;
				}

				const commaTokens = getCommaTokens(spreadObject, sourceCode);
				for (const [index, commaToken] of commaTokens.entries()) {
					if (spreadObject.elements[index] !== null) {
						continue;
					}

					// `call(...[foo, , bar])`
					//               ^ Replace holes with `undefined`
					yield fixer.insertTextBefore(commaToken, 'undefined');
				}
			},
		};
	});

	// Object.assign() source object spread
	context.on('ObjectExpression', objectExpression => {
		if (!isObjectExpressionWithOnlySpreadProperties(objectExpression)) {
			return;
		}

		const callExpression = objectExpression.parent;
		if (!isMethodCall(callExpression, {
			object: 'Object',
			method: 'assign',
			minimumArguments: 2,
			optionalMember: false,
			optionalCall: false,
		})) {
			return;
		}

		const argumentIndex = callExpression.arguments.indexOf(objectExpression);
		const hasGuaranteedTarget = callExpression.arguments
			.slice(0, argumentIndex)
			.some(argument => argument.type !== 'SpreadElement');
		if (
			argumentIndex <= 0
			|| !hasGuaranteedTarget
		) {
			return;
		}

		const problem = {
			node: sourceCode.getFirstToken(objectExpression.properties[0]),
			messageId: SPREAD_IN_OBJECT_ASSIGN,
		};

		if (sourceCode.getCommentsInside(objectExpression).length > 0) {
			return problem;
		}

		return {
			...problem,
			suggest: [
				{
					messageId: SUGGESTION_REMOVE_OBJECT_ASSIGN_SPREAD,
					fix: fixer => fixer.replaceText(objectExpression, getObjectAssignReplacementText(objectExpression, context)),
				},
			],
		};
	});

	// Spread in collection constructor
	context.on('NewExpression', node => {
		if (
			!isNewExpression(node, {
				names: collectionConstructors,
				argumentsLength: 1,
				allowSpreadElement: true,
			})
			|| node.arguments[0].type !== 'SpreadElement'
			|| node.arguments[0].argument.type === 'ArrayExpression'
		) {
			return;
		}

		return {
			node: node.arguments[0],
			messageId: SPREAD_IN_COLLECTION_CONSTRUCTOR,
			data: {constructorName: `new ${node.callee.name}(…)`},
		};
	});

	// Useless iterable to array
	context.on('ArrayExpression', arrayExpression => {
		if (!isSingleArraySpread(arrayExpression)) {
			return;
		}

		const {parent} = arrayExpression;
		if (!(
			(parent.type === 'ForOfStatement' && parent.right === arrayExpression)
			|| (parent.type === 'YieldExpression' && parent.delegate && parent.argument === arrayExpression)
			|| (
				(
					isNewExpression(parent, {names: collectionConstructors, argumentsLength: 1})
					|| isNewExpression(parent, {names: typedArray, minimumArguments: 1})
					|| isMethodCall(parent, {
						object: 'Promise',
						methods: ['all', 'allSettled', 'any', 'race'],
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					|| isMethodCall(parent, {
						objects: ['Array', ...typedArray],
						method: 'from',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
					|| isMethodCall(parent, {
						object: 'Object',
						method: 'fromEntries',
						argumentsLength: 1,
						optionalCall: false,
						optionalMember: false,
					})
				)
				&& parent.arguments[0] === arrayExpression
			)
		)) {
			return;
		}

		let parentDescription = '';
		let messageId = ITERABLE_TO_ARRAY;
		switch (parent.type) {
			case 'ForOfStatement': {
				messageId = ITERABLE_TO_ARRAY_IN_FOR_OF;
				break;
			}

			case 'YieldExpression': {
				messageId = ITERABLE_TO_ARRAY_IN_YIELD_STAR;
				break;
			}

			case 'NewExpression': {
				parentDescription = `new ${parent.callee.name}(…)`;
				break;
			}

			case 'CallExpression': {
				parentDescription = `${parent.callee.object.name}.${parent.callee.property.name}(…)`;
				break;
			}
			// No default
		}

		return {
			node: arrayExpression,
			messageId,
			data: {parentDescription},
			fix: fixer => unwrapSingleArraySpread(fixer, arrayExpression, context),
		};
	});

	// Useless array clone
	context.on('ArrayExpression', arrayExpression => {
		if (!isSingleArraySpread(arrayExpression)) {
			return;
		}

		const node = arrayExpression.elements[0].argument;
		const knownArrayClone = isKnownArrayMethodClone(node, context);
		if (!knownArrayClone && !isHeuristicArrayClone(node, context)) {
			return;
		}

		const problem = {
			node: arrayExpression,
			messageId: CLONE_ARRAY,
		};

		if (
			// `[...new Array(1)]` -> `new Array(1)` is not safe to fix since there are holes
			isNewExpression(node, {name: 'Array'})
			// `[...foo.slice(1)]` -> `foo.slice(1)` is not safe to fix unless `foo` is known to be an array
			|| (isSliceCall(node) && !knownArrayClone)
		) {
			return problem;
		}

		return Object.assign(problem, {
			fix: fixer => unwrapSingleArraySpread(fixer, arrayExpression, context),
		});
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unnecessary spread.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
