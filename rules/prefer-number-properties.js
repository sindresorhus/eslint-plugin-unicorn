import {getStaticValue} from '@eslint-community/eslint-utils';
import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {replaceReferenceIdentifier, fixSpaceAroundKeyword} from './fix/index.js';
import isLeftHandSide from './utils/is-left-hand-side.js';
import isNumber from './utils/is-number.js';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[MESSAGE_ID_ERROR]: 'Prefer `Number.{{property}}` over `{{description}}`.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `{{description}}` with `Number.{{property}}`.',
};

const globalObjects = {
	// Safe to replace with `Number` properties
	parseInt: true,
	parseFloat: true,
	NaN: true,
	Infinity: true,

	// Unsafe to replace with `Number` properties
	isNaN: false,
	isFinite: false,
};

const isNegative = node => {
	const {parent} = node;
	return parent.type === 'UnaryExpression' && parent.operator === '-' && parent.argument === node;
};

const isDeletedNegativeInfinity = node => {
	if (!isNegative(node)) {
		return false;
	}

	const {parent} = node;
	const {parent: grandparent} = parent;

	return grandparent.type === 'UnaryExpression' && grandparent.operator === 'delete' && grandparent.argument === parent;
};

function isBase10OrNoRadixParseIntCall(node, context) {
	const {parent} = node;
	if (parent.type !== 'CallExpression' || parent.callee !== node) {
		return false;
	}

	const radix = parent.arguments[1];
	if (!radix) {
		return true;
	}

	if (radix.type === 'SpreadElement') {
		return false;
	}

	return getStaticValue(radix, context.sourceCode.getScope(radix))?.value === 10;
}

// `isNaN`/`isFinite` differ from `Number.isNaN`/`Number.isFinite` only because they coerce their argument to a number first; when the single argument is already a number, the rewrite is safe to auto-fix
const isCallWithNumberArgument = (node, context) => {
	const {parent} = node;
	if (parent.type !== 'CallExpression' || parent.callee !== node) {
		return false;
	}

	if (parent.arguments.length !== 1) {
		return false;
	}

	const [firstArgument] = parent.arguments;
	if (firstArgument.type === 'SpreadElement') {
		return false;
	}

	return isNumber(firstArgument, context.sourceCode.getScope(node));
};

function getPropertyProblem(reference, context) {
	const {node, path} = reference;
	const [name] = path;
	const {parent} = node;

	let property = name;
	if (name === 'Infinity') {
		property = isNegative(node) ? 'NEGATIVE_INFINITY' : 'POSITIVE_INFINITY';
	}

	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR,
		data: {
			description: name,
			property,
		},
	};

	if (property === 'NEGATIVE_INFINITY') {
		problem.node = parent;
		problem.data.description = '-Infinity';
		problem.fix = function * (fixer) {
			yield fixer.replaceText(parent, 'Number.NEGATIVE_INFINITY');
			yield fixSpaceAroundKeyword(fixer, parent, context);
		};

		return problem;
	}

	const fix = fixer => replaceReferenceIdentifier(node, `Number.${property}`, context, fixer);
	const isSafeToFix = globalObjects[name] || isCallWithNumberArgument(node, context);

	if (isSafeToFix) {
		problem.fix = fix;
	} else {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SUGGESTION,
				fix,
			},
		];
	}

	return problem;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {
		checkInfinity,
		checkNaN,
	} = context.options[0];

	const objects = Object.keys(globalObjects).filter(name => {
		if (!checkInfinity && name === 'Infinity') {
			return false;
		}

		return checkNaN || name !== 'NaN';
	});

	const tracker = new GlobalReferenceTracker({
		objects,
		context,
		handle: getPropertyProblem,
		filter(reference) {
			const {node, path} = reference;
			const [name] = path;

			return !isLeftHandSide(node)
				&& !(name === 'Infinity' && isDeletedNegativeInfinity(node))
				&& !(name === 'parseInt' && isBase10OrNoRadixParseIntCall(node, context));
		},
	});
	tracker.listen();
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkInfinity: {
				type: 'boolean',
				description: 'Whether to check usage of the global `Infinity`.',
			},
			checkNaN: {
				type: 'boolean',
				description: 'Whether to check usage of the global `NaN`.',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Number` static methods over global functions and optionally static properties over global constants.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [
			{
				checkInfinity: false,
				checkNaN: false,
			},
		],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
