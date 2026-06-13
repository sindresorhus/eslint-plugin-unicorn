import {findVariable} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import isLeftHandSide from './utils/is-left-hand-side.js';

const MESSAGE_ID = 'prefer-global-number-constants';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `Number.{{property}}`.',
};

const replacements = {
	NaN: 'NaN',
	POSITIVE_INFINITY: 'Infinity',
	NEGATIVE_INFINITY: '-Infinity',
};

function isReplacementShadowed(node, replacement, context) {
	const name = replacement === 'NaN' ? 'NaN' : 'Infinity';
	const variable = findVariable(context.sourceCode.getScope(node), name);

	return variable?.defs.length > 0;
}

function getPropertyProblem(reference, context) {
	const {node, path} = reference;
	const [, property] = path;
	const replacement = replacements[property];

	if (isReplacementShadowed(node, replacement, context)) {
		return;
	}

	const problem = {
		node,
		messageId: MESSAGE_ID,
		data: {
			property,
			replacement,
		},
	};

	if (
		property !== 'NEGATIVE_INFINITY'
		&& context.sourceCode.getCommentsInside(node).length === 0
	) {
		problem.fix = fixer => fixer.replaceText(node, replacement);
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	for (const object of [
		'Number.NaN',
		'Number.POSITIVE_INFINITY',
		'Number.NEGATIVE_INFINITY',
	]) {
		const tracker = new GlobalReferenceTracker({
			object,
			context,
			handle: getPropertyProblem,
			filter: ({node}) => !isLeftHandSide(node),
		});

		tracker.listen();
	}
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer global numeric constants over `Number` static properties.',
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
