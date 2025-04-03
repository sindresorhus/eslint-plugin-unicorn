import {isCommaToken} from '@eslint-community/eslint-utils';
import {replaceNodeOrTokenAndSpacesBefore} from './fix/index.js';
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

const getFunctionNode = (node) => {
	let current = node.parent;
	while (current) {
		if (
			current.type === "FunctionDeclaration" ||
			current.type === "FunctionExpression" ||
			current.type === "ArrowFunctionExpression"
		) {
			return current;
		}
		if (current.type === "MethodDefinition") {
			return current.value;
		}
		current = current.parent;
	}
	return null;
};

const includesUndefined = (typeAnnotation) => {
	if (!typeAnnotation) return false;
	switch (typeAnnotation.type) {
		case "TSUnionType":
			return typeAnnotation.types.some((t) => includesUndefined(t));
		case "TSUndefinedKeyword":
			return true;
		default:
			return false;
	}
};

const hasMixedReturns = (functionNode) => {
	let hasNonUndefined = false;
	let hasExplicitUndefined = false;
	const stack = [];

	if (
		functionNode.type === "ArrowFunctionExpression" &&
		functionNode.body &&
		functionNode.body.type !== "BlockStatement"
	) {
		if (
			functionNode.body.type === "Identifier" &&
			functionNode.body.name === "undefined"
		) {
			hasExplicitUndefined = true;
		} else {
			hasNonUndefined = true;
		}
	} else {
		stack.push(functionNode.body);
		while (stack.length) {
			const node = stack.pop();
			if (!node || typeof node !== "object") continue;
			if (node.type === "ReturnStatement") {
				if (node.argument) {
					if (
						node.argument.type === "Identifier" &&
						node.argument.name === "undefined"
					) {
						hasExplicitUndefined = true;
					} else {
						hasNonUndefined = true;
					}
				}
			}
			for (const key in node) {
				if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
				// Skip the parent property to avoid cycles.
				if (key === "parent") continue;
				const child = node[key];
				if (Array.isArray(child)) {
					for (let i = child.length - 1; i >= 0; i--) {
						stack.push(child[i]);
					}
				} else if (child && typeof child.type === "string") {
					stack.push(child);
				}
			}
			if (hasExplicitUndefined && hasNonUndefined) break;
		}
	}

	return hasExplicitUndefined && hasNonUndefined;
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

	const options = {
		checkArguments: true,
		checkArrowFunctionBody: true,
		allowMixedReturns: false,
		...context.options[0],
	};

	const getProblem = (node, fix, checkFunctionReturnType) => {
		if (checkFunctionReturnType) {
			const functionNode = getFunctionNode(node);
			if (functionNode) {
				const returnType = functionNode.returnType || (functionNode.value && functionNode.value.returnType);
				if (returnType && includesUndefined(returnType.typeAnnotation)) {
					return;
				}
				if (options.allowMixedReturns && hasMixedReturns(functionNode, sourceCode)) {
					return;
				}
			}
		}

		return {
			node,
			messageId,
			fix,
		};
	};

	const removeNodeAndLeadingSpace = (node, fixer) =>
		replaceNodeOrTokenAndSpacesBefore(node, '', fixer, sourceCode);

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
					fixer => replaceNodeOrTokenAndSpacesBefore(node, ' {}', fixer, sourceCode),
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
		if (shouldIgnore(node.callee)) {
			return;
		}

		const argumentNodes = node.arguments;

		// Ignore arguments in `Function#bind()`, but not `this` argument
		if (isFunctionBindCall(node) && argumentNodes.length !== 1) {
			return;
		}

		const undefinedArguments = [];
		for (let index = argumentNodes.length - 1; index >= 0; index--) {
			const node = argumentNodes[index];
			if (isUndefined(node)) {
				undefinedArguments.unshift(node);
			} else {
				break;
			}
		}

		if (undefinedArguments.length === 0) {
			return;
		}

		const firstUndefined = undefinedArguments[0];
		const lastUndefined = undefinedArguments.at(-1);

		return {
			messageId,
			loc: {
				start: sourceCode.getLoc(firstUndefined).start,
				end: sourceCode.getLoc(lastUndefined).end,
			},
			fix(fixer) {
				let [start] = sourceCode.getRange(firstUndefined);
				let [, end] = sourceCode.getRange(lastUndefined);

				const previousArgument = argumentNodes[argumentNodes.length - undefinedArguments.length - 1];

				if (previousArgument) {
					[, start] = sourceCode.getRange(previousArgument);
				} else {
					// If all arguments removed, and there is trailing comma, we need remove it.
					const tokenAfter = sourceCode.getTokenAfter(lastUndefined);
					if (isCommaToken(tokenAfter)) {
						[, end] = sourceCode.getRange(tokenAfter);
					}
				}

				return fixer.removeRange([start, end]);
			},
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
			allowMixedReturns: {
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
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
