import {functionTypes} from './ast/index.js';

const MESSAGE_ID = 'no-top-level-assignment-in-function';
const messages = {
	[MESSAGE_ID]: 'Do not assign to top-level variable `{{name}}` from inside a function.',
};

const isInsideFunction = node => {
	let current = node.parent;

	while (current) {
		if (functionTypes.includes(current.type)) {
			return true;
		}

		if (current.type === 'Program') {
			return false;
		}

		current = current.parent;
	}

	return false;
};

const getTopLevelScopes = (program, sourceCode) => {
	const scope = sourceCode.getScope(program);
	return [
		scope,
		...scope.childScopes,
	].filter(scope => scope.block === program);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.onExit('Program', program => {
		const variables = getTopLevelScopes(program, sourceCode)
			.flatMap(scope => scope.variables)
			.filter(variable => variable.defs.length > 0);

		return variables.flatMap(variable =>
			variable.references
				.filter(reference =>
					!reference.init
					&& reference.isWrite()
					&& isInsideFunction(reference.identifier),
				)
				.map(reference => ({
					node: reference.identifier,
					messageId: MESSAGE_ID,
					data: {name: variable.name},
				})),
		);
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow assigning to top-level variables from inside functions.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
