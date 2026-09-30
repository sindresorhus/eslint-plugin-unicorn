import {isParenthesized, findVariable} from '@eslint-community/eslint-utils';
import {
	extendFixRange,
	removeMemberExpressionProperty,
	removeMethodCall,
	renameVariable,
} from './fix/index.js';
import {
	isLeftHandSide,
	singular,
	getParenthesizedRange,
	getScopes,
	getAvailableVariableName,
	getVariableIdentifiers,
	hasCommentInRange,
	isKnownNonIndexedCollection,
} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const ERROR_ZERO_INDEX = 'error-zero-index';
const ERROR_SHIFT = 'error-shift';
const ERROR_POP = 'error-pop';
const ERROR_AT_ZERO = 'error-at-zero';
const ERROR_AT_MINUS_ONE = 'error-at-minus-one';
const ERROR_SLICE_MINUS_ONE = 'error-slice-minus-one';
const ERROR_DESTRUCTURING_DECLARATION = 'error-destructuring-declaration';
const ERROR_DESTRUCTURING_ASSIGNMENT = 'error-destructuring-assignment';
const ERROR_DECLARATION = 'error-variable';
const messages = {
	[ERROR_DECLARATION]: 'Prefer `.find(…)` over `.filter(…)`.',
	[ERROR_ZERO_INDEX]: 'Prefer `.find(…)` over `.filter(…)[0]`.',
	[ERROR_AT_ZERO]: 'Prefer `.find(…)` over `.filter(…).at(0)`.',
	[ERROR_SHIFT]: 'Prefer `.find(…)` over `.filter(…).shift()`.',
	[ERROR_POP]: 'Prefer `.findLast(…)` over `.filter(…).pop()`.',
	[ERROR_AT_MINUS_ONE]: 'Prefer `.findLast(…)` over `.filter(…).at(-1)`.',
	[ERROR_SLICE_MINUS_ONE]: 'Prefer `.findLast(…)` over `.filter(…).slice(-1)`.',
	[ERROR_DESTRUCTURING_DECLARATION]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
	// Same message as `ERROR_DESTRUCTURING_DECLARATION`, but different case
	[ERROR_DESTRUCTURING_ASSIGNMENT]: 'Prefer `.find(…)` over destructuring `.filter(…)`.',
};

// `array.filter(…)`, ignoring receivers known to be neither an array nor a typed array
const isArrayFilterCall = (node, context, options) => isMethodCall(node, {
	method: 'filter',
	minimumArguments: 1,
	maximumArguments: 2,
	optionalCall: false,
	...options,
}) && !isKnownNonIndexedCollection(node.callee.object, context);

// `-1`
const isNegativeOneLiteral = node =>
	node.type === 'UnaryExpression'
	&& node.operator === '-'
	&& node.prefix
	&& node.argument.type === 'Literal'
	&& node.argument.raw === '1';

// `array.filter(…).slice(-1)`
const isArrayFilterSliceLastCall = (node, context) => isMethodCall(node, {
	method: 'slice',
	argumentsLength: 1,
	optionalCall: false,
	optionalMember: false,
}) && isNegativeOneLiteral(node.arguments[0]) && isArrayFilterCall(node.callee.object, context);

// Need add `()` to the `AssignmentExpression`
// - `ObjectExpression`: `[{foo}] = array.filter(bar)` fix to `{foo} = array.find(bar)`
// - `ObjectPattern`: `[{foo = baz}] = array.filter(bar)`
const assignmentNeedParenthesize = (node, sourceCode) => {
	const isAssign = node.type === 'AssignmentExpression';

	if (!isAssign || isParenthesized(node, sourceCode)) {
		return false;
	}

	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;
	const {type} = element.type === 'AssignmentPattern' ? element.left : element;
	return type === 'ObjectExpression' || type === 'ObjectPattern';
};

const getDestructuringLeftAndRight = node => {
	/* c8 ignore next 3 */
	if (!node) {
		return {};
	}

	if (node.type === 'AssignmentExpression') {
		return node;
	}

	return node.type === 'VariableDeclarator' ? {left: node.id, right: node.init} : {};
};

// Everything after the `.filter(…)` call is removed, so a comment there would be lost
const hasCommentAfterFilterCall = (filterCall, node, context) => hasCommentInRange(context, [
	getParenthesizedRange(filterCall, context)[1],
	context.sourceCode.getRange(node)[1],
]);

// `array.filter(…).shift()`, `array.filter(…).at(0)`, `array.filter(…).pop()`, `array.filter(…).at(-1)`
const getTrailingCallProblem = (node, messageId, replacementMethod, context) => {
	const filterCall = node.callee.object;
	const problem = {
		node: filterCall.callee.property,
		messageId,
	};

	if (!hasCommentAfterFilterCall(filterCall, node, context)) {
		problem.fix = fixer => [
			fixer.replaceText(filterCall.callee.property, replacementMethod),
			...removeMethodCall(fixer, node, context),
		];
	}

	return problem;
};

