import {functionTypes} from './ast/index.js';
import {
	getStaticValueIfNoSideEffects,
	unwrapTypeScriptExpression,
	withTypeInformation,
} from './utils/index.js';

/**
@import * as ESLint from 'eslint';
*/

const MESSAGE_ID = 'prefer-options-parameter';
const messages = {
	[MESSAGE_ID]: 'Prefer an options object over optional positional parameters.',
};

const functionLikeTypes = [
	...functionTypes,
	'TSCallSignatureDeclaration',
	'TSConstructSignatureDeclaration',
	'TSConstructorType',
	'TSDeclareFunction',
	'TSEmptyBodyFunctionExpression',
	'TSFunctionType',
	'TSMethodSignature',
];

const isOptionalParameter = parameter =>
	(parameter.type === 'Identifier' && parameter.optional === true)
	|| (parameter.type === 'AssignmentPattern' && parameter.left.type === 'Identifier');

function isRecordType(type, checker) {
	if (type.isUnionOrIntersection()) {
		const types = type.types.filter(type => type.intrinsicName !== 'undefined');
		return types.length > 0 && types.every(type => isRecordType(type, checker));
	}

	const objectTypeFlag = 1_048_576; // TypeScript's TypeFlags.Object.
	const symbol = type.getSymbol();
	if (
		type.flags !== objectTypeFlag
		|| !symbol
		|| checker.isArrayType(type)
		|| checker.isTupleType(type)
		|| type.getCallSignatures().length > 0
		|| type.getConstructSignatures().length > 0
	) {
		return false;
	}

	// Class instances and native types like Date have a corresponding constructor value.
	if (
		symbol.valueDeclaration
		&& checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration).getConstructSignatures().length > 0
	) {
		return false;
	}

	return type.getProperties().length > 0 || checker.getIndexInfosOfType(type).length > 0;
}

function isOptionsParameter(parameter, context) {
	const binding = parameter.type === 'AssignmentPattern' ? parameter.left : parameter;
	if (binding.type === 'ObjectPattern') {
		return true;
	}

	if (binding.type !== 'Identifier') {
		return false;
	}

	if (parameter.type === 'AssignmentPattern') {
		const defaultValue = unwrapTypeScriptExpression(parameter.right);
		if (defaultValue.type === 'ObjectExpression') {
			return true;
		}

		const result = getStaticValueIfNoSideEffects(defaultValue, context);
		if (
			result?.value !== null
			&& typeof result?.value === 'object'
			&& (Object.getPrototypeOf(result.value) === Object.prototype || Object.getPrototypeOf(result.value) === null)
		) {
			return true;
		}
	}

	return withTypeInformation(binding, context, ({type, checker}) => isRecordType(type, checker)) === true;
}

/**
@param {ESLint.Rule.RuleContext} context
*/
const create = context => {
	context.on(functionLikeTypes, node => {
		const {params: parameters} = node;
		if (parameters.length < 2) {
			return;
		}

		const hasOptionsObject = isOptionsParameter(parameters.at(-1), context);
		if (!hasOptionsObject && !context.options[0].checkWithoutOptionsObject) {
			return;
		}

		const lastPositionalParameterIndex = parameters.length - (hasOptionsObject ? 2 : 1);
		let index = lastPositionalParameterIndex;
		while (index >= 0 && isOptionalParameter(parameters[index])) {
			index--;
		}

		if (lastPositionalParameterIndex - index < (hasOptionsObject ? 1 : 2)) {
			return;
		}

		return {
			node: parameters[index + 1],
			messageId: MESSAGE_ID,
		};
	});
};

/**
@type {ESLint.Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer an options object over optional positional parameters.',
			// eslint-disable-next-line no-warning-comments
			// TODO: Enable in the recommended preset when the rule is more mature.
			recommended: false,
		},
		schema: [{
			type: 'object',
			properties: {
				checkWithoutOptionsObject: {
					type: 'boolean',
					description: 'Whether to check functions without an existing options object parameter.',
				},
			},
			additionalProperties: false,
		}],
		defaultOptions: [{checkWithoutOptionsObject: true}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
