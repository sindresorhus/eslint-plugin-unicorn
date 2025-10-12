import {isSemicolonToken} from '@eslint-community/eslint-utils';
import getIndentString from './utils/get-indent-string.js';

const MESSAGE_ID_ERROR = 'prefer-class-fields/error';
const MESSAGE_ID_SUGGESTION = 'prefer-class-fields/suggestion';
const messages = {
	[MESSAGE_ID_ERROR]:
		'Prefer class field declaration over `this` assignment in constructor for static values.',
	[MESSAGE_ID_SUGGESTION]:
		'Encountered same-named class field declaration and `this` assignment in constructor. Replace the class field declaration with the value from `this` assignment.',
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
				&& node.value.type === 'FunctionExpression',
			);

			if (!constructor) {
				return;
			}

			const node = constructor.value.body.body.find(node => node.type !== 'EmptyStatement');

			if (!(
				node?.type === 'ExpressionStatement'
				&& node.expression.type === 'AssignmentExpression'
				&& node.expression.operator === '='
				&& node.expression.left.type === 'MemberExpression'
				&& node.expression.left.object.type === 'ThisExpression'
				&& !node.expression.left.computed
				&& ['Identifier', 'PrivateIdentifier'].includes(node.expression.left.property.type)
				&& node.expression.right.type === 'Literal'
			)) {
				return;
			}

			const propertyName = node.expression.left.property.name;
			const propertyValue = node.expression.right.raw;
			const propertyType = node.expression.left.property.type;
			const existingProperty = classBody.body.find(node =>
				node.type === 'PropertyDefinition'
				&& !node.computed
				&& !node.static
				&& node.key.type === propertyType
				&& node.key.name === propertyName,
			);

			const problem = {
				node,
				messageId: MESSAGE_ID_ERROR,
			};

			/**
			@param {import('eslint').Rule.RuleFixer} fixer
			*/
			function * fix(fixer) {
				yield removeFieldAssignment(node, sourceCode, fixer);

				if (existingProperty) {
					if (existingProperty.value) {
						yield fixer.replaceText(existingProperty.value, propertyValue);
						return;
					}

					const text = ` = ${propertyValue}`;
					const lastToken = sourceCode.getLastToken(existingProperty);
					if (isSemicolonToken(lastToken)) {
						yield fixer.insertTextBefore(lastToken, text);
						return;
					}

					yield fixer.insertTextAfter(existingProperty, `${text};`);
					return;
				}

				const closingBrace = sourceCode.getLastToken(classBody);
				const indent = getIndentString(constructor, sourceCode);

				let text = `${indent}${propertyName} = ${propertyValue};\n`;

				const characterBefore = sourceCode.getText()[sourceCode.getRange(closingBrace)[0] - 1];
				if (characterBefore !== '\n') {
					text = `\n${text}`;
				}

				const lastProperty = classBody.body.at(-1);
				if (
					lastProperty.type === 'PropertyDefinition'
					&& sourceCode.getLastToken(lastProperty).value !== ';'
				) {
					text = `;${text}`;
				}

				yield fixer.insertTextBefore(closingBrace, text);
			}

			if (existingProperty?.value) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						fix,
					},
				];
				return problem;
			}

			problem.fix = fix;
			return problem;
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
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