function * fixDestructuring(node, fixer, context, {abort}) {
	const {sourceCode} = context;
	const {left} = getDestructuringLeftAndRight(node);
	const [element] = left.elements;

	// `leftText` is rebuilt from the element alone, so a comment inside the pattern would be lost
	if (hasCommentInRange(context, sourceCode.getRange(left))) {
		return abort();
	}

	// The pattern's type annotation describes the whole array, it cannot be carried over to a single binding
	if (left.typeAnnotation) {
		return abort();
	}

	const leftText = sourceCode.getText(element.type === 'AssignmentPattern' ? element.left : element);
	yield fixer.replaceText(left, leftText);

	// `AssignmentExpression` always starts with `[` or `(`, so we don't need check ASI
	if (!assignmentNeedParenthesize(node, sourceCode)) {
		return;
	}

	yield fixer.insertTextBefore(node, '(');
	yield fixer.insertTextAfter(node, ')');
}

const hasDefaultValue = node => getDestructuringLeftAndRight(node).left.elements[0].type === 'AssignmentPattern';

const fixDestructuringAndReplaceFilter = (node, context) => {
	const {property} = getDestructuringLeftAndRight(node).right.callee;

	// A destructuring default only applies to `undefined`, while `??` also applies to `null` and `||` to every falsy value, so there is no replacement operator for the found element.
	if (hasDefaultValue(node)) {
		return {};
	}

	const fix = function * (fixer, {abort}) {
		yield fixer.replaceText(property, 'find');
		yield fixDestructuring(node, fixer, context, {abort});
	};

	return {fix};
};

const isAccessingZeroIndex = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.computed === true
	&& node.parent.object === node
	&& node.parent.property.type === 'Literal'
	&& node.parent.property.raw === '0'
	// Writing to the first element is not the same as reading from it
	&& !isLeftHandSide(node.parent);

