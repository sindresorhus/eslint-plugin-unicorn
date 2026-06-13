import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {unwrapTypeScriptExpression as unwrapExpression} from './utils/index.js';

const MESSAGE_ID = 'no-array-fill-with-reference-type';
const messages = {
	[MESSAGE_ID]: 'Do not use a reference value as the fill value.',
};

function isGlobalIdentifier(node, name, context) {
	return node.type === 'Identifier'
		&& node.name === name
		&& context.sourceCode.isGlobalReference(node);
}

function isRegExpConstruction(node, context) {
	return node.type === 'NewExpression'
		&& isGlobalIdentifier(node.callee, 'RegExp', context);
}

function isReferenceExpression(node, context) {
	node = unwrapExpression(node);

	if (!node) {
		return false;
	}

	if (
		[
			'ObjectExpression',
			'ArrayExpression',
			'ClassExpression',
		].includes(node.type)
	) {
		return true;
	}

	return node.type === 'NewExpression'
		&& !isRegExpConstruction(node, context);
}

function getConstVariableInitializer(node, context) {
	node = unwrapExpression(node);

	if (node.type !== 'Identifier') {
		return;
	}

	const variable = findVariable(context.sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return;
	}

	const [definition] = variable.defs;
	if (
		definition.type !== 'Variable'
		|| definition.node.type !== 'VariableDeclarator'
		|| definition.node.id.type !== 'Identifier'
		|| definition.node.id.name !== node.name
		|| definition.parent.type !== 'VariableDeclaration'
		|| definition.parent.kind !== 'const'
	) {
		return;
	}

	return unwrapExpression(definition.node.init);
}

function isReferenceFillValue(node, context) {
	if (isReferenceExpression(node, context)) {
		return true;
	}

	const initializer = getConstVariableInitializer(node, context);
	return isReferenceExpression(initializer, context);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'fill',
			minimumArguments: 1,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const [fillValue] = callExpression.arguments;
		if (!isReferenceFillValue(fillValue, context)) {
			return;
		}

		return {
			node: fillValue,
			messageId: MESSAGE_ID,
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow using reference values as `Array#fill()` values.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
