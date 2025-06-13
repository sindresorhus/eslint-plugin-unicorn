import {isFunction, isRegexLiteral} from './ast/index.js';

// @ts-check
const MESSAGE_ID_ERROR = 'no-array-fill-with-reference-type/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Avoid using `{{actual}}` with reference type{{type}}. Use `Array.from({ ... }, () => { ... })` instead to ensure independent instances.',
};

const DEFAULTS = {
	// Not check for function expressions by default because it is rare to fill an array with a function and add properties to it.
	canFillWithFunction: true,
	// The same reason as above.
	canFillWithRegexp: true,
};

const debugging = false;
const log = (...arguments_) => debugging && console.log(...arguments_);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		const isArrayFill = node.callee.type === 'MemberExpression'
			&& ((node.callee.object.callee?.name === 'Array') || (context.sourceCode.getText(node.callee.object.callee) === 'Array.from'))
			&& node.callee.property.name === 'fill'
			&& node.arguments.length > 0;

		log('isArrayFill:', isArrayFill);

		if (!isArrayFill) {
			return;
		}

		const fillArgument = node.arguments[0];
		log('fillArgument:', fillArgument);

		if (!isReferenceType(fillArgument, context)) {
			return;
		}

		const actual = context.sourceCode.getText(node.callee.object.callee) === 'Array.from' ? 'Array.from().fill()' : 'Array.fill()';
		const type = getType(fillArgument);

		return {
			node: fillArgument,
			messageId: MESSAGE_ID_ERROR,
			data: {
				actual,
				type: type ? ` (${type})` : '',
			},
		};
	},
});

/**

 @param {*} fillArgument
 @returns {string}
 */
function getType(fillArgument) {
	let type = '';

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

	return type;
}

/**
 @param {*} node
 @param {import('eslint').Rule.RuleContext} context
 @returns
 */
function isReferenceType(node, context) {
	if (!node) {
		return false;
	}

	/**
	 @type {typeof DEFAULTS}
	 */
	const options = {
		...DEFAULTS,
		...context.options[0],
	};

	// For null, number, string, boolean.
	if (node.type === 'Literal') {
		// Exclude regular expression literals (e.g., `/pattern/`, which are objects despite being literals).
		if (!options.canFillWithRegexp && isRegexLiteral(node)) {
			return true;
		}

		return false;
	}

	// For template literals.
	if (node.type === 'TemplateLiteral') {
		return false;
	}

	// For variable identifiers (recursively check its declaration).
	if (node.type === 'Identifier') {
		const {variables} = context.sourceCode.getScope(node);
		const variable = variables.find(v => v.name === node.name);
		const definitionNode = variable?.defs[0].node;

		log('variables:', variables);
		log('variable:', variable);
		log('variable.defs[0].node:', definitionNode);

		if (!variable || !definitionNode) {
			return false;
		}

		// Check `const foo = []; Array(3).fill(foo);`
		if (definitionNode.type === 'VariableDeclarator') {
			return isReferenceType(definitionNode.init, context);
		}

		return isReferenceType(definitionNode, context);
	}

	// Symbol (such as `Symbol('name')`)
	if (node.type === 'CallExpression' && node.callee.name === 'Symbol') {
		const {variables} = context.sourceCode.getScope(node);

		log('variables 2:', variables);
		if (!variables || variables.length === 0) {
			// Variable declaration not found; it might be a global variable.
			return false;
		}
	}

	if (options.canFillWithFunction && isFunction(node)) {
		return false;
	}

	const isNewRegexp = node.type === 'NewExpression' && node.callee.name === 'RegExp';
	if (options.canFillWithRegexp && isNewRegexp) {
		return false;
	}

	// Other cases: objects, arrays, new expressions, regular expressions, etc.
	return true;
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			canFillWithFunction: {
				type: 'boolean',
			},
			canFillWithRegexp: {
				type: 'boolean',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallows using `Array.fill()` or `Array.from().fill()` with **reference types** to prevent unintended shared references across array elements.',
			recommended: true,
		},
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
