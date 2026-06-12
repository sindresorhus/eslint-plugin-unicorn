const MESSAGE_ID = 'prefer-early-return';
const messages = {
	[MESSAGE_ID]: 'Prefer an early return over wrapping the whole function body in an `if` statement.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			maximumStatements: {
				type: 'integer',
				minimum: 0,
				description: 'Maximum number of statements allowed in a whole-function conditional wrapper.',
			},
		},
	},
];

const isIfStatementWithoutAlternate = node =>
	node.type === 'IfStatement'
	&& !node.alternate;

const getStatementCount = node =>
	node.type === 'BlockStatement' ? node.body.length : 1;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {maximumStatements} = context.options[0];

	context.on(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'], node => {
		if (node.body.type !== 'BlockStatement') {
			return;
		}

		const {body} = node.body;
		if (body.length !== 1) {
			return;
		}

		const [statement] = body;
		if (
			!isIfStatementWithoutAlternate(statement)
			|| getStatementCount(statement.consequent) <= maximumStatements
		) {
			return;
		}

		return {
			node: statement,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer early returns over full-function conditional wrapping.',
			recommended: 'unopinionated',
		},
		schema,
		defaultOptions: [{maximumStatements: 1}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
