import {removeArgument, replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';
import {isUndefined, isFunction} from './ast/index.js';

const messageId = 'no-useless-undefined';
const messages = {
	[messageId]: 'Do not use useless `undefined`.',
};

const compareFunctionNames = new Set([
	'is',
	'equal',
	'notEqual',
	'strictEqual',
	'notStrictEqual',
	'propertyVal',
	'notPropertyVal',
	'not',
	'include',
	'property',
	'toBe',
	'toHaveBeenCalledWith',
	'toContain',
	'toContainEqual',
	'toEqual',
	'same',
	'notSame',
	'strictSame',
	'strictNotSame',
]);
const shouldIgnore = node => {
	let name;

	if (node.type === 'Identifier') {
		name = node.name;
	} else if (
		node.type === 'MemberExpression'
		&& node.computed === false
		&& node.property.type === 'Identifier'
	) {
		name = node.property.name;
	}

	return compareFunctionNames.has(name)
		// `array.push(undefined)`
		|| name === 'push'
		// `array.unshift(undefined)`
		|| name === 'unshift'
		// `array.includes(undefined)`
		|| name === 'includes'

		// `set.add(undefined)`
		|| name === 'add'
		// `set.has(undefined)`
		|| name === 'has'
		// `set.delete(undefined)`
		|| name === 'delete'

		// `map.set(foo, undefined)`
		|| name === 'set'

		// `React.createContext(undefined)`
		|| name === 'createContext'
		// `setState(undefined)`
		|| /^set[A-Z]/.test(name)
		// React 19 useRef
		|| name === 'useRef'

		// https://vuejs.org/api/reactivity-core.html#ref
		|| name === 'ref';
};

const getFunction = scope => {
	for (; scope; scope = scope.upper) {
		if (scope.type === 'function') {
			return scope.block;
		}
	}
};

const isFunctionBindCall = node =>
	!node.optional
	&& node.callee.type === 'MemberExpression'
	&& !node.callee.computed
	&& node.callee.property.type === 'Identifier'
	&& node.callee.property.name === 'bind';

const isTypeScriptFile = context =>
	/\.(?:ts|mts|cts|tsx)$/i.test(context.physicalFilename);

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	const getProblem = (node, fix, checkFunctionReturnType) => {
		if (checkFunctionReturnType) {
			const functionNode = getFunction(sourceCode.getScope(node));
			if (functionNode?.returnType) {
				return;
			}
		}

		return {
			node,
			messageId,
			fix,
		};
	};

	const options = {
		checkArguments: true,
		checkArrowFunctionBody: true,
		...context.options[0],
	};

	const removeNodeAndLeadingSpace = (node, fixer) =>
		replaceNodeOrTokenAndSpacesBefore(node, '', fixer, context);

	// `return undefined`
	context.on('Identifier', node => {
		if (
			isUndefined(node)
			&& node.parent.type === 'ReturnStatement'
			&& node.parent.argument === node
		) {
			return getProblem(
				node,
				fixer => removeNodeAndLeadingSpace(node, fixer),
				/* CheckFunctionReturnType */ true,
			);
		}
	});

	// `yield undefined`
	context.on('Identifier', node => {
		if (
			isUndefined(node)
			&& node.parent.type === 'YieldExpression'
			&& !node.parent.delegate
			&& node.parent.argument === node
		) {
			return getProblem(
				node,
				fixer => removeNodeAndLeadingSpace(node, fixer),
			);
		}
	});

	// `() => undefined`
	if (options.checkArrowFunctionBody) {
		context.on('Identifier', node => {
			if (
				isUndefined(node)
				&& node.parent.type === 'ArrowFunctionExpression'
				&& node.parent.body === node
			) {
				return getProblem(
					node,
					fixer => replaceNodeOrTokenAndSpacesBefore(node, ' {}', fixer, context),
					/* CheckFunctionReturnType */ true,
				);
			}
		});
	}

	// `let foo = undefined` / `var foo = undefined`
	context.on('Identifier', node => {
		if (
			isUndefined(node)
			&& node.parent.type === 'VariableDeclarator'
			&& node.parent.init === node
			&& node.parent.parent.type === 'VariableDeclaration'
			&& node.parent.parent.kind !== 'const'
			&& node.parent.parent.declarations.includes(node.parent)
		) {
			const [, start] = sourceCode.getRange(node.parent.id);
			const [, end] = sourceCode.getRange(node);
			return getProblem(
				node,
				fixer => fixer.removeRange([start, end]),
				/* CheckFunctionReturnType */ true,
			);
		}
	});

	// `const {foo = undefined} = {}`
	context.on('Identifier', node => {
		if (
			isUndefined(node)
			&& node.parent.type === 'AssignmentPattern'
			&& node.parent.right === node
		) {
			return getProblem(
				node,
				function * (fixer) {
					const assignmentPattern = node.parent;
					const {left} = assignmentPattern;
					const [, start] = sourceCode.getRange(left);
					const [, end] = sourceCode.getRange(node);

					yield fixer.removeRange([start, end]);
					if (
						(left.typeAnnotation || isTypeScriptFile(context))
						&& !left.optional
						&& isFunction(assignmentPattern.parent)
						&& assignmentPattern.parent.params.includes(assignmentPattern)
					) {
						yield (
							left.typeAnnotation
								? fixer.insertTextBefore(left.typeAnnotation, '?')
								: fixer.insertTextAfter(left, '?')
						);
					}
				},
				/* CheckFunctionReturnType */ true,
			);
		}
	});

	if (!options.checkArguments) {
		return;
	}

	context.on('CallExpression', node => {
		const argumentNodes = node.arguments;
		const lastArgument = argumentNodes.at(-1);

		if (!isUndefined(lastArgument) || shouldIgnore(node.callee)) {
			return;
		}

		// Ignore arguments in `Function#bind()`, but not `this` argument
		if (isFunctionBindCall(node) && argumentNodes.length !== 1) {
			return;
		}

		return {
			node: lastArgument,
			messageId,
			fix: fixer => removeArgument(fixer, lastArgument, context),
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
			},
			checkArrowFunctionBody: {
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
			description: 'Disallow useless `undefined`.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
