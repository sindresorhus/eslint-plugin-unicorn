import {getPropertyName} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isCallExpression,
	isCallOrNewExpression,
	isNullLiteral,
} from './ast/index.js';
import {
	getOutermostTypeScriptExpression,
	getParenthesizedRange,
	hasStrictNullChecks,
	isTypeScriptFile,
	withTypeInformation,
} from './utils/index.js';

const ERROR_MESSAGE_ID = 'error';
const SUGGESTION_REPLACE_MESSAGE_ID = 'replace';
const SUGGESTION_REMOVE_MESSAGE_ID = 'remove';
const messages = {
	[ERROR_MESSAGE_ID]: 'Use `undefined` instead of `null`.',
	[SUGGESTION_REPLACE_MESSAGE_ID]: 'Replace `null` with `undefined`.',
	[SUGGESTION_REMOVE_MESSAGE_ID]: 'Remove `null`.',
};

const isLooseEqual = node => node.type === 'BinaryExpression' && ['==', '!='].includes(node.operator);
const isStrictEqual = node => node.type === 'BinaryExpression' && ['===', '!=='].includes(node.operator);
const isCallOrNewArgument = node => isCallOrNewExpression(node.parent) && node.parent.arguments.includes(node);

const isReactUseReferenceCall = node =>
	isCallExpression(node, {
		name: 'useRef',
		argumentsLength: 1,
		optional: false,
	})
	|| isMethodCall(node, {
		object: 'React',
		method: 'useRef',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

function isBrowserNullArgument(node) {
	const {parent} = node;

	return (
		isMethodCall(parent, {
			methods: ['createAttributeNS', 'getAttributeNS', 'getAttributeNodeNS', 'removeAttributeNS', 'hasAttributeNS', 'getElementsByTagNameNS'],
			argumentsLength: 2,
		})
		&& parent.arguments[0] === node
	) || (
		isMethodCall(parent, {method: 'createElementNS', minimumArguments: 2, maximumArguments: 3})
		&& parent.arguments[0] === node
	) || (
		isMethodCall(parent, {method: 'setAttributeNS', argumentsLength: 3})
		&& parent.arguments[0] === node
	) || (
		isMethodCall(parent, {
			methods: ['lookupNamespaceURI', 'useProgram', 'bindVertexArray', 'replaceTrack'],
			argumentsLength: 1,
		})
		&& parent.arguments[0] === node
	) || (
		isMethodCall(parent, {
			methods: ['bindBuffer', 'bindFramebuffer', 'bindRenderbuffer', 'bindTexture'],
			argumentsLength: 2,
		})
		&& parent.arguments[1] === node
	);
}

function getNullArgumentRequirementFromTypes(argument, context) {
	const call = argument.parent;
	return withTypeInformation(call.callee, context, ({type, checker, program}) => {
		if (!hasStrictNullChecks(program)) {
			return false;
		}

		const callable = checker.getNonNullableType(type);
		const signatures = call.type === 'NewExpression' ? callable.getConstructSignatures() : callable.getCallSignatures();
		// Project signatures remain under user control, even when their parameter types come from dependencies.
		for (const signature of signatures) {
			const sourceFile = signature.declaration?.getSourceFile();
			if (sourceFile && !program.isSourceFileDefaultLibrary(sourceFile) && !program.isSourceFileFromExternalLibrary(sourceFile)) {
				return false;
			}
		}

		// Do not infer a requirement from the argument itself through a generic, or choose between overloads.
		if (signatures.length !== 1 || !signatures[0].declaration || signatures[0].typeParameters?.length > 0) {
			return;
		}

		const location = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(argument);
		const parameterType = checker.getContextualType(location);
		if (!parameterType) {
			return;
		}

		return checker.isTypeAssignableTo(checker.getNullType(), parameterType)
			&& !checker.isTypeAssignableTo(checker.getUndefinedType(), parameterType);
	});
}

function isTypeScriptNullArgument(node, context) {
	const argument = getOutermostTypeScriptExpression(node);
	if (!isCallOrNewArgument(argument) || argument.parent.arguments.some(argument => argument.type === 'SpreadElement')) {
		return false;
	}

	return getNullArgumentRequirementFromTypes(argument, context)
		?? isBrowserNullArgument(argument);
}

function isTypeScriptNullPropertyAssignment(node, context) {
	const expression = getOutermostTypeScriptExpression(node);
	const {parent} = expression;
	if (parent.type !== 'AssignmentExpression' || parent.operator !== '=' || parent.right !== expression || parent.left.type !== 'MemberExpression') {
		return false;
	}

	const member = parent.left;
	const propertyName = getPropertyName(member, context.sourceCode.getScope(member));
	if (typeof propertyName !== 'string') {
		return false;
	}

	return withTypeInformation(member.object, context, ({type, checker, program}) => {
		if (!hasStrictNullChecks(program)) {
			return false;
		}

		const declarations = checker.getPropertyOfType(type, propertyName)?.declarations;
		if (!declarations?.length || !declarations.every(declaration => {
			const sourceFile = declaration.getSourceFile();
			return program.isSourceFileDefaultLibrary(sourceFile) || program.isSourceFileFromExternalLibrary(sourceFile);
		})) {
			return false;
		}

		const location = context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(expression);
		const propertyType = checker.getContextualType(location);
		return Boolean(propertyType
			&& checker.isTypeAssignableTo(checker.getNullType(), propertyType)
			&& !checker.isTypeAssignableTo(checker.getUndefinedType(), propertyType));
	}) ?? false;
}

// The suggestion deletes everything after `node` up to the `null` and its parentheses, so it can only be offered when no comment sits in that range
function getRemoveSuggestion(context, node, nullNode) {
	const {sourceCode} = context;
	const [, start] = sourceCode.getRange(node);
	const [, end] = getParenthesizedRange(nullNode, context);

	if (sourceCode.getCommentsInside({range: [start, end]}).length > 0) {
		return;
	}

	return {
		messageId: SUGGESTION_REMOVE_MESSAGE_ID,
		fix: fixer => fixer.removeRange([start, end]),
	};
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {checkArguments, checkStrictEquality} = context.options[0];
	const scriptKind = context.sourceCode.parserServices?.esTreeNodeToTSNodeMap?.get(context.sourceCode.ast)?.getSourceFile().scriptKind;
	// TypeScript's public `ScriptKind.TS` and `ScriptKind.TSX` values.
	const isTypeScript = isTypeScriptFile(context.physicalFilename) || scriptKind === 3 || scriptKind === 4;

	context.on('Literal', node => {
		if (
			!isNullLiteral(node)
			|| (!checkStrictEquality && isStrictEqual(node.parent))
			|| (!checkArguments && isCallOrNewArgument(node))
			|| (isTypeScript && (isTypeScriptNullArgument(node, context) || isTypeScriptNullPropertyAssignment(node, context)))
			// `Object.create(null)`, `Object.create(null, foo)`
			|| (
				isMethodCall(node.parent, {
					object: 'Object',
					method: 'create',
					minimumArguments: 1,
					maximumArguments: 2,
					optionalCall: false,
					optionalMember: false,
				})
				&& node.parent.arguments[0] === node
			)
			// `useRef(null)`, `React.useRef(null)`
			|| (
				isReactUseReferenceCall(node.parent)
				&& node.parent.arguments[0] === node
			)
			// `foo.insertBefore(bar, null)`
			|| (
				isMethodCall(node.parent, {
					method: 'insertBefore',
					argumentsLength: 2,
					optionalCall: false,
				})
				&& node.parent.arguments[1] === node
			)
			// `Object.setPrototypeOf(foo, null)`, `Reflect.setPrototypeOf(foo, null)`
			|| (
				isMethodCall(node.parent, {
					objects: ['Object', 'Reflect'],
					method: 'setPrototypeOf',
					argumentsLength: 2,
					optionalCall: false,
					optionalMember: false,
				})
				&& node.parent.arguments[1] === node
			)
		) {
			return;
		}

		const {parent} = node;

		const problem = {
			node,
			messageId: ERROR_MESSAGE_ID,
		};

		const {parent: outerParent} = getOutermostTypeScriptExpression(node);
		if (outerParent.type === 'UnaryExpression' && outerParent.operator === 'delete') {
			return problem;
		}

		const useUndefinedFix = fixer => fixer.replaceText(node, 'undefined');

		if (isLooseEqual(parent)) {
			problem.fix = useUndefinedFix;
			return problem;
		}

		const useUndefinedSuggestion = {
			messageId: SUGGESTION_REPLACE_MESSAGE_ID,
			fix: useUndefinedFix,
		};

		if (parent.type === 'ReturnStatement' && parent.argument === node) {
			problem.suggest = [
				getRemoveSuggestion(context, context.sourceCode.getFirstToken(parent), node),
				useUndefinedSuggestion,
			].filter(Boolean);
			return problem;
		}

		// `const`, `using`, and `await using` declarations and destructuring patterns require an initializer
		if (
			parent.type === 'VariableDeclarator'
			&& parent.init === node
			&& parent.id.type === 'Identifier'
			&& (parent.parent.kind === 'let' || parent.parent.kind === 'var')
		) {
			problem.suggest = [
				getRemoveSuggestion(context, parent.id, node),
				useUndefinedSuggestion,
			].filter(Boolean);
			return problem;
		}

		problem.suggest = [useUndefinedSuggestion];
		return problem;
	});

	// Not an autofix, because `null` from types the user does not control (React refs, DOM APIs) cannot be replaced with `undefined`
	context.on('TSNullKeyword', node => {
		let {parent} = node;
		while (parent.type === 'TSUnionType') {
			parent = parent.parent;
		}

		if (parent.type === 'TSTypeParameterInstantiation' && isReactUseReferenceCall(parent.parent)) {
			return;
		}

		return {
			node,
			messageId: ERROR_MESSAGE_ID,
			suggest: [
				{
					messageId: SUGGESTION_REPLACE_MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, 'undefined'),
				},
			],
		};
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			checkArguments: {
				type: 'boolean',
				description: 'Whether to check `null` used as a direct function call or constructor argument.',
			},
			checkStrictEquality: {
				type: 'boolean',
				description: 'Whether to check strict equality comparisons against `null`.',
			},
		},
	},
];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow the use of `null`.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{checkArguments: true, checkStrictEquality: false}],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
