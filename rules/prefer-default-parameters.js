import {findVariable} from '@eslint-community/eslint-utils';
import {functionTypes, getStaticStringValue} from './ast/index.js';
import {getVisitorChildNodes} from './utils/index.js';

const MESSAGE_ID = 'preferDefaultParameters';
const MESSAGE_ID_SUGGEST = 'preferDefaultParametersSuggest';
const MESSAGE_ID_PARAMETER_FALLBACK = 'preferDefaultParameterOverFallback';
const MESSAGE_ID_DESTRUCTURING_FALLBACK = 'preferDestructuringDefaultOverFallback';
const MESSAGE_ID_SUGGEST_DECLARATION = 'moveDefaultToDeclaration';

const isStaticDefaultValue = node => node.type === 'Literal' || getStaticStringValue(node) !== undefined;

const getDefaultAssignment = (left, right, operator = '=') => {
	if (!left || !right || left.type !== 'Identifier') {
		return;
	}

	if (
		operator === '='
		&& right.type === 'LogicalExpression'
		&& (right.operator === '||' || right.operator === '??')
		&& right.left.type === 'Identifier'
		&& isStaticDefaultValue(right.right)
	) {
		return {
			assignedIdentifier: left,
			parameterIdentifier: right.left,
			defaultValue: right.right,
		};
	}

	if ((operator === '||=' || operator === '??=') && isStaticDefaultValue(right)) {
		return {
			assignedIdentifier: left,
			parameterIdentifier: left,
			defaultValue: right,
		};
	}
};

// Call-like expressions that may run side effects before the default-assignment.
const callLikeExpressionTypes = new Set([
	'CallExpression',
	'NewExpression',
	'ImportExpression',
	'TaggedTemplateExpression',
]);

const containsCallExpression = (sourceCode, node) => {
	if (callLikeExpressionTypes.has(node.type)) {
		return true;
	}

	return getVisitorChildNodes(node, sourceCode.visitorKeys).some(child => containsCallExpression(sourceCode, child));
};

const hasSideEffects = (sourceCode, function_, node) => {
	for (const element of function_.body.body) {
		if (element === node) {
			break;
		}

		// Function call before default-assignment
		if (containsCallExpression(sourceCode, element)) {
			return true;
		}
	}

	return false;
};

const hasExtraReferences = (isAssignment, references, left) => {
	// Parameter is referenced prior to default-assignment
	if (isAssignment && references[0].identifier !== left) {
		return true;
	}

	// Old parameter is still referenced somewhere else
	return !isAssignment && references.length > 1;
};

const needsParentheses = (sourceCode, function_) => {
	if (function_.type !== 'ArrowFunctionExpression' || function_.params.length > 1) {
		return false;
	}

	const [parameter] = function_.params;
	const before = sourceCode.getTokenBefore(parameter);

	return !before || before.value !== '(';
};

