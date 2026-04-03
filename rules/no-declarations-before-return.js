import {isFunction} from './ast/index.js';

const MESSAGE_ID = 'noDeclarationsBeforeReturn';
const messages = {
	[MESSAGE_ID]: 'Move `{{name}}` declaration after this `{{exit}}`.',
};

const isEarlyExit = node => node.type === 'ReturnStatement' || node.type === 'ThrowStatement';

function getExitType(node) {
	if (node.type === 'ReturnStatement') {
		return 'return';
	}

	if (node.type === 'ThrowStatement') {
		return 'throw';
	}

	return '';
}

function hasIdentifier(node, name) {
	if (!node || typeof node !== 'object') {
		return false;
	}

	if (Array.isArray(node)) {
		return node.some(item => hasIdentifier(item, name));
	}

	if (node.type === 'Identifier' && node.name === name) {
		return true;
	}

	return Object.keys(node).some(key => {
		if (key === 'parent') {
			return false;
		}
		return hasIdentifier(node[key], name);
	});
}

export default {
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow variable declarations before early exits when the variable is only used after the exit.',
		},
		messages,
	},
	create(context) {
		function checkBlock(body) {
			if (!body || !Array.isArray(body)) {
				return;
			}

			const declarations = [];

			for (let i = 0; i < body.length; i++) {
				const statement = body[i];

				if (statement.type === 'VariableDeclaration' && (statement.kind === 'let' || statement.kind === 'const')) {
					for (const declarator of statement.declarations) {
						if (declarator.id.type === 'Identifier') {
							declarations.push({
								name: declarator.id.name,
								node: statement,
								index: i,
							});
						}
					}
				} else if (isEarlyExit(statement)) {
					for (const declaration of declarations) {
						const usedBefore = hasIdentifier(body.slice(declaration.index + 1, i), declaration.name);
						const usedAfter = hasIdentifier(body.slice(i + 1), declaration.name);
						if (usedAfter && !usedBefore) {
							context.report({
								node: declaration.node,
								messageId: MESSAGE_ID,
								data: {
									name: declaration.name,
									exit: getExitType(statement),
								},
							});
						}
					}
				} else if (statement.type === 'IfStatement') {
					const checkBranch = branch => {
						if (branch) {
							if (branch.type === 'BlockStatement') {
								checkBlock(branch.body);
							} else {
								checkBlock([branch]);
							}
						}
					};

					checkBranch(statement.consequent);
					checkBranch(statement.alternate);
				} else if (statement.type === 'BlockStatement') {
					checkBlock(statement.body);
				} else if (statement.type === 'TryStatement') {
					if (statement.block) {
						checkBlock(statement.block.body);
					}
					if (statement.handler && statement.handler.body) {
						checkBlock(statement.handler.body.body);
					}
				}
			}
		}

		return {
			'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
				if (isFunction(node) && node.body.type === 'BlockStatement') {
					checkBlock(node.body.body);
				}
			},
		};
	},
};
