import {removeParentheses, removeMemberExpressionProperty} from './fix/index.js';
import {getStaticNumberValue, isKnownNonIterable, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'no-await-expression-member';
const messages = {
	[MESSAGE_ID]: 'Do not access a member directly from an await expression.',
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('MemberExpression', memberExpression => {
		if (memberExpression.object.type !== 'AwaitExpression') {
			return;
		}

		const {property} = memberExpression;
		const problem = {
			node: property,
			messageId: MESSAGE_ID,
		};

		// `[-0]` and `[+0]` are the same index as `[0]`
		const index = getStaticNumberValue(property);

		// `const foo = (await bar)[0]`
		if (
			memberExpression.computed
			&& !memberExpression.optional
			&& (index === 0 || index === 1)
			&& memberExpression.parent.type === 'VariableDeclarator'
			&& memberExpression.parent.init === memberExpression
			&& memberExpression.parent.id.type === 'Identifier'
			&& !memberExpression.parent.id.typeAnnotation
			// The fix turns index access into a destructuring pattern, which needs the awaited value to be iterable while `[…]` works on any array-like
			&& !isKnownNonIterable(unwrapTypeScriptExpression(memberExpression.object.argument))
			// The fix removes the member access, a comment inside it would be dropped
			&& context.sourceCode.getCommentsInside(memberExpression).length === 0
		) {
			problem.fix = function * (fixer) {
				const variable = memberExpression.parent.id;
				yield fixer.insertTextBefore(variable, index === 0 ? '[' : '[, ');
				yield fixer.insertTextAfter(variable, ']');

				yield removeMemberExpressionProperty(fixer, memberExpression, context);
				yield removeParentheses(memberExpression.object, fixer, context);
			};

			return problem;
		}

		// `const foo = (await bar).foo`
		if (
			!memberExpression.computed
			&& !memberExpression.optional
			&& property.type === 'Identifier'
			&& memberExpression.parent.type === 'VariableDeclarator'
			&& memberExpression.parent.init === memberExpression
			&& memberExpression.parent.id.type === 'Identifier'
			&& memberExpression.parent.id.name === property.name
			&& !memberExpression.parent.id.typeAnnotation
			// The fix removes the member access, a comment inside it would be dropped
			&& context.sourceCode.getCommentsInside(memberExpression).length === 0
		) {
			problem.fix = function * (fixer) {
				const variable = memberExpression.parent.id;
				yield fixer.insertTextBefore(variable, '{');
				yield fixer.insertTextAfter(variable, '}');

				yield removeMemberExpressionProperty(fixer, memberExpression, context);
				yield removeParentheses(memberExpression.object, fixer, context);
			};

			return problem;
		}

		return problem;
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
			description: 'Disallow member access from await expression.',
			recommended: true,
		},
		fixable: 'code',
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
