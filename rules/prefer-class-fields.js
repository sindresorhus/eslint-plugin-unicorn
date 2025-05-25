import getIndentString from './utils/get-indent-string.js';

const MESSAGE_ID_ERROR = 'prefer-class-fields/error';
const MESSAGE_ID_SUGGESTION = 'prefer-class-fields/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]:
		'Prefer class field declaration over `this` assignment in constructor for static values.',
	[MESSAGE_ID_SUGGESTION]:
		'Encountered same-named class field declaration and `this` assignment in constructor. Replace the class field declaration with the value from `this` assignment.',
};

const WHITELIST_NODES_PRECEDING_THIS_ASSIGNMENT = new Set(['EmptyStatement', 'ExpressionStatement']);

/**
@param {import('eslint').Rule.Node} node
@param {import('eslint').Rule.RuleContext['sourceCode']} sourceCode
@param {import('eslint').Rule.RuleFixer} fixer
*/
const removeFieldAssignment = (node, sourceCode, fixer) => {
	const {line} = sourceCode.getLoc(node).start;
	const nodeText = sourceCode.getText(node);
	const lineText = sourceCode.lines[line - 1];
	const isOnlyNodeOnLine = lineText.trim() === nodeText;

	return isOnlyNodeOnLine
		? fixer.removeRange([
			sourceCode.getIndexFromLoc({line, column: 0}),
			sourceCode.getIndexFromLoc({line: line + 1, column: 0}),
		])
		: fixer.remove(node);
};

/**
@param {string} propertyName
@param {string} propertyValue
@param {import('estree').ClassBody} classBody
@param {import('estree').MethodDefinition} constructor
@param {import('eslint').Rule.RuleContext['sourceCode']} sourceCode
@param {import('eslint').Rule.RuleFixer} fixer
*/
const addClassFieldDeclaration = (
	propertyName,
	propertyValue,
	classBody,
	constructor,
	sourceCode,
	fixer,
) => {
	const classBodyRange = sourceCode.getRange(classBody);
	const classBodyStartRange = [classBodyRange[0], classBodyRange[0] + 1];
	const indent = getIndentString(constructor, sourceCode);
	return fixer.insertTextAfterRange(
		classBodyStartRange,
		`\n${indent}${propertyName} = ${propertyValue};`,
	);
};

/**
@type {import('eslint').Rule.RuleModule['create']}
*/
const create = context => {
	const {sourceCode} = context;

	return {
		ClassBody(classBody) {
			const constructor = classBody.body.find(node =>
				node.kind === 'constructor'
				&& !node.computed
				&& !node.static
				&& node.type === 'MethodDefinition'
				&& node.value.type === 'FunctionExpression'
			);

			if (!constructor) {
				return;
			}

			const constructorBody = constructor.value.body.body;

			const firstInvalidProperty = constructorBody.findIndex(
				node => !WHITELIST_NODES_PRECEDING_THIS_ASSIGNMENT.has(node.type),
			);
			const lastValidPropertyIndex
				= firstInvalidProperty === -1
					? constructorBody.length - 1
					: firstInvalidProperty - 1;

			for (
				let index = lastValidPropertyIndex;
				index >= 0;
				index--
			) {
				const node = constructorBody[index];
				if (
					node.type === 'ExpressionStatement'
					&& node.expression.type === 'AssignmentExpression'
					&& node.expression.operator === '='
					&& node.expression.left.type === 'MemberExpression'
					&& node.expression.left.object.type === 'ThisExpression'
					&& !node.expression.left.computed
					&& node.expression.left.property.type === 'Identifier'
					&& node.expression.right.type === 'Literal'
				) {
					const propertyName = node.expression.left.property.name;
					const propertyValue = node.expression.right.raw;
					const existingProperty = classBody.body.find(node =>
						node.type === 'PropertyDefinition'
						&& !node.computed
						&& !node.static
						&& node.key.type === 'Identifier'
						&& node.key.name === propertyName
					);

					const problem = {
						node,
						messageId: MESSAGE_ID_ERROR,
					};

					if (existingProperty) {
						if (existingProperty.value) {
							problem.suggest = [
								{
									messageId: MESSAGE_ID_SUGGESTION,
									data: {
										propertyName,
										// Class expression does not have name, e.g. const a = class {}
										className: classBody.parent?.id?.name ?? '',
									},
									/**
									@param {import('eslint').Rule.RuleFixer} fixer
									*/
									* fix(fixer) {
										yield removeFieldAssignment(node, sourceCode, fixer);
										fixer.replaceText(existingProperty.value, propertyValue);
									}
								}
							]
						} else {
							/**
							@param {import('eslint').Rule.RuleFixer} fixer
							*/
							problem.fix = function * (fixer) {
								yield removeFieldAssignment(node, sourceCode, fixer);
								yield fixer.insertTextAfter(existingProperty.key, ` = ${propertyValue}`);
							}
						}
					} else {
						/**
						@param {import('eslint').Rule.RuleFixer} fixer
						*/
						problem.fix = function * (fixer) {
							yield removeFieldAssignment(node, sourceCode, fixer);
							yield addClassFieldDeclaration(
								propertyName,
								propertyValue,
								classBody,
								constructor,
								sourceCode,
								fixer,
							);
						}
					}

					return problem;
				}
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer class field declarations over `this` assignments in constructors.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
