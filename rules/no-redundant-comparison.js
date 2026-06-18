import {getStaticValue, hasSideEffect} from '@eslint-community/eslint-utils';
import {getParenthesizedRange} from './utils/index.js';
import {
	comparisonOperators,
	containsOptionalChain,
	flipOperator,
	isReference,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

const MESSAGE_ID = 'no-redundant-comparison';
const MESSAGE_ID_SUGGESTION = 'no-redundant-comparison/suggestion';
const messages = {
	[MESSAGE_ID]: 'This comparison is redundant because it is already implied by the other conditions.',
	[MESSAGE_ID_SUGGESTION]: 'Remove this redundant comparison.',
};

const ORDERING_OPERATORS = new Set(['>', '>=', '<', '<=']);

function flatAndChain(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === '&&'
			? flatAndChain(child)
			: [child]);
}

// Whether `p` (a `{operator, value}` predicate) being true guarantees `q` is true, for two numeric bounds on the same value.
function impliesNumeric(pOperator, pValue, qOperator, qValue) {
	const isPLowerBound = pOperator === '>' || pOperator === '>=';
	const isQLowerBound = qOperator === '>' || qOperator === '>=';
	if (isPLowerBound !== isQLowerBound) {
		return false;
	}

	if (isPLowerBound) {
		if (pValue > qValue) {
			return true;
		}

		if (pValue < qValue) {
			return false;
		}
	} else {
		if (pValue < qValue) {
			return true;
		}

		if (pValue > qValue) {
			return false;
		}
	}

	// Same bound value: the stricter (exclusive) bound implies the looser (inclusive) one, but not the reverse.
	const isPInclusive = pOperator === '>=' || pOperator === '<=';
	const isQInclusive = qOperator === '>=' || qOperator === '<=';
	return isPInclusive ? isQInclusive : true;
}

// Whether predicate `a` being true guarantees predicate `b` is true, for two predicates on the same value.
function entails(a, b, sourceCode) {
	if (a.operator === b.operator && isSame(a.value, b.value)) {
		return true;
	}

	if (!ORDERING_OPERATORS.has(a.operator) || !ORDERING_OPERATORS.has(b.operator)) {
		return false;
	}

	const aValue = getStaticValue(a.value, sourceCode.getScope(a.value))?.value;
	const bValue = getStaticValue(b.value, sourceCode.getScope(b.value))?.value;
	if (
		typeof aValue !== 'number'
		|| typeof bValue !== 'number'
		|| Number.isNaN(aValue)
		|| Number.isNaN(bValue)
	) {
		return false;
	}

	return impliesNumeric(a.operator, aValue, b.operator, bValue);
}

// View a comparison as a `{operator, value}` predicate on `reference`, normalizing so the reference is the subject.
function predicateForSubject(comparison, reference) {
	if (isSame(comparison.left, reference)) {
		return {operator: comparison.operator, value: comparison.right, node: comparison.node};
	}

	if (isSame(comparison.right, reference)) {
		return {operator: flipOperator[comparison.operator], value: comparison.left, node: comparison.node};
	}
}

// View a comparison as a predicate whose subject belongs to `equalityClass`, or `undefined` if neither/both sides do.
function predicateForClass(comparison, equalityClass) {
	const isLeftInClass = equalityClass.some(member => isSame(member, comparison.left));
	const isRightInClass = equalityClass.some(member => isSame(member, comparison.right));

	if (isLeftInClass === isRightInClass) {
		return;
	}

	return isLeftInClass
		? {operator: comparison.operator, value: comparison.right, node: comparison.node}
		: {operator: flipOperator[comparison.operator], value: comparison.left, node: comparison.node};
}

// Merge each equality's two references into shared classes (congruence closure), so transitive chains group together.
function buildEqualityClasses(equalities) {
	const classes = [];
	const findClass = reference => classes.find(equalityClass => equalityClass.some(member => isSame(member, reference)));

	for (const {left, right} of equalities) {
		const leftClass = findClass(left);
		const rightClass = findClass(right);

		if (leftClass && rightClass) {
			if (leftClass !== rightClass) {
				leftClass.push(...rightClass);
				classes.splice(classes.indexOf(rightClass), 1);
			}
		} else if (leftClass) {
			leftClass.push(right);
		} else if (rightClass) {
			rightClass.push(left);
		} else {
			classes.push([left, right]);
		}
	}

	return classes;
}

