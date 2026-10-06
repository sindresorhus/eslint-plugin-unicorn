import {
	shouldAddParenthesesToMemberExpressionObject,
	isKnownNonArray,
	isKnownNonIndexedCollection,
	isParenthesized,
	getParentPattern,
} from './utils/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID_IGNORED_ELEMENTS = 'ignored-elements';
const MESSAGE_ID_PROPERTY_ASSIGNMENT = 'property-assignment';
const messages = {
	[MESSAGE_ID_IGNORED_ELEMENTS]: 'Array destructuring may not contain consecutive ignored values.',
	[MESSAGE_ID_PROPERTY_ASSIGNMENT]: 'Do not assign destructured values to object properties.',
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

/**
@param {import('eslint').Rule.RuleContext} context
*/
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
			messageId: MESSAGE_ID_IGNORED_ELEMENTS,
		};

		const nonNullElements = elements.filter(element => element !== null);
		if (
			parent.type === 'VariableDeclarator'
			&& parent.id === node
			&& parent.init !== null
			&& nonNullElements.length === 1
		) {
			const [element] = nonNullElements;
			const isSlice = element.type === 'RestElement';

			// The pattern is replaced by the variable alone, so a comment inside the pattern and the type annotation on it would be lost. Destructuring reads through the iterator protocol while `[…]` and `.slice(…)` read by index, so the rewrite needs an indexable source. A rest element always creates an `Array`, but `.slice()` on a typed array returns a typed array.
			if (
				element.type !== 'AssignmentPattern'
				&& !node.typeAnnotation
				&& !isKnownNonIndexedCollection(parent.init, context)
				&& !(isSlice && isKnownNonArray(parent.init, context))
				&& sourceCode.getCommentsInside(node).length === 0
			) {
				problem.fix = function * (fixer) {
					const index = elements.indexOf(element);
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

	context.on('MemberExpression', node => {
		if (getParentPattern(node)?.type !== 'ArrayPattern') {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_PROPERTY_ASSIGNMENT,
		};
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
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
