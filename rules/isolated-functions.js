import globals from 'globals';
import {functionTypes, isMemberExpression, isMethodCall} from './ast/index.js';

const MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE = 'externally-scoped-variable';
const MESSAGE_ID_SUPER = 'super';
const MESSAGE_ID_THIS_EXPRESSION = 'this-expression';
const functionContextReferenceMessageIds = new Map([
	['Super', MESSAGE_ID_SUPER],
	['ThisExpression', MESSAGE_ID_THIS_EXPRESSION],
]);

const messages = {
	[MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE]: 'Variable {{name}} not defined in scope of isolated function. Function is isolated because: {{reason}}.',
	[MESSAGE_ID_SUPER]: 'Unexpected `super` in isolated function. Function is isolated because: {{reason}}.',
	[MESSAGE_ID_THIS_EXPRESSION]: 'Unexpected `this` in isolated function. Function is isolated because: {{reason}}.',
};

/** @type {{functions: string[], selectors: string[], comments: string[], overrideGlobals?: import('eslint').Linter.Globals}} */
const defaultOptions = {
	functions: ['makeSynchronous', 'workerize'],
	selectors: [],
	comments: ['@isolated'],
	overrideGlobals: {},
};

const scriptingObjects = ['browser', 'chrome'];

const getObjectPropertyName = node => {
	if (node.computed && node.key.type !== 'Literal') {
		return;
	}

	if (node.key.type === 'Identifier') {
		return node.key.name;
	}

	if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
		return node.key.value;
	}
};

const getDefaultArgumentCallReason = node => {
	if (
		node.parent.type !== 'CallExpression'
		|| node.parent.arguments[0] !== node
	) {
		return;
	}

	if (isMethodCall(node.parent, {object: 'browser', method: 'execute'})) {
		return 'callee of method named "browser.execute"';
	}

	if (isMethodCall(node.parent, {object: 'page', method: 'evaluate'})) {
		return 'callee of method named "page.evaluate"';
	}
};

const getScriptingExecuteScriptObjectName = node => {
	if (
		!isMethodCall(node, {method: 'executeScript'})
		|| !isMemberExpression(node.callee.object, {
			objects: scriptingObjects,
			property: 'scripting',
		})
	) {
		return;
	}

	return node.callee.object.object.name;
};

