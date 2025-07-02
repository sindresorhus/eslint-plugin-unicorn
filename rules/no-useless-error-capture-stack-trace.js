import {findVariable} from '@eslint-community/eslint-utils';
import {
	isMethodCall,
	isMemberExpression,
} from './ast/index.js';
import builtinErrors from './shared/builtin-errors.js';

const MESSAGE_ID_ERROR = 'no-useless-error-capture-stack-trace/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Unnecessary `Error.captureStackTrace(…)` call.',
};

const isSubclassOfBuiltinErrors = (node, context) =>
	node?.superClass
	&& node.superClass.type === 'Identifier'
	&& builtinErrors.includes(node.superClass.name)
	&& context.sourceCode.isGlobalReference(node.superClass);

const isClassReference = (node, classNode, context) => {
	// `new.target`
	if (
		node.type === 'MetaProperty'
		&& node.meta.type === 'Identifier'
		&& node.meta.name === 'new'
		&& node.property.type === 'Identifier'
		&& node.property.name === 'target'
	) {
		return true;
	}

	// `this.constructor`
	if (
		isMemberExpression(node, {
			property: 'constructor',
			computed: false,
			optional: false,
		})
		&& node.object.type === 'ThisExpression'
	) {
		return true;
	}

	if (node.type !== 'Identifier' || !classNode.id) {
		return false;
	}

	const scope = context.sourceCode.getScope(node);
	const variable = findVariable(scope, node);

	return variable
		&& variable.defs.length === 1
		&& variable.defs[0].type === 'ClassName'
		&& variable.defs[0].node === classNode;
};

const isClassConstructor = (node, classNode) =>
	node
	&& node.parent.type === 'MethodDefinition'
	&& node.parent.kind === 'constructor'
	&& node.parent.value === node
	&& classNode.body.body.includes(node.parent);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const classStack = [];
	const thisScopeStack = [];

	context.on(['ClassDeclaration', 'ClassExpression'], classNode => {
		classStack.push(classNode);
		thisScopeStack.push(classNode);
	});

	context.onExit(['ClassDeclaration', 'ClassExpression'], () => {
		classStack.pop();
		thisScopeStack.pop();
	});

	context.on(['FunctionDeclaration', 'FunctionExpression'], functionNode => {
		thisScopeStack.push(functionNode);
	});

	context.onExit(['FunctionDeclaration', 'FunctionExpression'], () => {
		thisScopeStack.pop();
	});

	context.on('CallExpression', callExpression => {
		const errorClass = classStack.at(-1);

		if (!(
			isSubclassOfBuiltinErrors(errorClass, context)
			&& isClassConstructor(thisScopeStack.at(-1), errorClass)
			&& isMethodCall(callExpression, {
				object: 'Error',
				method: 'captureStackTrace',
				argumentsLength: 2,
				optionalMember: false,
			})
			&& context.sourceCode.isGlobalReference(callExpression.callee.object)
		)) {
			return;
		}

		const [firstArgument, secondArgument] = callExpression.arguments;

		if (
			firstArgument.type !== 'ThisExpression'
			|| !isClassReference(secondArgument, errorClass, context)
		) {
			return;
		}

		const problem = {
			node: callExpression,
			messageId: MESSAGE_ID_ERROR,
		};

		const maybeExpressionStatement = callExpression.parent === 'ChainExpression'
			? callExpression.parent.parent
			: callExpression.parent;

		if (
			maybeExpressionStatement.type === 'ExpressionStatement'
			&& maybeExpressionStatement.parent.type === 'BlockStatement'
		) {
			problem.fix = fixer => fixer.remove(maybeExpressionStatement);
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
			description: 'Disallow unnecessary `Error.captureStackTrace(…)`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
