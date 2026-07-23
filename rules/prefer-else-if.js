import {hasSideEffect} from '@eslint-community/eslint-utils';
import {isUndefined, isFunction} from './ast/index.js';
import {isBoolean, isBranchExit, trackBranchExits} from './utils/index.js';
import {
	containsOptionalChain,
	isSame,
	unwrapExpression,
} from './utils/comparison.js';

/**
@import {TSESTree as ESTree} from '@typescript-eslint/types';
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-else-if';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID]: 'Prefer `else if` over an adjacent `if` with a related condition.',
	[MESSAGE_ID_SUGGESTION]: 'Insert `else` before this `if`.',
};

const statementListParentTypes = new Set([
	'Program',
	'BlockStatement',
	'StaticBlock',
	'SwitchCase',
]);

const staticReferenceRootTypes = new Set([
	'Identifier',
	'ThisExpression',
	'Super',
]);

/**
@param {unknown} value
@returns {string}
*/
const getStaticEqualityValueKey = value => {
	if (typeof value === 'bigint') {
		return `bigint:${value}`;
	}

	return `${typeof value}:${value}`;
};

/**
@param {ESTree.Expression} node
@returns {string}
*/
const getStaticEqualityNodeKey = node => {
	if (isUndefined(node)) {
		return getStaticEqualityValueKey();
	}

	if (node.type === 'Literal' && node.bigint) {
		return `bigint:${node.bigint}`;
	}

	return getStaticEqualityValueKey(node.value);
};

/**
@param {ESTree.Expression} node
@returns {boolean}
*/
const isStaticEqualityValue = node => (
	(
		node.type === 'Literal'
		&& !node.regex
	)
	|| isUndefined(node)
);

/**
@param {ESTree.MemberExpression} node
@returns {boolean}
*/
const isStaticMemberProperty = node => (
	(
		node.property.type === 'Identifier'
		&& !node.computed
	)
	|| (
		node.property.type === 'PrivateIdentifier'
		&& !node.computed
	)
	|| (
		node.computed
		&& node.property.type === 'Literal'
		&& !node.property.regex
	)
);

/**
@param {ESTree.Expression} node
@returns {boolean}
*/
function isStaticReference(node) {
	node = unwrapExpression(node);

	if (staticReferenceRootTypes.has(node.type)) {
		return true;
	}

	return node.type === 'MemberExpression'
		&& isStaticMemberProperty(node)
		&& isStaticReference(node.object);
}

/**
@param {ESTree.Expression} node
@returns {ESTree.BinaryExpression[]}
*/
function getEqualityComparisons(node) {
	const nodes = [node];
	const comparisons = [];

	while (nodes.length > 0) {
		node = nodes.pop();

		if (node.type === 'LogicalExpression' && node.operator === '||') {
			nodes.push(node.right, node.left);
			continue;
		}

		if (node.type !== 'BinaryExpression' || node.operator !== '===') {
			return [];
		}

		comparisons.push(node);
	}

	return comparisons;
}

/**
@typedef {{
	discriminant: ESTree.Expression,
	valueKeys: Set<string>,
}} ComparisonInfo
*/

/**
@param {ESTree.Expression} node
@param {ESLint.Rule.RuleContext} context
@returns {ComparisonInfo | undefined}
*/
function getBooleanComparisonInfo(node, context) {
	node = unwrapExpression(node);
	let isValue = true;

	while (
		node.type === 'UnaryExpression'
		&& node.operator === '!'
	) {
		isValue = !isValue;
		node = unwrapExpression(node.argument);
	}

	if (
		node.type === 'CallExpression'
		&& node.callee.type === 'Identifier'
		&& node.callee.name === 'Boolean'
		&& node.arguments.length === 1
		&& context.sourceCode.isGlobalReference(node.callee)
	) {
		node = unwrapExpression(node.arguments[0]);
	}

	if (
		containsOptionalChain(node)
		|| !isStaticReference(node)
		|| !isBoolean(node, context)
	) {
		return;
	}

	return {
		discriminant: node,
		valueKeys: new Set([getStaticEqualityValueKey(isValue)]),
	};
}

