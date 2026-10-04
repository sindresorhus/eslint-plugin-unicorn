import {getStaticStringValue} from '../ast/index.js';
import {unwrapChainAndTypeScriptExpression} from '../utils/index.js';

/**
Get the static name of a class member key or member expression property: `foo`, `'foo'`, `['foo']`, or `` [`foo`] ``.

@param {import('estree').Node} key
@param {boolean} computed
@returns {string | undefined}
*/
export const getStaticName = (key, computed) => {
	if (!computed && key?.type === 'Identifier') {
		return key.name;
	}

	if (
		computed
		|| key?.type === 'Literal'
	) {
		return getStaticStringValue(key);
	}
};

/**
Whether the node is `this`, looking through optional chains and TypeScript wrappers (`this as Foo`, `this!`, …).
*/
export const isThisExpression = node => unwrapChainAndTypeScriptExpression(node)?.type === 'ThisExpression';

/**
Find the class whose instance `this` refers to, or `undefined` when `this` is rebound by a nested non-arrow function or is outside any class.

@param {import('eslint').Rule.Node} node
*/
export const getThisOwnerClassBody = node => {
	for (let current = node.parent; current; current = current.parent) {
		const {type} = current;

		if (type === 'ClassBody') {
			return current;
		}

		// A non-arrow function rebinds `this`, except when it is a class method's body
		if (type === 'FunctionExpression' || type === 'FunctionDeclaration') {
			const {parent} = current;
			const isMethodBody = parent.type === 'MethodDefinition' && parent.value === current;
			if (!isMethodBody) {
				return;
			}
		}
	}
};

/**
Get the class element (method, field, static block, …) of the closest class that contains the node, or `undefined` when the node is not in a class body.
*/
export const getContainingClassElement = node => {
	let current = node;
	while (current.parent && current.parent.type !== 'ClassBody') {
		current = current.parent;
	}

	return current.parent ? current : undefined;
};

/**
Whether the node is inside a static class element or a static block of the closest class.
*/
export const isInStaticContext = node => {
	const classElement = getContainingClassElement(node);
	return classElement?.type === 'StaticBlock' || classElement?.static === true;
};

const isInside = (node, ancestor) => {
	for (let current = node; current; current = current.parent) {
		if (current === ancestor) {
			return true;
		}
	}

	return false;
};

/**
Whether the node is inside the key or a decorator of its class element, which are evaluated outside the instance.
*/
export const isInClassElementDefinition = node => {
	const classElement = getContainingClassElement(node);
	if (!classElement) {
		return false;
	}

	return (Boolean(classElement.key) && isInside(node, classElement.key))
		|| classElement.decorators?.some(decorator => isInside(node, decorator)) === true;
};
