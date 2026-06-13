import {isKnownNonDomNode} from './utils/index.js';
import {isMemberExpression} from './ast/index.js';

const ERROR = 'error';
const SUGGESTION = 'suggestion';
const messages = {
	[ERROR]: 'Prefer `.textContent` over `.innerText`.',
	[SUGGESTION]: 'Switch to `.textContent`.',
};

const isKnownNonDomObjectPattern = (objectPattern, context) => {
	if (isKnownNonDomNode(objectPattern, context)) {
		return true;
	}

	const {parent} = objectPattern;
	if (parent.type === 'VariableDeclarator') {
		return parent.id === objectPattern
			&& parent.init
			&& isKnownNonDomNode(parent.init, context);
	}

	return parent.type === 'AssignmentExpression'
		&& parent.left === objectPattern
		&& isKnownNonDomNode(parent.right, context);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', memberExpression => {
		if (
			!isMemberExpression(memberExpression, {
				property: 'innerText',
			})
			|| isKnownNonDomNode(memberExpression.object, context)
		) {
			return;
		}

		const node = memberExpression.property;

		return {
			node,
			messageId: ERROR,
			suggest: [
				{
					messageId: SUGGESTION,
					fix: fixer => fixer.replaceText(node, 'textContent'),
				},
			],
		};
	});

	context.on('Identifier', node => {
		if (!(
			node.name === 'innerText'
			&& node.parent.type === 'Property'
			&& node.parent.key === node
			&& !node.parent.computed
			&& node.parent.kind === 'init'
			&& node.parent.parent.type === 'ObjectPattern'
			&& node.parent.parent.properties.includes(node.parent)
		)) {
			return;
		}

		if (isKnownNonDomObjectPattern(node.parent.parent, context)) {
			return;
		}

		return {
			node,
			messageId: ERROR,
			suggest: [
				{
					messageId: SUGGESTION,
					fix: fixer => fixer.replaceText(
						node,
						node.parent.shorthand ? 'textContent: innerText' : 'textContent',
					),
				},
			],
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.textContent` over `.innerText`.',
			recommended: 'unopinionated',
		},
		hasSuggestions: true,
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
