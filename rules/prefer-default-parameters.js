import {findVariable} from '@eslint-community/eslint-utils';
import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'preferDefaultParameters';
const MESSAGE_ID_SUGGEST = 'preferDefaultParametersSuggest';

const getDefaultAssignment = (left, right, operator = '=') => {
	if (!left || !right || left.type !== 'Identifier') {
		return;
	}

	if (
		operator === '='
		&& right.type === 'LogicalExpression'
		&& (right.operator === '||' || right.operator === '??')
		&& right.left.type === 'Identifier'
		&& right.right.type === 'Literal'
	) {
		return {
			assignedIdentifier: left,
			parameterIdentifier: right.left,
			defaultValue: right.right,
		};
	}

	if ((operator === '||=' || operator === '??=') && right.type === 'Literal') {
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
	if (!node) {
		return false;
	}

	if (callLikeExpressionTypes.has(node.type)) {
		return true;
	}

	const keys = sourceCode.visitorKeys[node.type];

	for (const key of keys) {
		const value = node[key];

		if (Array.isArray(value)) {
			for (const element of value) {
				if (containsCallExpression(sourceCode, element)) {
					return true;
				}
			}
		} else if (containsCallExpression(sourceCode, value)) {
			return true;
		}
	}

	return false;
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

const hasExtraReferences = (assignment, references, left) => {
	// Parameter is referenced prior to default-assignment
	if (assignment && references[0].identifier !== left) {
		return true;
	}

	// Old parameter is still referenced somewhere else
	return !assignment && references.length > 1;
};

const isLastParameter = (parameters, parameter) => {
	const lastParameter = parameters.at(-1);

	// See 'default-param-last' rule
	return parameter && parameter === lastParameter;
};

const needsParentheses = (sourceCode, function_) => {
	if (function_.type !== 'ArrowFunctionExpression' || function_.params.length > 1) {
		return false;
	}

	const [parameter] = function_.params;
	const before = sourceCode.getTokenBefore(parameter);
	const after = sourceCode.getTokenAfter(parameter);

	return !after || !before || before.value !== '(' || after.value !== ')';
};

/** @param {import('eslint').Rule.RuleFixer} fixer */
const fixDefaultExpression = (fixer, sourceCode, node) => {
	const {line} = sourceCode.getLoc(node).start;
	const {column} = sourceCode.getLoc(node).end;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;

	if (isOnlyNodeOnLine) {
		return fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		]);
	}

	const isEndsWithWhitespace = lineText[column] === ' ';
	if (isEndsWithWhitespace) {
		const [start, end] = sourceCode.getRange(node);
		return fixer.removeRange([start, end + 1]);
	}

	return fixer.remove(node);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const functionStack = [];

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
			assignedIdentifier: {name: assignedName},
			parameterIdentifier: {name: parameterName},
			defaultValue: {raw: defaultValueText},
		} = defaultAssignment;
		const isAssignment = node.type === 'ExpressionStatement';

		// Parameter is reassigned to a different identifier
		if (isAssignment && assignedName !== parameterName) {
			return;
		}

		const variable = findVariable(sourceCode.getScope(node), parameterName);

		// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1122
		// But can't reproduce, just ignore this case
		/* c8 ignore next 3 */
		if (!variable) {
			return;
		}

		const {references} = variable;
		const {params} = currentFunction;
		const parameter = params.find(parameter =>
			parameter.type === 'Identifier'
			&& parameter.name === parameterName);
		const hasParameterNameCollision = !isAssignment && params.some(candidate =>
			candidate !== parameter
			&& (candidate.type !== 'Identifier' || candidate.name === assignedName));

		if (
			hasSideEffects(sourceCode, currentFunction, node)
			|| hasExtraReferences(isAssignment, references, left)
			|| hasParameterNameCollision
			|| !isLastParameter(params, parameter)
		) {
			return;
		}

		const parameterText = parameter.typeAnnotation
			? `${assignedName}${sourceCode.getText(parameter.typeAnnotation)}`
			: assignedName;
		const replacement = needsParentheses(sourceCode, currentFunction)
			? `(${parameterText} = ${defaultValueText})`
			: `${parameterText} = ${defaultValueText}`;

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

	context.onExit(functionTypes, () => {
		functionStack.pop();
	});

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

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer default parameters over reassignment.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Prefer default parameters over reassignment.',
			[MESSAGE_ID_SUGGEST]: 'Replace reassignment with default parameter.',
		},
		languages: [
			'js/js',
		],
	},
};

export default config;
