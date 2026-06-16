import {fixSpaceAroundKeyword} from './fix/index.js';
import {isMemberExpression, isMethodCall} from './ast/index.js';
import {isSet, shouldAddParenthesesToMemberExpressionObject} from './utils/index.js';

const MESSAGE_ID = 'prefer-set-size';
const messages = {
	[MESSAGE_ID]: 'Prefer using `Set#size` instead of `Array#length`.',
};

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

function createFix(context, lengthAccessNode, set) {
	const {sourceCode} = context;
	const {
		object: array,
		property,
	} = lengthAccessNode;

	if (sourceCode.getCommentsInside(array).length > sourceCode.getCommentsInside(set).length) {
		return;
	}

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		yield fixer.replaceText(property, 'size');

		// `set` becomes the object of `.size`, so wrap expressions that need parentheses there
		// (e.g. a TypeScript `set as Set<string>` assertion).
		let setText = sourceCode.getText(set);
		if (shouldAddParenthesesToMemberExpressionObject(set, context)) {
			setText = `(${setText})`;
		}

		yield fixer.replaceText(array, setText);

		if (array.type === 'ArrayExpression') {
			yield fixSpaceAroundKeyword(fixer, lengthAccessNode, context);
		}
	};
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
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
		if (!set || !isSet(set, context)) {
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
		languages: [
			'js/js',
		],
	},
};

export default config;
