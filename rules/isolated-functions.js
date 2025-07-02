'use strict';
const esquery = require('esquery');
const functionTypes = require('./ast/function-types.js');

const MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE = 'externally-scoped-variable';
const messages = {
	[MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE]: 'Variable {{name}} not defined in scope of isolated function. Function is isolated because: {{reason}}.',
};

const parsedEsquerySelectors = new Map();
const parseEsquerySelector = selector => {
	if (!parsedEsquerySelectors.has(selector)) {
		parsedEsquerySelectors.set(selector, esquery.parse(selector));
	}

	return parsedEsquerySelectors.get(selector);
};

/** @type {{functions: string[], selectors: string[], comments: string[], globals: boolean | string[]}} */
const defaultOptions = {
	functions: ['makeSynchronous'],
	selectors: [],
	comments: ['@isolated'],
	globals: false,
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	/** @type {typeof defaultOptions} */
	const userOptions = context.options[0];
	const options = {
		...defaultOptions,
		...userOptions,
	};

	options.comments = options.comments.map(comment => comment.toLowerCase());
	const allowedGlobals = options.globals === true
		? Object.keys(context.languageOptions.globals)
		: (Array.isArray(options.globals)
			? options.globals
			: []);

	/** @param {import('estree').Node} node */
	const checkForExternallyScopedVariables = node => {
		const reason = reasaonForBeingIsolatedFunction(node);
		if (!reason) {
			return;
		}

		const nodeScope = sourceCode.getScope(node);

		for (const ref of nodeScope.through) {
			const {identifier} = ref;

			if (allowedGlobals.includes(identifier.name)) {
				continue;
			}

			// If (!options.considerTypeOf && hasTypeOfOperator(identifier)) {
			// 	return;
			// }

			context.report({
				node: identifier,
				messageId: MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE,
				// Message: `Variable ${identifier.name} is used from outside the scope of an isolated function. Function is isolated because: ${reason}.`,
				data: {name: identifier.name, reason},
			});
		}
	};

	/** @param {import('estree').Node & {parent?: import('estree').Node}} node */
	const reasaonForBeingIsolatedFunction = node => {
		if (options.comments.length > 0) {
			let previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
			let commentableNode = node;
			while (previousToken?.type !== 'Block' && (commentableNode.parent.type === 'VariableDeclarator' || commentableNode.parent.type === 'VariableDeclaration')) {
				// Search up to find jsdoc comments on the parent declaration `/** @isolated */ const foo = () => abc`
				commentableNode = commentableNode.parent;
				previousToken = sourceCode.getTokenBefore(commentableNode, {includeComments: true});
			}

			if (previousToken?.type === 'Block') {
				const previousComment = previousToken.value.trim().toLowerCase();
				const match = options.comments.find(comment => previousComment.includes(comment));
				if (match) {
					return `follows comment containing ${JSON.stringify(match)}`;
				}
			}
		}

		if (
			options.functions.length > 0
			&& node.parent.type === 'CallExpression'
			&& node.parent.arguments.includes(node)
			&& node.parent.callee.type === 'Identifier'
			&& options.functions.includes(node.parent.callee.name)
		) {
			return `callee of function named ${JSON.stringify(node.parent.callee.name)}`;
		}

		if (options.selectors.length > 0) {
			const ancestors = sourceCode.getAncestors(node).reverse();
			const matchedSelector = options.selectors.find(selector => esquery.matches(node, parseEsquerySelector(selector), ancestors));
			if (matchedSelector) {
				return `matches selector ${JSON.stringify(matchedSelector)}`;
			}
		}

		return undefined;
	};

	return Object.fromEntries(functionTypes.map(type => [
		`${type}:exit`,
		checkForExternallyScopedVariables,
	]));
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			tags: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			globals: {
				oneOf: [{type: 'boolean'}, {type: 'array', items: {type: 'string'}}],
			},
			functions: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			comments: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent usage of variables from outside the scope of isolated functions.',
		},
		schema,
		messages,
	},
};
