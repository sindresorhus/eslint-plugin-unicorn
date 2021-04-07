'use strict';
const {findVariable} = require('eslint-utils');
const getDocumentationUrl = require('./utils/get-documentation-url');
const getVariableIdentifiers = require('./utils/get-variable-identifiers');
const methodSelector = require('./utils/method-selector');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: '`{{name}}` should be a `Set`, and use `{{name}}.has()` to check existence or non-existence.',
	[MESSAGE_ID_SUGGESTION]: 'Switch `{{name}}` to `Set`.'
};

// `[]`
const arrayExpressionSelector = [
	'[init.type="ArrayExpression"]'
].join('');

// `Array()`
const ArraySelector = [
	'[init.type="CallExpression"]',
	'[init.callee.type="Identifier"]',
	'[init.callee.name="Array"]'
].join('');

// `new Array()`
const newArraySelector = [
	'[init.type="NewExpression"]',
	'[init.callee.type="Identifier"]',
	'[init.callee.name="Array"]'
].join('');

// `Array.from()`
// `Array.of()`
const arrayStaticMethodSelector = methodSelector({
	object: 'Array',
	names: ['from', 'of'],
	property: 'init'
});

// `array.concat()`
// `array.copyWithin()`
// `array.fill()`
// `array.filter()`
// `array.flat()`
// `array.flatMap()`
// `array.map()`
// `array.reverse()`
// `array.slice()`
// `array.sort()`
// `array.splice()`
const arrayMethodSelector = methodSelector({
	names: [
		'concat',
		'copyWithin',
		'fill',
		'filter',
		'flat',
		'flatMap',
		'map',
		'reverse',
		'slice',
		'sort',
		'splice'
	],
	property: 'init'
});

const selector = [
	'VariableDeclaration',
	// Exclude `export const foo = [];`
	`:not(${
		[
			'ExportNamedDeclaration',
			'>',
			'VariableDeclaration.declaration'
		].join('')
	})`,
	'>',
	'VariableDeclarator.declarations',
	`:matches(${
		[
			arrayExpressionSelector,
			ArraySelector,
			newArraySelector,
			arrayStaticMethodSelector,
			arrayMethodSelector
		].join(',')
	})`,
	'>',
	'Identifier.id'
].join('');

const isIncludesCall = node => {
	/* istanbul ignore next */
	if (!node.parent || !node.parent.parent) {
		return false;
	}

	const {type, optional, callee, arguments: includesArguments} = node.parent.parent;
	return (
		type === 'CallExpression' &&
		!optional &&
		callee &&
		callee.type === 'MemberExpression' &&
		!callee.computed &&
		!callee.optional &&
		callee.object === node &&
		callee.property.type === 'Identifier' &&
		callee.property.name === 'includes' &&
		includesArguments.length === 1 &&
		includesArguments[0].type !== 'SpreadElement'
	);
};

const multipleCallNodeTypes = new Set([
	'ForOfStatement',
	'ForStatement',
	'ForInStatement',
	'WhileStatement',
	'DoWhileStatement',
	'FunctionDeclaration',
	'FunctionExpression',
	'ArrowFunctionExpression',
	'ObjectMethod',
	'ClassMethod'
]);

const isMultipleCall = (identifier, node) => {
	const root = node.parent.parent.parent;
	let {parent} = identifier.parent; // `.include()` callExpression
	while (
		parent &&
		parent !== root
	) {
		if (multipleCallNodeTypes.has(parent.type)) {
			return true;
		}

		parent = parent.parent;
	}

	return false;
};

const create = context => {
	return {
		[selector]: node => {
			const variable = findVariable(context.getScope(), node);

			// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1075#issuecomment-768073342
			// But can't reproduce, just ignore this case
			/* istanbul ignore next */
			if (!variable) {
				return;
			}

			const identifiers = getVariableIdentifiers(variable).filter(identifier => identifier !== node);

			if (
				identifiers.length === 0 ||
				identifiers.some(identifier => !isIncludesCall(identifier))
			) {
				return;
			}

			if (
				identifiers.length === 1 &&
				identifiers.every(identifier => !isMultipleCall(identifier, node))
			) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID_ERROR,
				data: {
					name: node.name
				}
			};

			const fix = function * (fixer) {
				yield fixer.insertTextBefore(node.parent.init, 'new Set(');
				yield fixer.insertTextAfter(node.parent.init, ')');

				for (const identifier of identifiers) {
					yield fixer.replaceText(identifier.parent.property, 'has');
				}
			};

			if (node.typeAnnotation) {
				problem.suggest = [
					{
						messageId: MESSAGE_ID_SUGGESTION,
						data: {
							name: node.name
						},
						fix
					}
				];
			} else {
				problem.fix = fix;
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
