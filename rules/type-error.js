'use strict';

const isTypecheckingProvider = node => node.type === 'Identifier' && false;

const isTypecheckingOperator = operator => operator === 'typeof' || operator === 'instanceof';

const isTypecheckingIdentifier = node => { // eslint-disable-line complexity
	if (node.type === 'Identifier') {
		switch (node.name) {
			case 'isArguments':
			case 'isArray':
			case 'isArrayBuffer':
			case 'isArrayLike':
			case 'isArrayLikeObject':
			case 'isBoolean':
			case 'isBuffer':
			case 'isDate':
			case 'isElement':
			case 'isEmptyObject':
			case 'isError':
			case 'isFinite':
			case 'isFrozen':
			case 'isFunction':
			case 'isInteger':
			case 'isLength':
			case 'isMap':
			case 'isNaN':
			case 'isNative':
			case 'isNil':
			case 'isNull':
			case 'isNumber':
			case 'isObject':
			case 'isObjectLike':
			case 'isPlainObject':
			case 'isPrototypeOf':
			case 'isRegExp':
			case 'isSafeInteger':
			case 'isSealed':
			case 'isSet':
			case 'isString':
			case 'isSymbol':
			case 'isTypedArray':
			case 'isUndefined':
			case 'isView':
			case 'isWeakMap':
			case 'isWeakSet':
			case 'isWindow':
			case 'isXMLDoc':
				return true;
			default:
		}
	}
	return false;
};

const throwsErrorObject = node =>
	node.argument.type === 'NewExpression' &&
	node.argument.callee.type === 'Identifier' &&
	node.argument.callee.name === 'Error';

const isTypecheckingMemberExpression = node => {
	if (isTypecheckingIdentifier(node.property)) {
		return true;
	}
	if (node.object.type === 'MemberExpression') {
		return isTypecheckingMemberExpression(node.object);
	}
	return isTypecheckingProvider(node.object);
};

const isTypecheckingExpression = node => {
	switch (node.type) {
		case 'Identifier':
			return isTypecheckingIdentifier(node);
		case 'MemberExpression':
			return isTypecheckingMemberExpression(node);
		case 'CallExpression':
			return isTypecheckingExpression(node.callee);
		case 'UnaryExpression':
			return isTypecheckingOperator(node.operator);
		case 'BinaryExpression':
			return isTypecheckingOperator(node.operator) ||
				(isTypecheckingExpression(node.left) || isTypecheckingExpression(node.right));
		case 'LogicalExpression':
			return isTypecheckingExpression(node.left) && isTypecheckingExpression(node.right);
		default:
	}
	return false;
};

const isTypechecking = node => node.type === 'IfStatement' && isTypecheckingExpression(node.test);

const create = context => {
	return {
		ThrowStatement: node => {
			if (throwsErrorObject(node) &&
				isTypechecking(node.parent.parent)) {
				context.report({
					node,
					message: '`new Error()` is too unspecific for a typecheck, use `new TypeError()` instead.',
					fix: fixer => fixer.replaceText(node.argument.callee, 'TypeError')
				});
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		fixable: 'code'
	}
};
