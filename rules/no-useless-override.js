import {getPropertyName} from '@eslint-community/eslint-utils';
import {replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';
import {isPromiseType} from './utils/index.js';

const MESSAGE_ID = 'no-useless-override';
const messages = {
	[MESSAGE_ID]: 'Useless override; this method only forwards to `{{superCall}}(…)`.',
};

const isVoidOrUndefinedType = type =>
	type.isUnion()
		? type.types.every(type => isVoidOrUndefinedType(type))
		: type.intrinsicName === 'void' || type.intrinsicName === 'undefined';

// The TypeScript type of `node` with its checker, or `undefined` when type information is unavailable.
const getTypeInformation = (node, context) => {
	const {parserServices} = context.sourceCode;
	if (!parserServices?.program) {
		return;
	}

	try {
		return {
			type: parserServices.getTypeAtLocation(node),
			checker: parserServices.program.getTypeChecker(),
		};
	} catch {
		// TypeScript can throw while resolving incomplete projects; keep this best-effort.
	}
};

// Whether the `super.method(…)` call is statically known to return a promise.
const isPromiseReturningCall = (node, context) => {
	const typeInformation = getTypeInformation(node, context);
	return typeInformation !== undefined && isPromiseType(typeInformation.type, typeInformation.checker) === true;
};

// Whether the `super.method(…)` call is statically known to return nothing (`void`/`undefined`).
const isVoidReturningCall = (node, context) => {
	const typeInformation = getTypeInformation(node, context);
	return typeInformation !== undefined && isVoidOrUndefinedType(typeInformation.type);
};

// Whether the `super.method(…)` arguments forward `method`'s parameters unchanged.
const argumentsForwardParameters = (callArguments, parameters) =>
	callArguments.length === parameters.length
	&& parameters.every((parameter, index) => {
		const argument = callArguments[index];

		if (parameter.type === 'Identifier') {
			return argument.type === 'Identifier' && argument.name === parameter.name;
		}

		// A trailing rest parameter forwarded as a spread, for example `foo(...arguments_) { super.foo(...arguments_); }`.
		if (parameter.type === 'RestElement' && parameter.argument.type === 'Identifier') {
			return argument.type === 'SpreadElement'
				&& argument.argument.type === 'Identifier'
				&& argument.argument.name === parameter.argument.name;
		}

		// Default values, destructuring, and TypeScript parameter properties are not plain forwarding.
		return false;
	});

// Returns the `super.<name>(…)` call when the method body is a single passthrough that forwards its parameters unchanged.
function getForwardedSuperCall(methodDefinition, sourceCode) {
	const {value} = methodDefinition;

	// The body must be exactly one statement: `super.method(…)` or `return super.method(…)`.
	if (value.body.body.length !== 1) {
		return;
	}

	const [statement] = value.body.body;

	let callExpression;
	if (statement.type === 'ReturnStatement') {
		callExpression = statement.argument;
	} else if (statement.type === 'ExpressionStatement') {
		callExpression = statement.expression;
	}

	if (callExpression?.type !== 'CallExpression' || callExpression.optional) {
		return;
	}

	const {callee} = callExpression;
	if (
		callee.type !== 'MemberExpression'
		|| callee.optional
		|| callee.object.type !== 'Super'
	) {
		return;
	}

	const scope = sourceCode.getScope(callExpression);
	const name = getPropertyName(methodDefinition, scope);
	// `getPropertyName` returns `null` for dynamic computed names like `[key]`.
	if (typeof name !== 'string' || getPropertyName(callee, scope) !== name) {
		return;
	}

	if (!argumentsForwardParameters(callExpression.arguments, value.params)) {
		return;
	}

	return {callExpression, name, isReturned: statement.type === 'ReturnStatement'};
}

// Whether the method has TypeScript overload signatures (body-less declarations of the same name).
// Removing the implementation would orphan them, so such methods are left alone.
const hasOverloadSignatures = (methodDefinition, name, scope) =>
	methodDefinition.parent.body.some(member =>
		member !== methodDefinition
		&& member.type === 'MethodDefinition'
		&& member.kind === 'method'
		&& member.static === methodDefinition.static
		&& member.value.body === null
		&& getPropertyName(member, scope) === name,
	);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('MethodDefinition', methodDefinition => {
		// Skip constructors (handled by `no-useless-constructor`), getters, and setters.
		if (methodDefinition.kind !== 'method') {
			return;
		}

		// TypeScript modifiers that change the API surface or behavior. `override` and `static` are fine.
		if (
			methodDefinition.accessibility
			|| methodDefinition.optional
			|| methodDefinition.decorators?.length > 0
			// A parameter decorator registers metadata when the method is defined, so removing the method drops that side effect.
			|| methodDefinition.value.params.some(parameter => parameter.decorators?.length > 0)
		) {
			return;
		}

		const {value} = methodDefinition;

		// Skip generators (delegation semantics differ) and no-body members (TypeScript overload/`declare`).
		if (
			value.type !== 'FunctionExpression'
			|| !value.body
			|| value.generator
		) {
			return;
		}

		// `super` is only meaningful when the class has a superclass.
		const classNode = methodDefinition.parent.parent;
		if (!classNode.superClass) {
			return;
		}

		const forwardedSuperCall = getForwardedSuperCall(methodDefinition, sourceCode);
		if (!forwardedSuperCall) {
			return;
		}

		const {callExpression, name, isReturned} = forwardedSuperCall;

		if (hasOverloadSignatures(methodDefinition, name, sourceCode.getScope(methodDefinition))) {
			return;
		}

		if (isReturned) {
			// `return super.method(…)` returns exactly what the parent returns, unless an `async` wrapper turns a non-promise return into a promise.
			if (value.async && !isPromiseReturningCall(callExpression, context)) {
				return;
			}
		} else if (
			// `super.method(…)` as a statement returns `undefined`, so it only matches the parent when the parent returns nothing — and never when `async` wraps that in a promise.
			value.async
			|| !isVoidReturningCall(callExpression, context)
		) {
			return;
		}

		return {
			node: methodDefinition.key,
			messageId: MESSAGE_ID,
			data: {superCall: sourceCode.getText(callExpression.callee)},
			* fix(fixer, {abort}) {
				// Don't drop comments inside the removed method.
				if (sourceCode.getCommentsInside(methodDefinition).length > 0) {
					return abort();
				}

				yield replaceNodeOrTokenAndSpacesBefore(methodDefinition, '', fixer, context);
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
			description: 'Disallow useless overrides of class methods.',
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
