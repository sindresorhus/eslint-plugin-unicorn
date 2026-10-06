import {findVariable} from '@eslint-community/eslint-utils';
import {
	isBooleanLiteral,
	isMemberExpression,
	isUndefined,
} from './ast/index.js';
import {
	getCallArgumentText,
	getCommentSafeProblem,
	getLogicalExpressionChildText,
	getNegatedExpressionText,
	getMemberAccessOperatorRange,
	hasNonDirectiveComment,
	isSameReference,
	isBoolean,
	needsSemicolon,
	isTypeScriptFile,
	getOutermostTypeScriptExpression,
	unwrapTypeScriptExpression,
} from './utils/index.js';
import {getNullishTest, isSameNode} from './shared/nullish-check.js';

const MESSAGE_ID_ERROR = 'prefer-logical-operator-over-ternary/error';
const MESSAGE_ID_OPTIONAL_CHAIN_ERROR = 'prefer-logical-operator-over-ternary/optional-chain-error';
const MESSAGE_ID_SUGGESTION = 'prefer-logical-operator-over-ternary/suggestion';
const MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION = 'prefer-logical-operator-over-ternary/optional-chain-suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer using a logical operator over a ternary.',
	[MESSAGE_ID_OPTIONAL_CHAIN_ERROR]: 'Prefer using optional chaining over a ternary.',
	[MESSAGE_ID_SUGGESTION]: 'Switch to `{{operator}}` operator.',
	[MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION]: 'Switch to optional chaining.',
};

function fix({
	fixer,
	context,
	conditionalExpression,
	left,
	right,
	operator,
	negateLeft = false,
	coerceLeft = false,
}) {
	const {sourceCode} = context;
	let text = [left, right].map((node, index) => {
		if (index === 0 && negateLeft) {
			return getNegatedExpressionText(node, context);
		}

		if (index === 0 && coerceLeft) {
			return `Boolean(${getCallArgumentText(node, context)})`;
		}

		return getLogicalExpressionChildText(node, context, {operator, property: index === 0 ? 'left' : 'right'});
	}).join(` ${operator} `);

	// According to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence#table
	// There should be no cases that need to add parentheses when switching ternary to logical expression

	// ASI
	if (needsSemicolon(sourceCode.getTokenBefore(conditionalExpression), context, text)) {
		text = `;${text}`;
	}

	return fixer.replaceText(conditionalExpression, text);
}

function getBooleanLiteralTypeValue(node) {
	if (node?.type === 'TSTypeAnnotation') {
		node = node.typeAnnotation;
	}

	return node?.type === 'TSLiteralType' && isBooleanLiteral(node.literal)
		? node.literal.value
		: undefined;
}

const isConstAssertion = node => node.type === 'TSTypeReference'
	&& node.typeName.type === 'Identifier'
	&& node.typeName.name === 'const';

function getConstantVariableDefinition(node, context) {
	const scope = context.sourceCode.getScope(node);
	const variable = findVariable(scope, node);
	const definition = variable?.defs.length === 1 ? variable.defs[0] : undefined;
	if (
		definition?.type !== 'Variable'
		|| definition.parent.kind !== 'const'
		|| definition.node.id !== definition.name
		|| !definition.node.init
		|| scope.variableScope !== variable.scope.variableScope
		|| variable.scope.type === 'switch'
		|| context.sourceCode.getRange(definition.node)[1] > context.sourceCode.getRange(node)[0]
	) {
		return;
	}

	return definition;
}

function unwrapConstantAliases(node, context) {
	while (node.type === 'Identifier') {
		const definition = getConstantVariableDefinition(node, context);
		if (!definition) {
			break;
		}

		node = definition.node.init;
	}

	return node;
}

