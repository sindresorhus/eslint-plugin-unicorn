import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';
import {replaceReferenceIdentifier, fixSpaceAroundKeyword} from './fix/index.js';
import isLeftHandSide from './utils/is-left-hand-side.js';

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

function checkProperty({node, path: [name]}, context) {
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
	const isSafeToFix = globalObjects[name];

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
	} = {
		checkInfinity: false,
		checkNaN: true,
		...context.options[0],
	};

	const objects = Object.keys(globalObjects).filter(name => {
		if (!checkInfinity && name === 'Infinity') {
			return false;
		}

		if (!checkNaN && name === 'NaN') {
			return false;
		}

		return true;
	});

	new GlobalReferenceTracker({
		objects,
		context,
		handle: checkProperty,
		filter: ({node}) => !isLeftHandSide(node),
	}).listen();
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkInfinity: {
				type: 'boolean',
			},
			checkNaN: {
				type: 'boolean',
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
			description: 'Prefer `Number` static properties over global ones.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [
			{
				checkInfinity: false,
				checkNaN: true,
			},
		],
		messages,
	},
};

export default config;
