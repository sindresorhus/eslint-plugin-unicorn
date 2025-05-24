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
@returns {node is import('estree').ExpressionStatement & {expression: import('estree').AssignmentExpression & {left: import('estree').MemberExpression & {object: import('estree').ThisExpression}}}}
*/
const isThisAssignmentExpression = node => {
	if (
		node.type !== 'ExpressionStatement'
		|| node.expression.type !== 'AssignmentExpression'
	) {
		return false;
	}

	const lhs = node.expression.left;

	if (!lhs.object || lhs.object.type !== 'ThisExpression') {
		return false;
	}

	return true;
};

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
@param {import('estree').ClassBody} classBody
*/
const findClassFieldNamed = (propertyName, classBody) => {
	for (const classBodyChild of classBody.body) {
		if (
			classBodyChild.type === 'PropertyDefinition'
			&& classBodyChild.key.type === 'Identifier'
			&& classBodyChild.key.name === propertyName
		) {
			return classBodyChild;
		}
	}
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
			const constructor = classBody.body.find(node => node.kind === 'constructor' && node.type === 'MethodDefinition');

			if (!constructor) {
				return;
			}

			const constructorBody = constructor.value.body?.body;

			if (!constructorBody) {
				return;
			}

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
					isThisAssignmentExpression(node)
					&& node.expression.right?.type === 'Literal'
					&& node.expression.operator === '='
					&& node.expression.left.property.type === 'Identifier'
					&& !node.expression.left.computed
				) {
					const propertyName = node.expression.left.property.name;
					const propertyValue = node.expression.right.raw;
					const alreadyExistingClassFieldDeclaration = findClassFieldNamed(
						propertyName,
						classBody,
					);

					if (alreadyExistingClassFieldDeclaration) {
						return {
							node,
							messageId: MESSAGE_ID_ERROR,
							suggest: [{
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
									yield fixer.replaceText(
										alreadyExistingClassFieldDeclaration,
										`${propertyName} = ${propertyValue};`,
									);
								},
							}],
						};
					}

					return {
						node,
						messageId: MESSAGE_ID_ERROR,

						/**
						@param {import('eslint').Rule.RuleFixer} fixer
						*/
						* fix(fixer) {
							yield removeFieldAssignment(node, sourceCode, fixer);
							yield addClassFieldDeclaration(
								propertyName,
								propertyValue,
								classBody,
								constructor,
								sourceCode,
								fixer,
							);
						},
					};
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
