import {
	shouldAddParenthesesToMemberExpressionObject,
	isParenthesized,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'no-unreadable-array-destructuring';
const messages = {
	[MESSAGE_ID]: 'Array destructuring may not contain consecutive ignored values.',
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			maximumIgnoredElements: {
				type: 'integer',
				minimum: 0,
				description: 'Maximum number of consecutive ignored elements allowed.',
			},
		},
	},
];

function getMaximumConsecutiveIgnoredElements(elements) {
	let maximumConsecutiveIgnoredElements = 0;
	let consecutiveIgnoredElements = 0;

	for (const element of elements) {
		if (element === null) {
			consecutiveIgnoredElements++;
			maximumConsecutiveIgnoredElements = Math.max(maximumConsecutiveIgnoredElements, consecutiveIgnoredElements);
		} else {
			consecutiveIgnoredElements = 0;
		}
	}

	return maximumConsecutiveIgnoredElements;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const {maximumIgnoredElements} = context.options[0];

	context.on('ArrayPattern', node => {
		const {elements, parent} = node;
		const maximumConsecutiveIgnoredElements = getMaximumConsecutiveIgnoredElements(elements);

		if (maximumConsecutiveIgnoredElements <= maximumIgnoredElements) {
			return;
		}

		const problem = {
			node,
			messageId: MESSAGE_ID,
		};

		const nonNullElements = elements.filter(element => element !== null);
		if (
			parent.type === 'VariableDeclarator'
			&& parent.id === node
			&& parent.init !== null
			&& nonNullElements.length === 1
		) {
			const [element] = nonNullElements;

			if (element.type !== 'AssignmentPattern') {
				problem.fix = function * (fixer) {
					const index = elements.indexOf(element);
					const isSlice = element.type === 'RestElement';
					const variable = isSlice ? element.argument : element;

					yield fixer.replaceText(node, sourceCode.getText(variable));

					const code = isSlice ? `.slice(${index})` : `[${index}]`;
					const array = parent.init;
					if (
						!isParenthesized(array, context)
						&& shouldAddParenthesesToMemberExpressionObject(array, context)
					) {
						yield fixer.insertTextBefore(array, '(');
						yield fixer.insertTextAfter(parent, `)${code}`);
					} else {
						yield fixer.insertTextAfter(parent, code);
					}

					yield fixSpaceAroundKeyword(fixer, node, context);
				};
			}
		}

		return problem;
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable array destructuring.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{maximumIgnoredElements: 1}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
