// @ts-check
import {} from './ast/index.js';
import {} from './fix/index.js';
import {} from './utils/index.js';

const MESSAGE_ID_ERROR = 'no-array-fill-with-reference-type/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Avoid using Array.fill() with reference types ({{type}}). Use Array.from() instead to ensure independent instances.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		const isArrayDotFill = node.callee.type === 'MemberExpression'
			&& node.callee.object.callee?.name === 'Array'
			&& node.callee.property.name === 'fill'
			&& node.arguments.length > 0;

		// Console.log('isArrayDotFill:', isArrayDotFill);

		if (!isArrayDotFill) {
			return;
		}

		const fillArgument = node.arguments[0];
		// Console.log('fillArgument:', fillArgument);

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
				// 正则表达式字面量
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

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			// fix: fixer => fixer.replaceText(node, '\'🦄\''),

			/** @param {import('eslint').Rule.RuleFixer} fixer */
			// suggest: [
			// 	{
			// 		messageId: MESSAGE_ID_SUGGESTION,
			// 		data: {
			// 			type,
			// 		},
			// 	},
			// ],

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

	// 原始类型：字面量（null, number, string, boolean）
	if (node.type === 'Literal') {
		// 排除正则表达式字面量（如 /pattern/，虽然属于 Literal，但实际是对象）
		return node.regex !== undefined;
	}

	// 特殊处理：模板字符串（`hello`）属于原始类型
	if (node.type === 'TemplateLiteral') {
		return false;
	}

	// 变量标识符（递归检查其声明）
	if (node.type === 'Identifier') {
		const {variables} = context.sourceCode.getScope(node);
		const variable = variables.find(v => v.name === node.name);
		// Console.log('variables:', variables);
		// console.log('variable:', variable);
		// console.log('variable.defs[0].node:', variable.defs[0].node);
		if (!variable || !variable.defs[0]?.node) {
			return false;
		}

		return isReferenceType(variable.defs[0].node, context);
	}

	// Symbol（如 Symbol('name')）
	if (node.type === 'CallExpression' && node.callee.name === 'Symbol') {
		const {variables} = context.sourceCode.getScope(node);

		// Console.log('variables 2:', variables);
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
			description: 'Disallows using `Array.fill()` with **reference types** (objects, arrays, functions, Maps, Sets, RegExp literals, etc.) to prevent unintended shared references across array elements. Encourages `Array.from()` or explicit iteration for creating independent instances.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages,
	},
};

export default config;
