import {findVariable} from '@eslint-community/eslint-utils';
import {isMethodCall} from './ast/index.js';
import {removeMethodCall} from './fix/index.js';
import {isArray} from './utils/index.js';

const MESSAGE_ID_UNUSED_INDEX = 'unused-index';
const MESSAGE_ID_UNUSED_VALUE = 'unused-value';
const messages = {
	[MESSAGE_ID_UNUSED_INDEX]: 'Prefer iterating the array directly over `Array#entries()` when the index is unused.',
	[MESSAGE_ID_UNUSED_VALUE]: 'Prefer `Array#keys()` over `Array#entries()` when the value is unused.',
};

const getArrayPattern = node => {
	if (
		node.type !== 'VariableDeclaration'
		|| (node.kind !== 'const' && node.kind !== 'let')
		|| node.declarations.length !== 1
	) {
		return;
	}

	const {id} = node.declarations[0];

	// `[value]`/`[value,]` has one element (a trailing elision is not a slot); `[, value]` has two.
	if (id.type === 'ArrayPattern' && (id.elements.length === 1 || id.elements.length === 2)) {
		return id;
	}
};

const isElementUnused = (element, context) => {
	// Elided or missing slot, for example `[, value]` or `[index]`.
	if (!element) {
		return true;
	}

	// A destructuring/default/rest binding always uses what it captures.
	if (element.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(context.sourceCode.getScope(element), element);
	if (!variable) {
		return false;
	}

	// The `for…of` binding itself counts as a write reference. Any other reference is a real
	// use, whether in the loop body or in a sibling element's default or computed key.
	return variable.references.every(reference => reference.identifier === element);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ForOfStatement', node => {
		if (node.await) {
			return;
		}

		const arrayPattern = getArrayPattern(node.left);
		if (!arrayPattern) {
			return;
		}

		const entriesCall = node.right;
		if (
			!isMethodCall(entriesCall, {
				method: 'entries',
				argumentsLength: 0,
				optionalCall: false,
				optionalMember: false,
			})
			|| !isArray(entriesCall.callee.object, context)
		) {
			return;
		}

		// A missing second slot (`[index]`) means the value is discarded, same as an elided `[index, ]`.
		const [indexElement, valueElement] = arrayPattern.elements;
		const isIndexUnused = isElementUnused(indexElement, context);
		const isValueUnused = isElementUnused(valueElement, context);

		// Only report when exactly one of the two is unused.
		if (isIndexUnused === isValueUnused) {
			return;
		}

		const hasComments = sourceCode.getCommentsInside(arrayPattern).length > 0
			|| sourceCode.getCommentsInside(entriesCall).length > 0;

		// Replace the pattern, keeping a space if the `const`/`let` keyword abuts it
		// (`for (const[index, value]`), so the binding does not merge into `constvalue`.
		const replacePattern = (fixer, text) => {
			const tokenBefore = sourceCode.getTokenBefore(arrayPattern);
			const isAbutting = sourceCode.getRange(tokenBefore)[1] === sourceCode.getRange(arrayPattern)[0];
			return fixer.replaceText(arrayPattern, isAbutting ? ` ${text}` : text);
		};

		if (isIndexUnused) {
			// The kept value binding cannot be safely inlined in these shapes:
			// `[, ...rest]` would be a syntax error, `[, value = 1]` would drop the default.
			if (
				valueElement.type === 'RestElement'
				|| valueElement.type === 'AssignmentPattern'
			) {
				return;
			}

			return {
				node: entriesCall.callee.property,
				messageId: MESSAGE_ID_UNUSED_INDEX,
				fix: hasComments
					? undefined
					: function * (fixer) {
						yield replacePattern(fixer, sourceCode.getText(valueElement));
						yield removeMethodCall(fixer, entriesCall, context);
					},
			};
		}

		// Value unused: keep the index binding and switch `.entries()` to `.keys()`.
		if (indexElement.type !== 'Identifier') {
			return;
		}

		return {
			node: entriesCall.callee.property,
			messageId: MESSAGE_ID_UNUSED_VALUE,
			fix: hasComments
				? undefined
				: function * (fixer) {
					yield replacePattern(fixer, indexElement.name);
					yield fixer.replaceText(entriesCall.callee.property, 'keys');
				},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer iterating an array directly or with `Array#keys()` over `Array#entries()` when the index or value is unused.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
