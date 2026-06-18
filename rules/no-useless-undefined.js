import {hasSideEffect} from '@eslint-community/eslint-utils';
import {removeArgument, replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';
import {
	isUndefined,
	isFunction,
	isMemberExpression,
} from './ast/index.js';
import {getStaticNumberValue, isTypeScriptFile, needsSemicolon} from './utils/index.js';
import {containsOptionalChain, isSame, unwrapExpression} from './utils/comparison.js';

const messageId = 'no-useless-undefined';
const suggestionMessageId = 'no-useless-undefined/suggestion';
const messages = {
	[messageId]: 'Do not use useless `undefined`.',
	[suggestionMessageId]: 'Use the indexed access directly.',
};

const compareFunctionNames = new Set([
	'is',
	'equal',
	'notEqual',
	'strictEqual',
	'notStrictEqual',
	'propertyVal',
	'notPropertyVal',
	'not',
	'include',
	'property',
	'toBe',
	'toHaveBeenCalledWith',
	'toContain',
	'toContainEqual',
	'toEqual',
	'same',
	'notSame',
	'strictSame',
	'strictNotSame',
]);
const shouldIgnore = node => {
	let name;

	if (node.type === 'Identifier') {
		name = node.name;
	} else if (
		node.type === 'MemberExpression'
		&& node.computed === false
		&& node.property.type === 'Identifier'
	) {
		name = node.property.name;
	}

	return compareFunctionNames.has(name)
		// `array.push(undefined)`
		|| name === 'push'
		// `array.unshift(undefined)`
		|| name === 'unshift'
		// `array.includes(undefined)`
		|| name === 'includes'

		// `set.add(undefined)`
		|| name === 'add'
		// `set.has(undefined)`
		|| name === 'has'
		// `set.delete(undefined)`
		|| name === 'delete'

		// `map.set(foo, undefined)`
		|| name === 'set'

		// `React.createContext(undefined)`
		|| name === 'createContext'
		// `setState(undefined)`
		|| /^set[A-Z]/v.test(name)
		// React 19 useRef
		|| name === 'useRef'

		// https://vuejs.org/api/reactivity-core.html#ref
		|| name === 'ref';
};

const getFunction = scope => {
	for (; scope; scope = scope.upper) {
		if (scope.type === 'function') {
			return scope.block;
		}
	}
};

// Matches a "pure-nothing" return type (`undefined` or `void`), where `return undefined` is always useless.
// Union types like `number | undefined` are intentionally excluded, so the explicit `undefined` is preserved (#880).
const isUndefinedOrVoidReturnType = functionNode => {
	const type = functionNode.returnType?.typeAnnotation?.type;
	return type === 'TSUndefinedKeyword' || type === 'TSVoidKeyword';
};

const isFunctionBindCall = node =>
	!node.optional
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.computed
	&& node.callee.property.type === 'Identifier'
	&& node.callee.property.name === 'bind';

const lowerBoundComparison = {
	left: {
		'>=': {valid: true, addend: 0},
		'>': {valid: true, addend: -1},
		'<': {valid: false, addend: 0},
		'<=': {valid: false, addend: -1},
	},
	right: {
		'<=': {valid: true, addend: 0},
		'<': {valid: true, addend: -1},
		'>': {valid: false, addend: 0},
		'>=': {valid: false, addend: -1},
	},
};

const upperBoundComparison = {
	left: {
		'<': {valid: true, kind: 'length'},
		'<=': {valid: true, kind: 'lengthMinusOne'},
		'>=': {valid: false, kind: 'length'},
		'>': {valid: false, kind: 'lengthMinusOne'},
	},
	right: {
		'>': {valid: true, kind: 'length'},
		'>=': {valid: true, kind: 'lengthMinusOne'},
		'<=': {valid: false, kind: 'length'},
		'<': {valid: false, kind: 'lengthMinusOne'},
	},
};

const comparisonOperators = new Set([
	'<',
	'<=',
	'>',
	'>=',
]);

function getIndexAccess(node) {
	node = unwrapExpression(node);

	if (node.type === 'BinaryExpression' && node.operator === '-') {
		const offset = getStaticNumberValue(node.right);

		if (Number.isSafeInteger(offset) && offset > 0) {
			return {
				node: node.left,
				offset,
			};
		}
	}

	return {
		node,
		offset: 0,
	};
}

function getOffsetComparisonValidity(comparisons, operator, boundary, offset) {
	const comparison = comparisons[operator];

	if (comparison && boundary === offset + comparison.addend) {
		return comparison.valid;
	}
}

function getLowerBoundTestValidity(test, indexAccess) {
	const {operator, left, right} = test;
	const leftNumber = getStaticNumberValue(left);
	const rightNumber = getStaticNumberValue(right);

	if (
		Number.isSafeInteger(rightNumber)
		&& isSame(left, indexAccess.node)
	) {
		return getOffsetComparisonValidity(lowerBoundComparison.left, operator, rightNumber, indexAccess.offset);
	}

	if (
		Number.isSafeInteger(leftNumber)
		&& isSame(right, indexAccess.node)
	) {
		return getOffsetComparisonValidity(lowerBoundComparison.right, operator, leftNumber, indexAccess.offset);
	}
}

function isLengthMemberExpressionFor(node, object) {
	node = unwrapExpression(node);

	return isMemberExpression(node, {
		property: 'length',
		optional: false,
		computed: false,
	})
	&& isSame(node.object, object);
}

function getLengthBoundKind(node, object) {
	node = unwrapExpression(node);

	if (isLengthMemberExpressionFor(node, object)) {
		return 'length';
	}

	if (
		node.type === 'BinaryExpression'
		&& node.operator === '-'
		&& isLengthMemberExpressionFor(node.left, object)
		&& getStaticNumberValue(node.right) === 1
	) {
		return 'lengthMinusOne';
	}
}

function getBoundKindComparisonValidity(comparisons, operator, kind) {
	const comparison = comparisons[operator];

	if (comparison?.kind === kind) {
		return comparison.valid;
	}
}

function getUpperBoundTestValidity(test, access) {
	if (access.index.offset !== 0) {
		return;
	}

	const {operator, left, right} = test;
	const rightBoundKind = getLengthBoundKind(right, access.node.object);

	if (rightBoundKind && isSame(left, access.index.node)) {
		return getBoundKindComparisonValidity(upperBoundComparison.left, operator, rightBoundKind);
	}

	const leftBoundKind = getLengthBoundKind(left, access.node.object);

	if (leftBoundKind && isSame(right, access.index.node)) {
		return getBoundKindComparisonValidity(upperBoundComparison.right, operator, leftBoundKind);
	}
}

function getIndexedAccess(node, sourceCode) {
	node = unwrapExpression(node);

	if (
		!isMemberExpression(node, {
			computed: true,
			optional: false,
		})
		|| containsOptionalChain(node)
		|| hasSideEffect(node.object, sourceCode, {considerGetters: true})
		|| hasSideEffect(node.property, sourceCode, {considerGetters: true})
	) {
		return;
	}

	return {
		node,
		index: getIndexAccess(node.property),
	};
}

function getIndexedAccessTestValidity(test, access) {
	test = unwrapExpression(test);

	if (
		test.type !== 'BinaryExpression'
		|| !comparisonOperators.has(test.operator)
		|| containsOptionalChain(test)
	) {
		return;
	}

	return getLowerBoundTestValidity(test, access.index)
		?? getUpperBoundTestValidity(test, access);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	const getProblem = (node, fix, checkFunctionReturnType) => {
		if (checkFunctionReturnType) {
			const functionNode = getFunction(sourceCode.getScope(node));
			if (functionNode?.returnType) {
				return;
			}
		}

		return {
			node,
			messageId,
			fix,
		};
	};

	const options = context.options[0];

	const removeNodeAndLeadingSpace = (node, fixer) =>
		replaceNodeOrTokenAndSpacesBefore(node, '', fixer, context);

	context.on('Identifier', node => {
		if (!isUndefined(node)) {
			return;
		}

		const {parent} = node;

		// `return undefined`
		if (
			parent.type === 'ReturnStatement'
			&& parent.argument === node
		) {
			const functionNode = getFunction(sourceCode.getScope(node));
			if (functionNode?.returnType && !isUndefinedOrVoidReturnType(functionNode)) {
				return;
			}

			return getProblem(
				node,
				fixer => removeNodeAndLeadingSpace(node, fixer),
			);
		}

		// `yield undefined`
		if (
			parent.type === 'YieldExpression'
			&& !parent.delegate
			&& parent.argument === node
		) {
			return getProblem(
				node,
				fixer => removeNodeAndLeadingSpace(node, fixer),
			);
		}

		// `() => undefined`
		if (
			options.checkArrowFunctionBody
			&& parent.type === 'ArrowFunctionExpression'
			&& parent.body === node
		) {
			return getProblem(
				node,
				fixer => replaceNodeOrTokenAndSpacesBefore(node, ' {}', fixer, context),
				/* CheckFunctionReturnType */ true,
			);
		}

		// `let foo = undefined` / `var foo = undefined`
		if (
			parent.type === 'VariableDeclarator'
			&& parent.init === node
			&& parent.parent.type === 'VariableDeclaration'
			&& parent.parent.kind !== 'const'
			&& parent.parent.declarations.includes(parent)
		) {
			const [, start] = sourceCode.getRange(parent.id);
			const [, end] = sourceCode.getRange(node);
			return getProblem(
				node,
				fixer => fixer.removeRange([start, end]),
			);
		}

		// `const {foo = undefined} = {}`
		if (
			parent.type === 'AssignmentPattern'
			&& parent.right === node
		) {
			return getProblem(
				node,
				function * (fixer) {
					const assignmentPattern = parent;
					const {left} = assignmentPattern;
					const [, start] = sourceCode.getRange(left);
					const [, end] = sourceCode.getRange(node);

					yield fixer.removeRange([start, end]);
					if (
						(left.typeAnnotation || isTypeScriptFile(context.physicalFilename))
						&& !left.optional
						&& isFunction(assignmentPattern.parent)
						&& assignmentPattern.parent.params.includes(assignmentPattern)
					) {
						yield (
							left.typeAnnotation
								? fixer.insertTextBefore(left.typeAnnotation, '?')
								: fixer.insertTextAfter(left, '?')
						);
					}
				},
			);
		}
	});

	context.on('ConditionalExpression', node => {
		const isConsequentUndefined = isUndefined(node.consequent);
		const isAlternateUndefined = isUndefined(node.alternate);

		if (isConsequentUndefined === isAlternateUndefined) {
			return;
		}

		const indexedAccessNode = isConsequentUndefined ? node.alternate : node.consequent;
		const indexedAccess = getIndexedAccess(indexedAccessNode, sourceCode);

		if (!indexedAccess) {
			return;
		}

		const accessWhenTestPasses = !isConsequentUndefined;
		const testValidity = getIndexedAccessTestValidity(node.test, indexedAccess);

		if (testValidity !== accessWhenTestPasses) {
			return;
		}

		const problem = {
			node: isConsequentUndefined ? node.consequent : node.alternate,
			messageId,
		};

		if (sourceCode.getCommentsInside(node).length === 0) {
			problem.suggest = [{
				messageId: suggestionMessageId,
				fix(fixer) {
					// Use the original branch text so a TypeScript type assertion (`array[index] as string`)
					// isn't dropped — `indexedAccess.node` is the unwrapped member expression.
					const replacement = sourceCode.getText(indexedAccessNode);
					const semicolon = needsSemicolon(sourceCode.getTokenBefore(node), context, replacement) ? ';' : '';
					return fixer.replaceText(node, semicolon + replacement);
				},
			}];
		}

		return problem;
	});

	if (!options.checkArguments || isTypeScriptFile(context.physicalFilename)) {
		return;
	}

	context.on('CallExpression', node => {
		const argumentNodes = node.arguments;
		const lastArgument = argumentNodes.at(-1);

		if (!isUndefined(lastArgument) || shouldIgnore(node.callee)) {
			return;
		}

		// Ignore arguments in `Function#bind()`, but not `this` argument
		if (isFunctionBindCall(node) && argumentNodes.length !== 1) {
			return;
		}

		return {
			node: lastArgument,
			messageId,
			fix: fixer => removeArgument(fixer, lastArgument, context),
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkArguments: {
				type: 'boolean',
				description: 'Whether to check function arguments.',
			},
			checkArrowFunctionBody: {
				type: 'boolean',
				description: 'Whether to check arrow function bodies.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless `undefined`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkArguments: true, checkArrowFunctionBody: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
