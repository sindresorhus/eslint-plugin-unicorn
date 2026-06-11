const MESSAGE_ID_MEMBER_ACCESS = 'member-access';
const MESSAGE_ID_COMPLEX_CONSTRUCTOR = 'complex-constructor';

const messages = {
	[MESSAGE_ID_MEMBER_ACCESS]: 'Do not access members directly from a `new` expression.',
	[MESSAGE_ID_COMPLEX_CONSTRUCTOR]: 'Do not use a complex expression as a constructor.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', memberExpression => {
		if (memberExpression.object.type !== 'NewExpression') {
			return;
		}

		return {
			node: memberExpression.property,
			messageId: MESSAGE_ID_MEMBER_ACCESS,
		};
	});

	context.on('NewExpression', newExpression => {
		if (newExpression.callee.type === 'Identifier') {
			return;
		}

		return {
			node: newExpression.callee,
			messageId: MESSAGE_ID_COMPLEX_CONSTRUCTOR,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable `new` expressions.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