/**
@param {ESTree.Expression} node
@param {ESLint.Rule.RuleContext} context
@returns {ComparisonInfo | undefined}
*/
function getComparisonInfo(node, context) {
	const booleanComparisonInfo = getBooleanComparisonInfo(node, context);
	if (booleanComparisonInfo) {
		return booleanComparisonInfo;
	}

	const comparisons = getEqualityComparisons(node);

	if (comparisons.length === 0) {
		return;
	}

	let discriminant;
	const valueKeys = new Set();

	for (const {left, right} of comparisons) {
		const leftIsStaticValue = isStaticEqualityValue(left);
		const rightIsStaticValue = isStaticEqualityValue(right);

		if (leftIsStaticValue === rightIsStaticValue) {
			return;
		}

		const candidate = leftIsStaticValue ? right : left;

		if (
			containsOptionalChain(candidate)
			|| !isStaticReference(candidate)
		) {
			return;
		}

		if (
			discriminant
			&& !isSame(discriminant, candidate)
		) {
			return;
		}

		discriminant ||= candidate;
		const value = leftIsStaticValue ? left : right;
		valueKeys.add(getStaticEqualityNodeKey(value));
	}

	return {
		discriminant,
		valueKeys,
	};
}

/**
Collect the `if` statements of an `if`/`else if` chain.

Returns `undefined` when the chain ends with an `else`, since the trailing `else` runs whenever no earlier branch matched, so the chain cannot be joined with an adjacent `if`.

@param {ESTree.IfStatement} ifStatement
@returns {ESTree.IfStatement[] | undefined}
*/
function getIfStatementChain(ifStatement) {
	const chain = [];

	for (let node = ifStatement; ; node = node.alternate) {
		chain.push(node);

		if (!node.alternate) {
			return chain;
		}

		if (node.alternate.type !== 'IfStatement') {
			return;
		}
	}
}

/**
@param {ESTree.IfStatement[]} chain
@param {ESLint.Rule.RuleContext} context
@returns {ComparisonInfo | undefined}
*/
function getChainComparisonInfo(chain, context) {
	let discriminant;
	const valueKeys = new Set();

	for (const {test} of chain) {
		const info = getComparisonInfo(test, context);

		if (
			!info
			|| (discriminant && !isSame(discriminant, info.discriminant))
		) {
			return;
		}

		discriminant ||= info.discriminant;

		for (const valueKey of info.valueKeys) {
			valueKeys.add(valueKey);
		}
	}

	return {
		discriminant,
		valueKeys,
	};
}

/**
@param {ESTree.Expression} node
@returns {ESTree.Expression[]}
*/
function getReferencePrefixes(node) {
	node = unwrapExpression(node);
	const prefixes = [node];

	while (node.type === 'MemberExpression') {
		node = unwrapExpression(node.object);
		prefixes.push(node);
	}

	return prefixes;
}

/**
@param {ESTree.Node} node
@returns {Generator<ESTree.Node>}
*/
function * getAssignmentTargets(node) {
	node = unwrapExpression(node);

	switch (node.type) {
		case 'Identifier':
		case 'MemberExpression': {
			yield node;
			break;
		}

		case 'AssignmentPattern':
		case 'RestElement': {
			yield * getAssignmentTargets(node.type === 'AssignmentPattern' ? node.left : node.argument);
			break;
		}

		case 'ArrayPattern': {
			for (const element of node.elements) {
				if (element) {
					yield * getAssignmentTargets(element);
				}
			}

			break;
		}

		case 'ObjectPattern': {
			for (const property of node.properties) {
				yield * getAssignmentTargets(property.type === 'Property' ? property.value : property.argument);
			}

			break;
		}

		// No default
	}
}

/**
@param {ESTree.Node} node
@returns {Generator<ESTree.Node>}
*/
function * getMutationTargets(node) {
	if (node.type === 'AssignmentExpression') {
		yield node.left;
		return;
	}

	if (node.type === 'UpdateExpression') {
		yield node.argument;
		return;
	}

	if (node.type === 'UnaryExpression' && node.operator === 'delete') {
		yield node.argument;
		return;
	}

	if (node.type === 'VariableDeclaration' && node.kind === 'var') {
		for (const declarator of node.declarations) {
			yield declarator.id;
		}

		return;
	}

	if (
		(
			node.type === 'ForInStatement'
			|| node.type === 'ForOfStatement'
		)
		&& node.left.type !== 'VariableDeclaration'
	) {
		yield node.left;
	}
}

