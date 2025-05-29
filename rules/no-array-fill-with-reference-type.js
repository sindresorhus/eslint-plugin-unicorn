// @ts-check
const MESSAGE_ID_ERROR = 'no-array-fill-with-reference-type/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Avoid using Array.fill() with reference types ({{type}}). Use Array.from() instead to ensure independent instances.',
};

const debugging = false;
const log = (...arguments_) => debugging && console.log(...arguments_);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		const isArrayDotFill = node.callee.type === 'MemberExpression'
			&& node.callee.object.callee?.name === 'Array'
			&& node.callee.property.name === 'fill'
			&& node.arguments.length > 0;

		log('isArrayDotFill:', isArrayDotFill);

		if (!isArrayDotFill) {
			return;
		}

		const fillArgument = node.arguments[0];
		log('fillArgument:', fillArgument);

		if (!isReferenceType(fillArgument, context)) {
			return;
		}

		let type = 'unknown';
		switch (fillArgument.type) {
			case 'ObjectExpression': {
				type = 'Object';
				break;
			}

			case 'ArrayExpression': {
				type = 'Array';
				break;
			}

			case 'NewExpression': {
				type = `new ${fillArgument.callee.name}()`;
				break;
			}

			case 'FunctionExpression':
			case 'ArrowFunctionExpression': {
				type = 'Function';
				break;
			}

			default: {
				if (fillArgument.type === 'Literal' && fillArgument.regex) {
					type = 'RegExp';
				} else if (fillArgument.type === 'Identifier') {
					type = `variable (${fillArgument.name})`;
				}
			}
		}

		return {
			node,
			messageId: MESSAGE_ID_ERROR,
			data: {
				type,
				replacement: '🦄',
			},
		};
	},
});

/**
 @param {*} node
 @param {import('eslint').Rule.RuleContext} context
 @returns
 */
function isReferenceType(node, context) {
	if (!node) {
		return false;
	}

	// For null, number, string, boolean.
	if (node.type === 'Literal') {
		// Exclude regular expression literals (e.g., `/pattern/`, which are objects despite being literals).
		return node.regex !== undefined;
	}

	// For template literals.
	if (node.type === 'TemplateLiteral') {
		return false;
	}

	// For variable identifiers (recursively check its declaration).
	if (node.type === 'Identifier') {
		const {variables} = context.sourceCode.getScope(node);
		const variable = variables.find(v => v.name === node.name);
		log('variables:', variables);
		log('variable:', variable);
		log('variable.defs[0].node:', variable?.defs[0].node);
		if (!variable || !variable.defs[0]?.node) {
			return false;
		}

		return isReferenceType(variable.defs[0].node, context);
	}

	// Symbol（如 Symbol('name')）
	if (node.type === 'CallExpression' && node.callee.name === 'Symbol') {
		const {variables} = context.sourceCode.getScope(node);

		log('variables 2:', variables);
		if (!variables || variables.length === 0) {
			// 未找到变量声明，可能是全局变量
			return false;
		}
	}

	// 其他情况：对象、数组、函数、new表达式、正则表达式等
	return true;
}

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallows using `Array.fill()` with **reference types** to prevent unintended shared references across array elements.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
