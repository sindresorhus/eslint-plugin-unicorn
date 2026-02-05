import {findVariable} from '@eslint-community/eslint-utils';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isNewExpression, isMemberExpression, isMethodCall} from './ast/index.js';

const MESSAGE_ID = 'prefer-set-size';
const messages = {
	[MESSAGE_ID]: 'Prefer using `Set#size` instead of `Array#length`.',
};

const isNewSet = node => isNewExpression(node, {name: 'Set'});

function isSet(node, scope) {
	if (isNewSet(node)) {
		return true;
	}

	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);

	if (!variable || variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	if (definition.type !== 'Variable' || definition.kind !== 'const') {
		return false;
	}

	const declarator = definition.node;
	return declarator.type === 'VariableDeclarator'
		&& declarator.id.type === 'Identifier'
		&& isNewSet(definition.node.init);
}

function getSetNode(memberExpressionObject) {
	// `[...set].length`
	if (
		memberExpressionObject.type === 'ArrayExpression'
		&& memberExpressionObject.elements.length === 1
		&& memberExpressionObject.elements[0]?.type === 'SpreadElement'
	) {
		return memberExpressionObject.elements[0].argument;
	}

	// `Array.from(set).length`
	if (
		isMethodCall(memberExpressionObject, {
			object: 'Array',
			method: 'from',
			argumentsLength: 1,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return memberExpressionObject.arguments[0];
	}
}

function createFix(context, node, set) {
	const {sourceCode} = context;
	const {object: wrapper, property} = node;

	if (sourceCode.getCommentsInside(wrapper).length > sourceCode.getCommentsInside(set).length) {
		return;
	}

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		yield fixer.replaceText(property, 'size');
		yield fixer.replaceText(wrapper, sourceCode.getText(set));
		yield fixSpaceAroundKeyword(fixer, node, context);
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MemberExpression', node => {
		if (
			!isMemberExpression(node, {
				property: 'length',
				optional: false,
			})
		) {
			return;
		}

		const set = getSetNode(node.object);
		if (!set || !isSet(set, sourceCode.getScope(set))) {
			return;
		}

		return {
			node: node.property,
			messageId: MESSAGE_ID,
			fix: createFix(context, node, set),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer using `Set#size` instead of `Array#length`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
