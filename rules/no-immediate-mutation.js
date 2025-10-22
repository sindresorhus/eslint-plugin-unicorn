import {hasSideEffect, isCommaToken} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeExpressionStatement} from './fix/index.js';
import {
	getNextNode,
	getCallExpressionArgumentsText,
} from './utils/index.js';

const MESSAGE_ID_ARRAY_ERROR = 'error/array-mutation';
const MESSAGE_ID_ARRAY_SUGGESTION = 'suggestion/array';
const messages = {
	[MESSAGE_ID_ARRAY_ERROR]: 'Immediate array mutation after declaration is not allowed.',
	[MESSAGE_ID_ARRAY_SUGGESTION]: '{{operation}} elements to declaration.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('VariableDeclarator', variableDeclarator => {
		if (!(
			variableDeclarator.id.type === 'Identifier'
			&& variableDeclarator.init?.type === 'ArrayExpression'
		)) {
			return;
		}

		const variableDeclaration = variableDeclarator.parent;
		if (!(
			variableDeclaration.type === 'VariableDeclaration'
			&& variableDeclaration.kind === 'const'
			&& variableDeclaration.declarations.at(-1) === variableDeclarator
		)) {
			return ;
		}

		const expressionStatement = getNextNode(variableDeclaration, sourceCode);
		if (expressionStatement?.type !== 'ExpressionStatement') {
			return ;
		}

		const variableName = variableDeclarator.id.name;
		let callExpression = expressionStatement.expression;
		if (callExpression.type === 'ChainExpression') {
			callExpression = callExpression.expression;
		}
		if (!(
			isMethodCall(callExpression, {name: variableName, methods: ['push', 'unshift']})
			&& callExpression.arguments.length > 0
		)) {
			return;
		}


		const method = callExpression.callee.property;
		const problem = {
			node: method,
			messageId: MESSAGE_ID_ARRAY_ERROR,
			data: {description: 'array'},
		};

		const isPrepend = method.name === 'unshift';

		const fix = function * (fixer) {
			const arrayExpression = variableDeclarator.init;

			if (isPrepend) {
				const text = getCallExpressionArgumentsText(sourceCode, callExpression, /* includeTrailingComma */ false);

				yield fixer.insertTextAfter(
					sourceCode.getFirstToken(arrayExpression),
					`${text}, `,
				);
			} else {
				const text = getCallExpressionArgumentsText(sourceCode, callExpression);
				const [
					penultimateToken,
					closingBracketToken,
				] = sourceCode.getLastTokens(arrayExpression, 2);
				const shouldInserComma = arrayExpression.elements.length > 0 && !isCommaToken(penultimateToken);

				yield fixer.insertTextBefore(
					sourceCode.getLastToken(arrayExpression),
					`${shouldInserComma ? ',': ''} ${text}`,
				);
			}

			yield removeExpressionStatement(expressionStatement, fixer, context);
		};

		if (callExpression.arguments.some(element => hasSideEffect(element, sourceCode))) {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_ARRAY_SUGGESTION,
					fix,
					data: {operation: isPrepend ? 'Prepend' : 'Append'},
				},
			];
		} else {
			problem.fix = fix;
		}

		return problem;


	})


	return {
		Literal(node) {
			if (node.value !== 'unicorn') {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					value: 'unicorn',
					replacement: '🦄',
				},
				
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				fix: fixer => fixer.replaceText(node, '\'🦄\''),
				
				
				/** @param {import('eslint').Rule.RuleFixer} fixer */
				suggest: [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							value: 'unicorn',
							replacement: '🦄',
						},
						/** @param {import('eslint').Rule.RuleFixer} fixer */
						fix: fixer => fixer.replaceText(node, '\'🦄\''),
					}
				],
				
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow immediate mutation after declaration.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