// Split the operands of an `&&` chain into equality links, disequality links, and other comparisons.
function classifyOperands(operands) {
	const equalities = [];
	const disequalities = [];
	const comparisons = [];

	for (const operand of operands) {
		const expression = unwrapExpression(operand);
		if (
			expression.type !== 'BinaryExpression'
			|| !comparisonOperators.has(expression.operator)
			|| containsOptionalChain(expression)
		) {
			continue;
		}

		const {operator, left, right} = expression;
		const isLeftReference = isReference(left);
		const isRightReference = isReference(right);

		if (isLeftReference && isRightReference && (operator === '===' || operator === '!==')) {
			if (!isSame(left, right)) {
				(operator === '===' ? equalities : disequalities).push({left, right});
			}
		} else if (isLeftReference || isRightReference) {
			comparisons.push({
				operator, left, right, node: operand,
			});
		}
	}

	return {equalities, disequalities, comparisons};
}

function findRedundantComparison({equalities, disequalities, comparisons, sourceCode}) {
	// `a === b` makes a comparison redundant when another comparison on the same equality class implies it.
	for (const equalityClass of buildEqualityClasses(equalities)) {
		const predicates = comparisons
			.map(comparison => predicateForClass(comparison, equalityClass))
			.filter(Boolean);

		for (const [index, first] of predicates.entries()) {
			for (const second of predicates.slice(index + 1)) {
				const firstImpliesSecond = entails(first, second, sourceCode);
				const secondImpliesFirst = entails(second, first, sourceCode);

				if (firstImpliesSecond && secondImpliesFirst) {
					// Equivalent comparisons: report the later one.
					return sourceCode.getRange(first.node)[0] > sourceCode.getRange(second.node)[0] ? first.node : second.node;
				}

				if (firstImpliesSecond) {
					return second.node;
				}

				if (secondImpliesFirst) {
					return first.node;
				}
			}
		}
	}

	// `a === k && a !== b` implies `b !== k`, so a matching `b !== k` comparison is redundant.
	for (const {left, right} of disequalities) {
		for (const [subject, other] of [[left, right], [right, left]]) {
			const equalityValue = comparisons
				.map(comparison => predicateForSubject(comparison, subject))
				.find(predicate => predicate?.operator === '===')
				?.value;

			if (!equalityValue) {
				continue;
			}

			const redundant = comparisons.find(comparison => {
				const predicate = predicateForSubject(comparison, other);
				return predicate?.operator === '!==' && isSame(predicate.value, equalityValue);
			});

			if (redundant) {
				return redundant.node;
			}
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('LogicalExpression', node => {
		if (
			node.operator !== '&&'
			|| (node.parent.type === 'LogicalExpression' && node.parent.operator === '&&')
		) {
			return;
		}

		const {equalities, disequalities, comparisons} = classifyOperands(flatAndChain(node));

		if (comparisons.length === 0 || (equalities.length === 0 && disequalities.length === 0)) {
			return;
		}

		const redundant = findRedundantComparison({
			equalities, disequalities, comparisons, sourceCode,
		});
		if (!redundant) {
			return;
		}

		const {parent} = redundant;
		const leftRange = getParenthesizedRange(parent.left, context);
		const rightRange = getParenthesizedRange(parent.right, context);
		const range = redundant === parent.left
			? [leftRange[0], rightRange[0]]
			: [leftRange[1], rightRange[1]];

		const problem = {
			node: redundant,
			messageId: MESSAGE_ID,
		};

		// Removing the comparison would drop a comment in the removed span.
		const hasComment = sourceCode.getAllComments().some(comment => {
			const [start, end] = sourceCode.getRange(comment);
			return start >= range[0] && end <= range[1];
		});
		if (hasComment) {
			return problem;
		}

		const fix = fixer => fixer.removeRange(range);

		// Removing the comparison drops its evaluation. That only preserves behavior when evaluating it cannot trigger user code such as a getter or a `valueOf`/`toString` coercion; otherwise offer it as a suggestion instead of an autofix.
		if (hasSideEffect(redundant, sourceCode, {considerGetters: true, considerImplicitTypeConversion: true})) {
			problem.suggest = [{messageId: MESSAGE_ID_SUGGESTION, fix}];
		} else {
			problem.fix = fix;
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow comparisons made redundant by an equality check in the same logical AND.',
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