/**
@param {ESTree.Node} node
@param {ESLint.SourceCode.VisitorKeys} visitorKeys
@returns {Generator<ESTree.Node>}
*/
function * traverse(node, visitorKeys) {
	if (!node || isFunction(node)) {
		return;
	}

	yield node;

	for (const key of visitorKeys[node.type] ?? []) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const child of value) {
				yield * traverse(child, visitorKeys);
			}
		} else if (value) {
			yield * traverse(value, visitorKeys);
		}
	}
}

/**
@param {ESTree.Node} node
@param {ESTree.Expression} discriminant
@param {ESLint.Rule.RuleContext} context
@returns {boolean}
*/
function hasDirectDiscriminantMutation(node, discriminant, context) {
	const discriminantReferences = getReferencePrefixes(discriminant);

	for (const childNode of traverse(node, context.sourceCode.visitorKeys)) {
		for (const target of getMutationTargets(childNode)) {
			for (const assignmentTarget of getAssignmentTargets(target)) {
				if (discriminantReferences.some(reference => isSame(assignmentTarget, reference))) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
@param {Set<string>} left
@param {Set<string>} right
@returns {boolean}
*/
const hasOverlappingValues = (left, right) => {
	for (const valueKey of left) {
		if (right.has(valueKey)) {
			return true;
		}
	}

	return false;
};

/**
@param {ESTree.IfStatement} ifStatement
@returns {(fixer: ESLint.Rule.RuleFixer) => ESLint.Rule.Fix}
*/
const fix = ifStatement => fixer => fixer.insertTextBefore(ifStatement, 'else ');

/**
@param {ComparisonInfo} previous
@param {ESTree.IfStatement[]} previousChain
@param {ESTree.IfStatement[]} chain
@param {ESLint.Rule.RuleContext} context
@returns {boolean}
*/
const canAutofix = (previous, previousChain, chain, context) => {
	const discriminant = unwrapExpression(previous.discriminant);
	const hasSideEffectOptions = {
		considerGetters: true,
		considerImplicitTypeConversion: true,
	};

	return discriminant.type === 'Identifier'
		&& previousChain.every(({consequent}) => !hasSideEffect(
			consequent,
			context.sourceCode,
			hasSideEffectOptions,
		))
		&& chain.every(({test}) => !hasSideEffect(test, context.sourceCode, hasSideEffectOptions));
};

/**
@param {ESTree.IfStatement} previousIfStatement
@param {ESTree.IfStatement} ifStatement
@param {ESLint.Rule.RuleContext} context
@param {(branch: ESTree.Node) => boolean} branchAlwaysExits
@returns {ESLint.Rule.ReportDescriptor | undefined}
*/
function getProblem(previousIfStatement, ifStatement, context, branchAlwaysExits) {
	const previousChain = getIfStatementChain(previousIfStatement);
	const chain = getIfStatementChain(ifStatement);

	if (
		!previousChain
		|| !chain
		|| previousChain.some(({consequent}) => branchAlwaysExits(consequent))
	) {
		return;
	}

	const previous = getChainComparisonInfo(previousChain, context);
	const current = getChainComparisonInfo(chain, context);

	if (
		!previous
		|| !current
		|| !isSame(previous.discriminant, current.discriminant)
		|| hasOverlappingValues(previous.valueKeys, current.valueKeys)
		|| previousChain.some(({consequent}) => hasDirectDiscriminantMutation(consequent, previous.discriminant, context))
	) {
		return;
	}

	const problem = {
		node: ifStatement,
		messageId: MESSAGE_ID,
	};
	const fixFunction = fix(ifStatement);

	if (canAutofix(previous, previousChain, chain, context)) {
		problem.fix = fixFunction;
	} else {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix: fixFunction,
			},
		];
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const branchAlwaysExits = trackBranchExits(context, branch => isBranchExit(branch, context, branchAlwaysExits));

	// Run on exit so all nested `if` statements have been visited and their branch exit
	// information is available before scanning each statement list.
	context.onExit([...statementListParentTypes], function * (node) {
		const body = node.type === 'SwitchCase' ? node.consequent : node.body;

		for (let index = 1; index < body.length; index++) {
			const previousStatement = body[index - 1];
			const statement = body[index];

			if (
				previousStatement.type !== 'IfStatement'
				|| statement.type !== 'IfStatement'
			) {
				continue;
			}

			yield getProblem(previousStatement, statement, context, branchAlwaysExits);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `else if` over adjacent `if` statements with related conditions.',
			recommended: true,
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
