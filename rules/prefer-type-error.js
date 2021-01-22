'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-type-error';
const messages = {
	[MESSAGE_ID]: '`new Error()` is too unspecific for a type check. Use `new TypeError()` instead.'
};

const tcIdentifiers = new Set([
	'isArguments',
	'isArray',
	'isArrayBuffer',
	'isArrayLike',
	'isArrayLikeObject',
	'isBigInt',
	'isBoolean',
	'isBuffer',
	'isDate',
	'isElement',
	'isError',
	'isFinite',
	'isFunction',
	'isInteger',
	'isLength',
	'isMap',
	'isNaN',
	'isNative',
	'isNil',
	'isNull',
	'isNumber',
	'isObject',
	'isObjectLike',
	'isPlainObject',
	'isPrototypeOf',
	'isRegExp',
	'isSafeInteger',
	'isSet',
	'isString',
	'isSymbol',
	'isTypedArray',
	'isUndefined',
	'isView',
	'isWeakMap',
	'isWeakSet',
	'isWindow',
	'isXMLDoc'
]);

const tcGlobalIdentifiers = new Set([
	'isNaN',
	'isFinite'
]);

const isTypecheckingIdentifier = ({type, name}, callExpression, isMemberExpression) =>
	callExpression !== undefined &&
	callExpression.arguments.length > 0 &&
	type === 'Identifier' &&
	((isMemberExpression === true &&
	tcIdentifiers.has(name)) ||
	(isMemberExpression === false &&
	tcGlobalIdentifiers.has(name)));

const throwsErrorObject = ({argument}) =>
	argument.type === 'NewExpression' &&
	argument.callee.type === 'Identifier' &&
	argument.callee.name === 'Error';

const isLone = ({parent}) => parent && parent.body && parent.body.length === 1;

const isTypecheckingMemberExpression = ({property, object}, callExpression) => {
	if (isTypecheckingIdentifier(property, callExpression, true)) {
		return true;
	}

	if (object.type === 'MemberExpression') {
		return isTypecheckingMemberExpression(object, callExpression);
	}

	return false;
};

const isTypecheckingExpression = (node, callExpression) => {
	switch (node.type) {
		case 'Identifier':
			return isTypecheckingIdentifier(node, callExpression, false);
		case 'MemberExpression':
			return isTypecheckingMemberExpression(node, callExpression);
		case 'CallExpression':
			return isTypecheckingExpression(node.callee, node);
		case 'UnaryExpression':
			return (
				node.operator === 'typeof' ||
				(node.operator === '!' && isTypecheckingExpression(node.argument))
			);
		case 'BinaryExpression':
			return (
				node.operator === 'instanceof' ||
				isTypecheckingExpression(node.left, callExpression) ||
				isTypecheckingExpression(node.right, callExpression)
			);
		case 'LogicalExpression':
			return (
				isTypecheckingExpression(node.left, callExpression) &&
				isTypecheckingExpression(node.right, callExpression)
			);
		default:
			return false;
	}
};

const isTypechecking = ({type, test}) => type === 'IfStatement' && isTypecheckingExpression(test);

const create = context => {
	return {
		ThrowStatement: node => {
			if (
				throwsErrorObject(node) &&
				isLone(node) &&
				node.parent.parent &&
				isTypechecking(node.parent.parent)
			) {
				context.report({
					node,
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceText(node.argument.callee, 'TypeError')
				});
			}
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
