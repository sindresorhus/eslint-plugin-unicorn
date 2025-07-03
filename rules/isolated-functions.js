'use strict';
import esquery from 'esquery';
import functionTypes from './ast/function-types.js';

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

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	/** @type {{functions: string[], selectors: string[], comments: string[], globals: boolean | string[]}} */
	const userOptions = context.options[0];
	/** @type {typeof userOptions} */
	const options = {
		functions: ['makeSynchronous'],
		selectors: [],
		comments: ['@isolated'],
		globals: false,
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
		const reason = reasonForBeingIsolatedFunction(node);
		if (!reason) {
			return;
		}

		const nodeScope = sourceCode.getScope(node);

		for (const reference of nodeScope.through) {
			const {identifier} = reference;

			if (allowedGlobals.includes(identifier.name)) {
				continue;
			}

			// Could consider checking for typeof operator here, like in no-undef?

			context.report({
				node: identifier,
				messageId: MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE,
				data: {name: identifier.name, reason},
			});
		}
	};

	/** @param {import('estree').Node & {parent?: import('estree').Node}} node */
	const reasonForBeingIsolatedFunction = node => {
		if (options.comments.length > 0) {
			let previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
			let commentableNode = node;
			while (
				(previousToken?.type !== 'Block' && previousToken?.type !== 'Line')
				&& (commentableNode.parent.type === 'VariableDeclarator' || commentableNode.parent.type === 'VariableDeclaration')
			) {
				// Search up to find jsdoc comments on the parent declaration `/** @isolated */ const foo = () => abc`
				commentableNode = commentableNode.parent;
				previousToken = sourceCode.getTokenBefore(commentableNode, {includeComments: true});
			}

			if (previousToken?.type === 'Block' || previousToken?.type === 'Line') {
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
export default {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prevent usage of variables from outside the scope of isolated functions.',
			recommended: true,
		},
		schema,
		messages,
	},
};