/**
@param {import('eslint').Rule.RuleFixer} fixer
*/
const fixDefaultExpression = (fixer, sourceCode, node) => {
	const {line} = sourceCode.getLoc(node).start;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;

	if (isOnlyNodeOnLine) {
		return fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		]);
	}

	const [start, end] = sourceCode.getRange(node);
	if (sourceCode.text[end] === ' ') {
		return fixer.removeRange([start, end + 1]);
	}

	return fixer.remove(node);
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	const functionStack = [];
	const reportedVariables = new Set();

	const getDefaultReadProblem = (variable, node) => {
		const [definition] = variable.defs;
		if (
			variable.defs.length !== 1
			|| definition.node !== node
			|| (definition.type !== 'Parameter' && definition.type !== 'Variable')
			|| (definition.type === 'Variable' && (node.parent.kind === 'var' || node.parent.parent.type === 'ExportNamedDeclaration'))
			|| reportedVariables.has(variable)
		) {
			return;
		}

		const binding = definition.name;
		const isDestructuring = binding.parent.type === 'ArrayPattern'
			|| (binding.parent.type === 'Property' && binding.parent.parent.type === 'ObjectPattern');

		if (
			!isDestructuring
			&& (
				definition.type !== 'Parameter'
				|| node.params.at(-1) !== binding
				|| (node.body.type === 'BlockStatement' && node.body.body.some(statement => statement.directive === 'use strict'))
			)
		) {
			return;
		}

		const references = variable.references.filter(reference => !reference.init);
		if (references.length === 0 || references.some(reference => !reference.isReadOnly())) {
			return;
		}

		const expressions = references.map(reference => reference.identifier.parent);
		const [firstExpression] = expressions;
		if (expressions.some((expression, index) =>
			expression.type !== 'LogicalExpression'
			|| (expression.operator !== '??' && expression.operator !== '||')
			|| expression.left !== references[index].identifier
			|| !isStaticDefaultValue(expression.right)
			|| expression.right.regex
			|| expression.operator !== firstExpression.operator
			|| !Object.is(getStaticStringValue(expression.right) ?? expression.right.value, getStaticStringValue(firstExpression.right) ?? firstExpression.right.value),
		)) {
			return;
		}

		return {
			node: binding,
			messageId: isDestructuring ? MESSAGE_ID_DESTRUCTURING_FALLBACK : MESSAGE_ID_PARAMETER_FALLBACK,
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST_DECLARATION,
				* fix(fixer, {abort}) {
					if (
						sourceCode.getCommentsInside(binding).length > 0
						|| expressions.some(expression => sourceCode.getCommentsInside(expression).length > 0)
					) {
						return abort();
					}

					const typeAnnotationText = binding.typeAnnotation ? sourceCode.getText(binding.typeAnnotation) : '';
					let replacement = `${binding.name}${typeAnnotationText} = ${sourceCode.getText(firstExpression.right)}`;
					if (!isDestructuring && needsParentheses(sourceCode, node)) {
						replacement = `(${replacement})`;
					}

					yield fixer.replaceText(binding, replacement);
					for (const expression of expressions) {
						yield fixer.replaceText(expression, sourceCode.getText(expression.left));
					}
				},
			}],
		};
	};

	function * getDefaultReadProblems(node) {
		for (const variable of sourceCode.getDeclaredVariables(node)) {
			yield getDefaultReadProblem(variable, node);
		}
	}

	const getDefaultParameterProblem = (node, left, right, operator) => {
		const currentFunction = functionStack.at(-1);
		const defaultAssignment = getDefaultAssignment(left, right, operator);

		if (
			!currentFunction
			|| !defaultAssignment
			|| node.parent !== currentFunction.body
			|| currentFunction.body.body.some(statement => statement.directive === 'use strict')
		) {
			return;
		}

		const {
			assignedIdentifier,
			parameterIdentifier: {name: parameterName},
			defaultValue,
		} = defaultAssignment;
		const defaultValueText = sourceCode.getText(defaultValue);
		const {name: assignedName} = assignedIdentifier;
		const isAssignment = node.type === 'ExpressionStatement';

		// Parameter is reassigned to a different identifier
		if (isAssignment && assignedName !== parameterName) {
			return;
		}

		const scope = sourceCode.getScope(node);
		const variable = findVariable(scope, parameterName);

		// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1122
		// But can't reproduce, just ignore this case
		/* node:coverage ignore next 3 */
		if (!variable) {
			return;
		}

		const {references} = variable;
		const {params} = currentFunction;
		const parameter = params.at(-1);

		// See 'default-param-last' rule
		if (parameter?.type !== 'Identifier' || parameter.name !== parameterName) {
			return;
		}

		const assignedVariable = assignedName === parameterName ? variable : findVariable(scope, assignedName);
		const hasParameterNameCollision = assignedVariable.defs.some(definition =>
			definition.type === 'Parameter'
			&& definition.name !== parameter);

		if (
			hasSideEffects(sourceCode, currentFunction, node)
			|| hasExtraReferences(isAssignment, references, left)
			|| hasParameterNameCollision
		) {
			return;
		}

		const typeAnnotation = isAssignment ? parameter.typeAnnotation : assignedIdentifier.typeAnnotation;
		const parameterText = typeAnnotation
			? `${assignedName}${sourceCode.getText(typeAnnotation)}`
			: assignedName;
		const replacement = needsParentheses(sourceCode, currentFunction)
			? `(${parameterText} = ${defaultValueText})`
			: `${parameterText} = ${defaultValueText}`;
		reportedVariables.add(variable);

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: [{
				messageId: MESSAGE_ID_SUGGEST,
				* fix(fixer, {abort}) {
					if (
						sourceCode.getCommentsInside(node).length > 0
						|| sourceCode.getCommentsInside(parameter).length > 0
					) {
						return abort();
					}

					yield fixer.replaceText(parameter, replacement);
					yield fixDefaultExpression(fixer, sourceCode, node);
				},
			}],
		};
	};

	context.on(functionTypes, node => {
		functionStack.push(node);
	});

	context.onExit(functionTypes, function * (node) {
		functionStack.pop();
		yield * getDefaultReadProblems(node);
	});

	context.onExit('VariableDeclarator', getDefaultReadProblems);

	context.on('AssignmentExpression', node => {
		if (node.parent.type === 'ExpressionStatement' && node.parent.expression === node) {
			return getDefaultParameterProblem(node.parent, node.left, node.right, node.operator);
		}
	});

	context.on('VariableDeclarator', node => {
		if (node.parent.type === 'VariableDeclaration' && node.parent.declarations.length === 1) {
			return getDefaultParameterProblem(node.parent, node.id, node.init);
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
			description: 'Prefer default parameters and destructuring defaults over reassignment and fallback expressions.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.',
			[MESSAGE_ID_SUGGEST]: 'Replace reassignment with default parameter.',
			[MESSAGE_ID_PARAMETER_FALLBACK]: 'Prefer a default parameter over fallback expressions.',
			[MESSAGE_ID_DESTRUCTURING_FALLBACK]: 'Prefer a destructuring default over fallback expressions.',
			[MESSAGE_ID_SUGGEST_DECLARATION]: 'Move the default value to the declaration.',
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