function getBooleanConstantValue(node, context) {
	const literalTypeAnnotations = [];

	while (node) {
		if (isBooleanLiteral(node)) {
			const {value} = node;
			if (literalTypeAnnotations.some(typeAnnotation => getBooleanLiteralTypeValue(typeAnnotation) !== value)) {
				return;
			}

			return value;
		}

		if (node.type === 'TSNonNullExpression' || node.type === 'TSSatisfiesExpression') {
			node = node.expression;
			continue;
		}

		if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
			if (!isConstAssertion(node.typeAnnotation)) {
				literalTypeAnnotations.push(node.typeAnnotation);
			}

			node = node.expression;
			continue;
		}

		if (node.type !== 'Identifier') {
			return;
		}

		const definition = getConstantVariableDefinition(node, context);
		if (!definition) {
			return;
		}

		if (definition.name.typeAnnotation) {
			literalTypeAnnotations.push(definition.name.typeAnnotation);
		}

		node = definition.node.init;
	}
}

function canFixBooleanTernary(context) {
	const {parserServices} = context.sourceCode;
	return !parserServices?.esTreeNodeToTSNodeMap && !isTypeScriptFile(context.physicalFilename);
}

function isBooleanTernaryExpression(node, context) {
	try {
		return isBoolean(node, context);
	} catch (error) {
		// Treat pathological recursive inference as unknown instead of crashing linting.
		// Tests cannot make `isBoolean` throw anything else.
		/* node:coverage ignore next 6 */
		if (error instanceof RangeError) {
			return false;
		}

		throw error;
	}
}

function getBooleanTernaryProblem(conditionalExpression, context) {
	const {sourceCode} = context;
	if (sourceCode.getAncestors(conditionalExpression).some(node => node.type === 'WithStatement')) {
		return;
	}

	const {test, consequent, alternate} = conditionalExpression;
	const consequentValue = getBooleanConstantValue(consequent, context);
	const alternateValue = getBooleanConstantValue(alternate, context);
	const isConsequentBooleanConstant = consequentValue !== undefined;

	if (isConsequentBooleanConstant === (alternateValue !== undefined)) {
		return;
	}

	const booleanValue = consequentValue ?? alternateValue;
	const right = isConsequentBooleanConstant ? alternate : consequent;
	// Keep potentially non-boolean results explicit instead of hiding them behind a logical operator.
	if (!isBooleanTernaryExpression(right, context)) {
		return;
	}

	const negateLeft = consequentValue === false || alternateValue === true;
	const canFix = canFixBooleanTernary(context);

	const problem = {
		node: conditionalExpression,
		messageId: MESSAGE_ID_ERROR,
	};

	if (
		sourceCode.getCommentsInside(conditionalExpression).length === 0
		&& canFix
	) {
		const coerceLeft = !negateLeft && !isBooleanTernaryExpression(unwrapConstantAliases(test, context), context);
		problem.fix = fixer => fix({
			fixer,
			context,
			conditionalExpression,
			left: test,
			right,
			operator: booleanValue ? '||' : '&&',
			negateLeft,
			coerceLeft,
		});
	}

	return problem;
}

function getOptionalChainText(memberExpression, context) {
	const {sourceCode} = context;
	const range = getMemberAccessOperatorRange(memberExpression, context);
	const [nodeStart, nodeEnd] = sourceCode.getRange(memberExpression);
	const [operatorStart, operatorEnd] = range;

	return sourceCode.text.slice(nodeStart, operatorStart)
		+ (memberExpression.computed ? '?.[' : '?.')
		+ sourceCode.text.slice(operatorEnd, nodeEnd);
}

function getProblem({
	context,
	conditionalExpression,
	left,
	right,
	operators = ['??', '||'],
}) {
	// The suggestion rebuilds the expression from `left`/`right` only, so it would drop any comment elsewhere in the ternary. Report without a suggestion in that case.
	if (context.sourceCode.getCommentsInside(conditionalExpression).length > 0) {
		return {
			node: conditionalExpression,
			messageId: MESSAGE_ID_ERROR,
		};
	}

	return {
		node: conditionalExpression,
		messageId: MESSAGE_ID_ERROR,
		suggest: operators.map(operator => ({
			messageId: MESSAGE_ID_SUGGESTION,
			data: {operator},
			fix: fixer => fix({
				fixer,
				context,
				conditionalExpression,
				left,
				right,
				operator,
			}),
		})),
	};
}

