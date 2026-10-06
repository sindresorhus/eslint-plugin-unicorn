import {findVariable} from '@eslint-community/eslint-utils';
import {functionTypes, getStaticStringValue} from './ast/index.js';
import {getVisitorChildNodes, withTypeInformation} from './utils/index.js';

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
	) {
		return {
			assignedIdentifier: left,
			parameterIdentifier: right.left,
			defaultValue: right.right,
		};
	}

	if (operator === '||=' || operator === '??=') {
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
	const isTypeScriptParser = Boolean(sourceCode.parserServices?.esTreeNodeToTSNodeMap);
	const functionStack = [];
	const reportedVariables = new Set();

	const isDefaultValueAssignable = (binding, defaultValue) => withTypeInformation(
		binding.typeAnnotation?.typeAnnotation ?? binding,
		context,
		({type, checker}) => {
			const defaultValueDeclaration = defaultValue.type === 'Identifier'
				? findVariable(sourceCode.getScope(defaultValue), defaultValue).defs[0].name
				: defaultValue;
			const defaultValueType = sourceCode.parserServices.getTypeAtLocation(defaultValueDeclaration);
			// A declaration default cannot rely on type narrowing at a fallback read.
			return checker.isTypeAssignableTo(defaultValueType, type)
				&& checker.isTypeAssignableTo(defaultValueType, sourceCode.parserServices.getTypeAtLocation(defaultValue));
		},
	) !== false;

	const isEarlierBinding = (fallback, variable) => {
		if (fallback.type !== 'Identifier' || variable.defs.length !== 1) {
			return false;
		}

		const fallbackVariable = findVariable(sourceCode.getScope(fallback), fallback);
		const [definition] = fallbackVariable?.defs ?? [];
		return fallbackVariable?.defs.length === 1
			&& definition.type === variable.defs[0].type
			&& definition.node === variable.defs[0].node
			&& sourceCode.getRange(definition.name)[0] < sourceCode.getRange(variable.defs[0].name)[0]
			&& fallbackVariable.references.every(reference => !reference.isWrite() || reference.init);
	};

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
			|| (!isStaticDefaultValue(expression.right) && !isEarlierBinding(expression.right, variable))
			|| expression.right.regex
			|| expression.operator !== firstExpression.operator
			|| ((expression.right.type === 'Identifier') !== (firstExpression.right.type === 'Identifier'))
			|| (expression.right.type === 'Identifier'
				? expression.right.name !== firstExpression.right.name
				: !Object.is(getStaticStringValue(expression.right) ?? expression.right.value, getStaticStringValue(firstExpression.right) ?? firstExpression.right.value)),
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
						|| (!isDestructuring && isTypeScriptParser && node.parent.kind === 'set')
						|| expressions.some(expression => !isDefaultValueAssignable(binding, expression.right))
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
		if (!context.options[0].checkFallbackExpressions) {
			return;
		}

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
		if (
			parameter?.type !== 'Identifier'
			|| parameter.name !== parameterName
			|| (!isStaticDefaultValue(defaultValue) && !isEarlierBinding(defaultValue, variable))
			|| (!isAssignment && isTypeScriptParser)
		) {
			return;
		}

		const assignedVariable = assignedName === parameterName ? variable : findVariable(scope, assignedName);
		const hasParameterNameCollision = assignedVariable.defs.some(definition =>
			definition.type === 'Parameter'
			&& definition.name !== parameter);
		// Parameter defaults may refer to an outer variable with the new parameter name.
		const hasParameterNameCapture = !isAssignment && assignedVariable.scope.through.some(reference => reference.identifier.name === assignedName);

		if (
			hasSideEffects(sourceCode, currentFunction, node)
			|| hasExtraReferences(isAssignment, references, left)
			|| hasParameterNameCollision
			|| hasParameterNameCapture
		) {
			return;
		}

		const typeAnnotation = isAssignment ? parameter.typeAnnotation : assignedIdentifier.typeAnnotation;
		const parameterText = typeAnnotation
			? `${assignedName}${sourceCode.getText(typeAnnotation)}`
			: assignedName;
		const defaultValueText = sourceCode.getText(defaultValue);
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
						|| (isTypeScriptParser && currentFunction.parent.kind === 'set')
						|| !isDefaultValueAssignable(parameter, defaultValue)
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
		if (node.parent.type === 'VariableDeclaration' && node.parent.kind === 'const' && node.parent.declarations.length === 1) {
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
		schema: [{
			type: 'object',
			properties: {
				checkFallbackExpressions: {
					type: 'boolean',
					description: 'Check fallback reads in parameters and destructured variables.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{checkFallbackExpressions: true}],
		messages: {
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.',
			[MESSAGE_ID_SUGGEST]: 'Replace reassignment with a default parameter. This changes fallback behavior to apply only to undefined.',
			[MESSAGE_ID_PARAMETER_FALLBACK]: 'Prefer a default parameter over fallback expressions.',
			[MESSAGE_ID_DESTRUCTURING_FALLBACK]: 'Prefer a destructuring default over fallback expressions.',
			[MESSAGE_ID_SUGGEST_DECLARATION]: 'Move the default value to the declaration. This changes fallback behavior to apply only to undefined.',
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
