const MESSAGE_ID = 'consistent-tuple-labels';
const messages = {
	[MESSAGE_ID]: 'This tuple element should have a label, just like the other elements.',
};

// A rest element keeps its label inside the `TSRestType` wrapper, e.g. `[...rest: number[]]`.
const isLabeledElement = element =>
	element.type === 'TSNamedTupleMember'
	|| (element.type === 'TSRestType' && element.typeAnnotation.type === 'TSNamedTupleMember');

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('TSTupleType', node => {
		const elements = node.elementTypes;

		// A tuple with fewer than two elements can't be inconsistent.
		if (elements.length < 2) {
			return;
		}

		const unlabeledElements = elements.filter(element => !isLabeledElement(element));

		// All labeled or all unlabeled is consistent.
		if (unlabeledElements.length === 0 || unlabeledElements.length === elements.length) {
			return;
		}

		// At least one element is labeled, so flag every unlabeled element.
		return unlabeledElements.map(element => ({node: element, messageId: MESSAGE_ID}));
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce consistent labels on tuple type elements.',
			recommended: true,
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