const isDestructuringFirstElement = node => {
	const {left, right} = getDestructuringLeftAndRight(node.parent);
	return left
		&& right
		&& right === node
		&& left.type === 'ArrayPattern'
		&& left.elements.length === 1
		&& left.elements[0]
		&& left.elements[0].type !== 'RestElement';
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const {checkFromLast} = context.options[0];

	// Zero index access
	// `array.filter()[0]`
	// `array?.filter()[0]`
	context.on('MemberExpression', node => {
		if (!(node.computed
			&& node.property.type === 'Literal'
			&& node.property.raw === '0'
			&& isArrayFilterCall(node.object, context)) || isLeftHandSide(node)) {
			return;
		}

		const problem = {
			node: node.object.callee.property,
			messageId: ERROR_ZERO_INDEX,
		};

		if (!hasCommentAfterFilterCall(node.object, node, context)) {
			problem.fix = fixer => [
				fixer.replaceText(node.object.callee.property, 'find'),
				removeMemberExpressionProperty(fixer, node, context),
			];
		}

		return problem;
	});

	// `array.filter().shift()`
	// `array?.filter().shift()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'shift',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayFilterCall(node.callee.object, context)
		)) {
			return;
		}

		return getTrailingCallProblem(node, ERROR_SHIFT, 'find', context);
	});

	// `const [foo] = array.filter()`
	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'ArrayPattern'
			&& node.id.elements.length === 1
			&& node.id.elements[0]
			&& node.id.elements[0].type !== 'RestElement'
			&& isArrayFilterCall(node.init, context, {optionalMember: false})
		)) {
			return;
		}

		return {
			node: node.init.callee.property,
			messageId: ERROR_DESTRUCTURING_DECLARATION,
			...fixDestructuringAndReplaceFilter(node, context),
		};
	});

	// `[foo] = array.filter()`
	context.on('AssignmentExpression', node => {
		if (!(
			node.left.type === 'ArrayPattern'
			&& node.left.elements.length === 1
			&& node.left.elements[0]
			&& node.left.elements[0].type !== 'RestElement'
			&& isArrayFilterCall(node.right, context, {optionalMember: false})
		)) {
			return;
		}

		return {
			node: node.right.callee.property,
			messageId: ERROR_DESTRUCTURING_ASSIGNMENT,
			...fixDestructuringAndReplaceFilter(node, context),
		};
	});

	// `const foo = array.filter(); foo[0]; [bar] = foo`
	context.on('VariableDeclarator', node => {
		if (!(
			node.id.type === 'Identifier'
			// The annotation describes the whole array, and `find()` returns one element or `undefined`, so it cannot be carried over
			&& !node.id.typeAnnotation
			&& isArrayFilterCall(node.init, context, {optionalMember: false})
			&& node.parent.type === 'VariableDeclaration'
			&& node.parent.declarations.includes(node)
			// Exclude `export const foo = [];`
			&& !(
				node.parent.parent.type === 'ExportNamedDeclaration'
				&& node.parent.parent.declaration === node.parent
			)
		)) {
			return;
		}

		const scope = sourceCode.getScope(node);
		const variable = findVariable(scope, node.id);
		const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node.id);

		if (identifiers.length === 0) {
			return;
		}

		const zeroIndexNodes = [];
		const destructuringNodes = [];
		for (const identifier of identifiers) {
			if (isAccessingZeroIndex(identifier)) {
				zeroIndexNodes.push(identifier.parent);
			} else if (isDestructuringFirstElement(identifier)) {
				destructuringNodes.push(identifier.parent);
			} else {
				return;
			}
		}

		const problem = {
			node: node.init.callee.property,
			messageId: ERROR_DECLARATION,
		};

		// `const [foo = bar] = baz` is not fixable
		// The replaced ranges hold the index or the pattern, so a comment inside one would be lost
		const removedNodes = [...zeroIndexNodes, ...destructuringNodes];
		if (
			destructuringNodes.every(node => !hasDefaultValue(node))
			&& removedNodes.every(node => !hasCommentInRange(context, sourceCode.getRange(node)))
		) {
			problem.fix = function * (fixer, {abort}) {
				yield fixer.replaceText(node.init.callee.property, 'find');

				const singularName = singular(node.id.name);
				if (singularName) {
					// Rename variable to be singularized now that it refers to a single item in the array instead of the entire array.
					const singularizedName = getAvailableVariableName(singularName, getScopes(scope));
					yield renameVariable(variable, singularizedName, context, fixer);

					// Prevent possible variable conflicts
					yield extendFixRange(fixer, sourceCode.getRange(sourceCode.ast));
				}

				for (const node of zeroIndexNodes) {
					yield removeMemberExpressionProperty(fixer, node, context);
				}

				for (const node of destructuringNodes) {
					yield fixDestructuring(node, fixer, context, {abort});
				}
			};
		}

		return problem;
	});

	// `array.filter().at(0)`
	// `array?.filter().at(0)`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'at',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& node.arguments[0].type === 'Literal'
			&& node.arguments[0].raw === '0'
			&& isArrayFilterCall(node.callee.object, context)
		)) {
			return;
		}

		return getTrailingCallProblem(node, ERROR_AT_ZERO, 'find', context);
	});

	if (!checkFromLast) {
		return;
	}

	// `array.filter().pop()`
	// `array?.filter().pop()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'pop',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayFilterCall(node.callee.object, context)
		)) {
			return;
		}

		return getTrailingCallProblem(node, ERROR_POP, 'findLast', context);
	});

	// `array.filter().at(-1)`
	// `array?.filter().at(-1)`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				method: 'at',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})
			&& isNegativeOneLiteral(node.arguments[0])
			&& isArrayFilterCall(node.callee.object, context)
		)) {
			return;
		}

		return getTrailingCallProblem(node, ERROR_AT_MINUS_ONE, 'findLast', context);
	});

	// `array.filter().slice(-1)[0]`
	// `array?.filter().slice(-1)[0]`
	context.on('MemberExpression', node => {
		if (!(
			node.computed
			&& !node.optional
			&& node.property.type === 'Literal'
			&& node.property.raw === '0'
			&& !isLeftHandSide(node)
			&& isArrayFilterSliceLastCall(node.object, context)
		)) {
			return;
		}

		const filterCall = node.object.callee.object;

		return {
			node: filterCall.callee.property,
			messageId: ERROR_SLICE_MINUS_ONE,
			* fix(fixer, {abort}) {
				if (hasCommentAfterFilterCall(filterCall, node, context)) {
					return abort();
				}

				yield fixer.replaceText(filterCall.callee.property, 'findLast');
				// Remove `.slice(-1)`
				yield removeMethodCall(fixer, node.object, context);
				// Remove `[0]`
				yield removeMemberExpressionProperty(fixer, node, context);
			},
		};
	});

	// `array.filter().slice(-1).pop()`
	// `array?.filter().slice(-1).pop()`
	// `array.filter().slice(-1).shift()`
	context.on('CallExpression', node => {
		if (!(
			isMethodCall(node, {
				methods: ['pop', 'shift'],
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			&& isArrayFilterSliceLastCall(node.callee.object, context)
		)) {
			return;
		}

		const filterCall = node.callee.object.callee.object;

		return {
			node: filterCall.callee.property,
			messageId: ERROR_SLICE_MINUS_ONE,
			* fix(fixer, {abort}) {
				if (hasCommentAfterFilterCall(filterCall, node, context)) {
					return abort();
				}

				yield fixer.replaceText(filterCall.callee.property, 'findLast');
				// Remove `.slice(-1)`
				yield removeMethodCall(fixer, node.callee.object, context);
				// Remove `.pop()` / `.shift()`
				yield removeMethodCall(fixer, node, context);
			},
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkFromLast: {
				type: 'boolean',
				description: 'Whether to also check for patterns that can be replaced with `findLast()`.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.find(…)` and `.findLast(…)` over the first or last element from `.filter(…)`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{checkFromLast: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
