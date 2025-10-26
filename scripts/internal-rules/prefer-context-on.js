import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getParenthesizedRange} from '../../rules/utils/parentheses.js';

const messageId = path.basename(fileURLToPath(import.meta.url), '.js');

function isRuleCreate(functionNode) {
	return (
		functionNode.params.length === 1
		&& (
			(functionNode.id?.name === 'create')
			|| (
				functionNode.parent.type === 'VariableDeclarator'
				&& functionNode.parent.init === functionNode
				&& functionNode.parent.id.type === 'Identifier'
				&& functionNode.parent.id.name === 'create'
				&& functionNode.parent.parent.type === 'VariableDeclaration'
				&& functionNode.parent.parent.kind === 'const'
				&& functionNode.parent.parent.declarations.length === 1
				&& functionNode.parent.parent.declarations[0] === functionNode.parent
			)
		)
	);
}

function * removeProperty(property, context, fixer) {
	yield fixer.remove(property);
	const commaToken = context.sourceCode.getTokenAfter(property);
	if (commaToken.value === ',') {
		yield fixer.remove(commaToken);
	}
}

function printComments(comments) {
	if (comments.length === 0) {
		return '';
	}

	const text = comments.map(({text}) => `\t${text}`).join('\n');
	return `${text}${text && !text.endsWith('*/') ? '\n' : ''}`;
}

function check(context, functionNode, listeners) {
	if (!isRuleCreate(functionNode)) {
		return;
	}

	const problem = {
		node: listeners,
		messageId,
	};

	if (listeners.type !== 'ObjectExpression') {
		context.report(problem);
		return;
	}

	problem.fix = function * (fixer) {
		const {sourceCode} = context;
		const isArrowFunctionBody = functionNode.type === 'ArrowFunctionExpression'
			&& functionNode.body === listeners;

		const range = getParenthesizedRange(isArrowFunctionBody ? listeners : listeners.parent, context);

		if (isArrowFunctionBody) {
			yield fixer.insertTextBeforeRange(range, '{\n');
			yield fixer.insertTextAfterRange(range, '}');
		}

		const propertiesCanRemove = [];
		for (const property of listeners.properties) {
			if (property.shorthand || property.type !== 'Property') {
				break;
			}

			propertiesCanRemove.push(property);
		}

		const shouldKeepObjectExpression = propertiesCanRemove.length !== listeners.properties.length;
		const commentsInObjectExpression = sourceCode.getCommentsInside(listeners).map(comment => {
			const [start, end] = sourceCode.getRange(comment);
			const text = sourceCode.getText(comment);
			return {
				text,
				start,
				end,
				isType: text.startsWith('/**'),
			};
		});

		for (const [index, property] of propertiesCanRemove.entries()) {
			const {key, value, method: isMethod} = property;
			const selector = key.type === 'Identifier'
				? `'${key.name}'`
				: sourceCode.getText(property.key);
			const listener = `${isMethod ? `function${value.generator ? ' * ' : ''}` : ''}${sourceCode.getText(value)}`;
			const commentStart = sourceCode.getRange(index === 0 ? sourceCode.getFirstToken(listeners) : propertiesCanRemove[index - 1])[1];
			const commentEnd = sourceCode.getRange(property)[0];
			const comments = commentsInObjectExpression.filter(({start, end}) => start >= commentStart && end <= commentEnd);

			const {
				commentsBefore = [],
				commentsForListener = [],
			} = Object.groupBy(comments, comment => comment.isType ? 'commentsForListener' : 'commentsBefore');

			yield fixer.insertTextBeforeRange(
				range,
				`${printComments(commentsBefore)}\tcontext.on(${selector}, ${printComments(commentsForListener)} ${listener});\n\n`,
			);

			if (shouldKeepObjectExpression) {
				yield * removeProperty(property, context, fixer);
			}
		}

		if (shouldKeepObjectExpression && isArrowFunctionBody) {
			yield fixer.insertTestBefore(functionNode.body, '\n\treturn ');
			return;
		}

		if (listeners.parent === functionNode) {
			yield fixer.removeRange(range);
			return;
		}

		yield fixer.remove(listeners);
	};

	context.report(problem);
}

const config = {
	create(context) {
		return {
			ArrowFunctionExpression(functionNode) {
				if (functionNode.body.type !== 'BlockStatement') {
					check(context, functionNode, functionNode.body);
				}
			},
			'ReturnStatement'(returnStatement) {
				if (!returnStatement.argument) {
					return;
				}

				const scope = context.sourceCode.getScope(returnStatement).variableScope;
				const functionNode = scope.block;
				check(context, functionNode, returnStatement.argument);
			},
		};
	},
	meta: {
		fixable: 'code',
		messages: {
			[messageId]: 'Use `context.on()` instead of return listeners.',
		},
	},
};

export default config;