function isUnsafeOptionalChainReplacementContext(conditionalExpression) {
	const node = getOutermostTypeScriptExpression(conditionalExpression);
	const {parent} = node;

	return (
		(
			parent.type === 'UnaryExpression'
			&& parent.operator === 'delete'
			&& parent.argument === node
		)
		|| (
			parent.type === 'CallExpression'
			&& parent.callee === node
		)
		|| (
			parent.type === 'TaggedTemplateExpression'
			&& parent.tag === node
		)
	);
}

function getNullishTernaryProblem(conditionalExpression, context) {
	const {test, consequent, alternate} = conditionalExpression;
	const nullishTest = getNullishTest(test, context);

	if (
		!nullishTest
		|| hasNonDirectiveComment(context, conditionalExpression)
	) {
		return;
	}

	const {reference} = nullishTest;

	// The test and the branch can spell the same reference differently, for example `b?.c == null ? undefined : b.c`. The test's spelling is the safe one to keep.
	if (
		nullishTest.isTrueWhenNullish
		&& isSameNode(reference, alternate, context)
	) {
		return getProblem({
			context,
			conditionalExpression,
			left: reference,
			right: consequent,
			operators: ['??'],
		});
	}

	if (
		!nullishTest.isTrueWhenNullish
		&& isSameNode(reference, consequent, context)
	) {
		return getProblem({
			context,
			conditionalExpression,
			left: reference,
			right: alternate,
			operators: ['??'],
		});
	}

	const nullishBranch = nullishTest.isTrueWhenNullish ? consequent : alternate;
	const nonNullishBranch = nullishTest.isTrueWhenNullish ? alternate : consequent;

	if (
		!isUndefined(nullishBranch)
		|| !isMemberExpression(nonNullishBranch)
		|| nonNullishBranch.optional
		|| !isSameReference(unwrapTypeScriptExpression(reference), unwrapTypeScriptExpression(nonNullishBranch.object))
		|| isUnsafeOptionalChainReplacementContext(conditionalExpression)
	) {
		return;
	}

	const optionalChainText = getOptionalChainText(nonNullishBranch, context);

	return getCommentSafeProblem(context, {
		node: conditionalExpression,
		messageId: MESSAGE_ID_OPTIONAL_CHAIN_ERROR,
		suggest: [
			{
				messageId: MESSAGE_ID_OPTIONAL_CHAIN_SUGGESTION,
				fix(fixer) {
					let text = optionalChainText;

					if (needsSemicolon(context.sourceCode.getTokenBefore(conditionalExpression), context, text)) {
						text = `;${text}`;
					}

					return fixer.replaceText(conditionalExpression, text);
				},
			},
		],
	});
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;

	context.on('ConditionalExpression', conditionalExpression => {
		const {test, consequent, alternate} = conditionalExpression;
		const hasTwoBooleanLiteralBranches = isBooleanLiteral(consequent) && isBooleanLiteral(alternate);
		if (
			hasTwoBooleanLiteralBranches
			|| (
				sourceCode.getAncestors(conditionalExpression).every(node => node.type !== 'WithStatement')
				&& getBooleanConstantValue(consequent, context) !== undefined
				&& getBooleanConstantValue(alternate, context) !== undefined
			)
		) {
			return;
		}

		const booleanTernaryProblem = getBooleanTernaryProblem(conditionalExpression, context);

		if (booleanTernaryProblem) {
			return booleanTernaryProblem;
		}

		const nullishTernaryProblem = getNullishTernaryProblem(conditionalExpression, context);

		if (nullishTernaryProblem) {
			return nullishTernaryProblem;
		}

		// `foo ? foo : bar`
		if (isSameNode(test, consequent, context)) {
			return getProblem({
				context,
				conditionalExpression,
				left: test,
				right: alternate,
			});
		}

		// `!bar ? foo : bar`
		if (
			test.type === 'UnaryExpression'
			&& test.operator === '!'
			&& test.prefix
			&& isSameNode(test.argument, alternate, context)
		) {
			return getProblem({
				context,
				conditionalExpression,
				left: test.argument,
				right: consequent,
			});
		}
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using a logical operator over a ternary.',
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
