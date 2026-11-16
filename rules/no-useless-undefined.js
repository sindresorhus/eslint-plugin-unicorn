import {getPropertyName, hasSideEffect} from '@eslint-community/eslint-utils';
import {
	fixSpaceAroundKeyword,
	getArgumentRemovalRange,
	removeArgument,
	replaceNodeOrTokenAndSpacesBefore,
} from './fix/index.js';
import {
	isFunction,
	isMemberExpression,
	isUndefined,
} from './ast/index.js';
import {
	getEnclosingFunction,
	getParenthesizedRange,
	getStaticNumberValue,
	hasCommentInRange,
	hasJavaScriptTypeAnnotations,
	isGlobalIdentifier,
	isReferenceContext,
	isTypeScriptFile,
	needsSemicolon,
	unwrapChainAndTypeScriptExpression,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {
	containsOptionalChain,
	isLengthMinusOneOf,
	isLengthOf,
	isSame,
} from './utils/comparison.js';

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
// A trailing `undefined` argument is not the same as no argument for these
const methodsWithUndefinedArgument = new Set([
	// `array.push(undefined)` appends an `undefined` element
	'push',
	// `array.unshift(undefined)` prepends an `undefined` element
	'unshift',
	// `array.includes(undefined)` looks for an `undefined` element
	'includes',
	// `array.concat(undefined)` appends an `undefined` element, `concat()` does not
	'concat',
	// `array.splice(start, undefined)` deletes nothing, `splice(start)` deletes to the end
	'splice',
	// `array.toSpliced(start, undefined)` skips nothing, `toSpliced(start)` skips to the end
	'toSpliced',
	// `array.lastIndexOf(value, undefined)` searches from index `0`, `lastIndexOf(value)` searches from the end
	'lastIndexOf',
	// `array.reduce(fn, undefined)` seeds the accumulator with `undefined`, `reduce(fn)` seeds it with the first element
	'reduce',
	'reduceRight',
	// `String(undefined)` is the string `'undefined'`, `String()` is an empty string
	'String',
	// `String.fromCharCode(undefined)` is `'\0'`, `String.fromCharCode()` is an empty string
	'fromCharCode',
	// `String.fromCodePoint(undefined)` throws, `String.fromCodePoint()` is an empty string
	'fromCodePoint',

	// `Number(undefined)` is `NaN`, `Number()` is `0`
	'Number',
	// `Math.max(undefined)` is `NaN`, `Math.max()` is `-Infinity`
	'max',
	// `Math.min(undefined)` is `NaN`, `Math.min()` is `Infinity`
	'min',
	// `Math.hypot(undefined)` is `NaN`, `Math.hypot()` is `0`
	'hypot',

	// `Array(undefined)` is `[undefined]`, `Array()` is `[]`
	'Array',
	// `Array.of(undefined)` is `[undefined]`, `Array.of()` is `[]`
	'of',
	// `Array.from(undefined)` throws the same as `Array.from()`, but the name is matched for any object, like a library's `from()`
	'from',

	// `structuredClone(undefined)` returns `undefined`, `structuredClone()` throws
	'structuredClone',

	// `set.add(undefined)`
	'add',
	// `set.has(undefined)`
	'has',
	// `set.delete(undefined)`
	'delete',

	// `map.set(foo, undefined)`
	'set',

	// `React.createContext(undefined)`
	'createContext',
	// React 19 useRef
	'useRef',

	// https://vuejs.org/api/reactivity-core.html#ref
	'ref',
]);
const shouldIgnoreCall = call => {
	const callee = unwrapChainAndTypeScriptExpression(call.callee);
	let name;

	if (callee.type === 'Identifier') {
		name = callee.name;
	} else if (callee.type === 'MemberExpression') {
		name = getPropertyName(callee);
		// Ignore bound arguments in `Function#bind()`, but allow removing an undefined `this` argument.
		if (name === 'bind' && call.arguments.length !== 1) {
			return true;
		}
	}

	return compareFunctionNames.has(name)
		|| methodsWithUndefinedArgument.has(name)
		// `setState(undefined)`
		|| /^set[A-Z]/v.test(name);
};

const shouldKeepReturnUndefined = (functionNode, isTypedSource) => {
	// A getter must return a value, so `return;` conflicts with the `getter-return` rule
	if (functionNode?.parent?.kind === 'get') {
		return true;
	}

	if (!functionNode?.returnType) {
		// Removing `undefined` can change the inferred return type to `void`.
		return isTypedSource;
	}

	// Check explicit return annotations of `undefined` or `void`.
	// Union types like `number | undefined` are intentionally excluded, so the explicit `undefined` is preserved (#880).
	const type = functionNode.returnType.typeAnnotation?.type;
	return type !== 'TSUndefinedKeyword' && type !== 'TSVoidKeyword';
};

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
	node = unwrapTypeScriptExpression(node);

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

function getLengthBoundKind(node, object) {
	if (isLengthOf(node, object)) {
		return 'length';
	}

	if (isLengthMinusOneOf(node, object)) {
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
	node = unwrapTypeScriptExpression(node);

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
	test = unwrapTypeScriptExpression(test);

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

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const isTypedSource = isTypeScriptFile(context.physicalFilename)
		|| isTypeScriptFile(context.filename)
		|| hasJavaScriptTypeAnnotations(context);
	const isGlobalUndefined = node => isUndefined(node) && isGlobalIdentifier(node, context);

	const getProblem = (node, fix) => ({node, messageId, fix});

	const getInitializerRemovalProblem = (node, target) => getProblem(node, (fixer, {abort}) => {
		const [, start] = sourceCode.getRange(target);
		// Remove the parentheses around the value to avoid leaving them dangling.
		const [, end] = getParenthesizedRange(node, context);

		// A comment between the target and the value would be removed as part of the range.
		if (hasCommentInRange(context, [start, end])) {
			return abort();
		}

		return fixer.removeRange([start, end]);
	});

	const options = context.options[0];

	const removeNodeAndLeadingSpace = (node, fixer) =>
		replaceNodeOrTokenAndSpacesBefore(node, '', fixer, context);

	context.on('Identifier', node => {
		if (!isGlobalUndefined(node)) {
			return;
		}

		const {parent} = node;

		// `return undefined`
		if (
			parent.type === 'ReturnStatement'
			&& parent.argument === node
		) {
			if (shouldKeepReturnUndefined(getEnclosingFunction(parent), isTypedSource)) {
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

		if (isTypedSource) {
			return;
		}

		// `() => undefined`
		if (
			options.checkArrowFunctionBody
			&& parent.type === 'ArrowFunctionExpression'
			&& parent.body === node
			// Preserve explicit return types even when the filename has no TypeScript extension.
			&& !parent.returnType
		) {
			return getProblem(
				node,
				fixer => replaceNodeOrTokenAndSpacesBefore(node, ' {}', fixer, context),
			);
		}

		// `let foo = undefined`; a `var` initializer can reset an existing binding, including on each loop iteration.
		if (
			parent.type === 'VariableDeclarator'
			&& parent.init === node
			// Only `let` initializes a fresh binding without an initializer; `const`, `using`, and `await using` require one.
			&& parent.parent.kind === 'let'
			// A binding pattern requires an initializer, `let {foo} = undefined;` cannot become `let {foo};`
			&& parent.id.type === 'Identifier'
		) {
			return getInitializerRemovalProblem(node, parent.id);
		}

		// `const {foo = undefined} = {}`
		if (
			parent.type === 'AssignmentPattern'
			&& parent.right === node
			// Removing a default on the parameter itself can change the function's `length`.
			&& !isFunction(parent.parent)
		) {
			return getInitializerRemovalProblem(node, parent.left);
		}
	});

	context.on('ConditionalExpression', node => {
		const isConsequentUndefined = isGlobalUndefined(node.consequent);
		const isAlternateUndefined = isGlobalUndefined(node.alternate);

		if (isConsequentUndefined === isAlternateUndefined) {
			return;
		}

		const indexedAccessNode = isConsequentUndefined ? node.alternate : node.consequent;
		const indexedAccess = getIndexedAccess(indexedAccessNode, sourceCode);

		if (!indexedAccess) {
			return;
		}

		const isAccessWhenTestPasses = !isConsequentUndefined;
		const testValidity = getIndexedAccessTestValidity(node.test, indexedAccess);

		if (testValidity !== isAccessWhenTestPasses) {
			return;
		}

		const problem = {
			node: isConsequentUndefined ? node.consequent : node.alternate,
			messageId,
		};

		if (!isReferenceContext(node) && sourceCode.getCommentsInside(node).length === 0) {
			problem.suggest = [{
				messageId: suggestionMessageId,
				* fix(fixer) {
					// Use the original branch text so a TypeScript type assertion (`array[index] as string`)
					// isn't dropped — `indexedAccess.node` is the unwrapped member expression.
					const replacement = sourceCode.getText(indexedAccessNode);
					const semicolon = needsSemicolon(sourceCode.getTokenBefore(node), context, replacement) ? ';' : '';
					yield fixer.replaceText(node, semicolon + replacement);
					yield fixSpaceAroundKeyword(fixer, node, context);
				},
			}];
		}

		return problem;
	});

	if (!options.checkArguments || isTypedSource) {
		return;
	}

	context.on('CallExpression', node => {
		const argumentNodes = node.arguments;
		const lastArgument = argumentNodes.at(-1);

		if (!isGlobalUndefined(lastArgument) || shouldIgnoreCall(node)) {
			return;
		}

		const problem = {
			node: lastArgument,
			messageId,
		};

		// The argument and a trailing comma are removed, so a comment next to them would be lost
		if (!hasCommentInRange(context, getArgumentRemovalRange(lastArgument, context))) {
			problem.fix = fixer => removeArgument(fixer, lastArgument, context);
		}

		return problem;
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