const getExecuteScriptPropertyReason = node => {
	if (
		node.parent.type !== 'Property'
		|| node.parent.kind !== 'init'
		|| getObjectPropertyName(node.parent) !== 'func'
		|| node.parent.parent.type !== 'ObjectExpression'
		|| node.parent.parent.parent.type !== 'CallExpression'
		|| node.parent.parent.parent.arguments[0] !== node.parent.parent
	) {
		return;
	}

	const scriptingObjectName = getScriptingExecuteScriptObjectName(node.parent.parent.parent);
	if (!scriptingObjectName) {
		return;
	}

	return `property "func" passed to "${scriptingObjectName}.scripting.executeScript"`;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	/** @type {typeof defaultOptions} */
	const options = {...context.options[0]};

	options.comments = options.comments.map(comment => comment.toLowerCase());

	const allowedGlobals = {
		...(globals[`es${context.languageOptions.ecmaVersion}`] ?? globals.builtins),
		...context.languageOptions.globals,
		...options.overrideGlobals,
	};
	const checked = new WeakSet();

	function * getFunctionContextProblems(node, reason, root = node) {
		const messageId = functionContextReferenceMessageIds.get(node.type);
		if (messageId) {
			yield {
				node,
				messageId,
				data: {reason},
			};
			return;
		}

		if (node !== root) {
			if (functionTypes.includes(node.type) && node.type !== 'ArrowFunctionExpression') {
				return;
			}

			if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
				if (node.superClass) {
					yield * getFunctionContextProblems(node.superClass, reason, root);
				}

				for (const classElement of node.body.body) {
					if (classElement.computed) {
						yield * getFunctionContextProblems(classElement.key, reason, root);
					}
				}

				return;
			}
		}

		for (const key of sourceCode.visitorKeys[node.type] ?? []) {
			const value = node[key];

			if (Array.isArray(value)) {
				for (const childNode of value) {
					if (childNode?.type) {
						yield * getFunctionContextProblems(childNode, reason, root);
					}
				}

				continue;
			}

			if (value?.type) {
				yield * getFunctionContextProblems(value, reason, root);
			}
		}
	}

	/** @param {import('estree').Node} node */
	const reportIsolatedFunctionProblems = (node, reason) => {
		if (checked.has(node) || !functionTypes.includes(node.type)) {
			return;
		}

		checked.add(node);

		const nodeScope = sourceCode.getScope(node);

		// `through`: "The array of references which could not be resolved in this scope" https://eslint.org/docs/latest/extend/scope-manager-interface#scope-interface
		for (const reference of nodeScope.through) {
			const {identifier} = reference;

			if (identifier.parent.type === 'TSTypeReference' || identifier.parent.type === 'TSTypeQuery') {
				continue;
			}

			if (Object.hasOwn(allowedGlobals, identifier.name) && allowedGlobals[identifier.name] !== 'off') {
				if (reference.isReadOnly()) {
					continue;
				}

				const globalsValue = allowedGlobals[identifier.name];
				const isGlobalWritable = [true, 'writable', 'writeable'].includes(globalsValue);
				if (isGlobalWritable) {
					continue;
				}

				reason += ' (global variable is not writable)';
			}

			// Could consider checking for typeof operator here, like in no-undef?

			context.report({
				node: identifier,
				messageId: MESSAGE_ID_EXTERNALLY_SCOPED_VARIABLE,
				data: {name: identifier.name, reason},
			});
		}

		for (const problem of getFunctionContextProblems(node, reason)) {
			context.report(problem);
		}
	};

	const isComment = token => token?.type === 'Block' || token?.type === 'Line';

	const canCommentApplyToParent = (node, parent) =>
		parent && (
			[
				'VariableDeclarator',
				'VariableDeclaration',
				'ExportNamedDeclaration',
				'ExportDefaultDeclaration',
			].includes(parent.type)
			|| (
				(
					parent.type === 'Property'
					|| parent.type === 'MethodDefinition'
				)
				&& parent.value === node
			)
		);

	/**
	 Find a comment on this node or its parent, in cases where the node passed is part of a variable, export, property, or method declaration.
	 @param {import('estree').Node} node
	 */
	const findComment = node => {
		let previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
		let commentableNode = node;
		while (
			!isComment(previousToken)
			&& canCommentApplyToParent(commentableNode, commentableNode.parent)
		) {
			commentableNode = commentableNode.parent;
			previousToken = sourceCode.getTokenBefore(commentableNode, {includeComments: true});
		}

		if (isComment(previousToken)) {
			return previousToken.value;
		}
	};

	/**
	 Find the string "reason" that a function (node) should be considered isolated. For passing in to `context.report(...)` when out-of-scope variables are found. Returns undefined if the function should not be considered isolated.
	 @param {import('estree').Node & {parent?: import('estree').Node}} node
	 */
	const reasonForBeingIsolatedFunction = node => {
		if (options.comments.length > 0) {
			let previousComment = findComment(node);

			if (previousComment) {
				previousComment = previousComment
					.replace(/(?:\*\s*)*/, '') // JSDoc comments like `/** @isolated */` are parsed into `* @isolated`. And `/**\n * @isolated */` is parsed into `*\n * @isolated`
					.trim()
					.toLowerCase();
				const match = options.comments.find(comment => previousComment === comment || previousComment.startsWith(`${comment} - `) || previousComment.startsWith(`${comment} -- `));
				if (match) {
					return `follows comment ${JSON.stringify(match)}`;
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

		return getDefaultArgumentCallReason(node) ?? getExecuteScriptPropertyReason(node);
	};

	context.onExit(
		functionTypes,
		node => {
			const reason = reasonForBeingIsolatedFunction(node);
			if (!reason) {
				return;
			}

			return reportIsolatedFunctionProblems(node, reason);
		},
	);

	for (const selector of options.selectors) {
		context.onExit(
			selector,
			node => {
				const reason = `matches selector ${JSON.stringify(selector)}`;
				return reportIsolatedFunctionProblems(node, reason);
			},
		);
	}
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			overrideGlobals: {
				additionalProperties: {
					anyOf: [{type: 'boolean'}, {type: 'string', enum: ['readonly', 'writable', 'writeable', 'off']}],
				},
				description: 'Override which global variables are allowed inside isolated scopes.',
			},
			functions: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'Function names that mark a scope as isolated.',
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'AST selectors that mark a scope as isolated.',
			},
			comments: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
				description: 'Comment patterns that mark a scope as isolated.',
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
		defaultOptions: [defaultOptions],
		messages,
		languages: [
			'js/js',
		],
	},
};
