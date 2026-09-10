import {findVariable, isClosingParenToken} from '@eslint-community/eslint-utils';
import {
	isFunction,
	isLiteral,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getAvailableVariableName,
	getPreviousNode,
	getReferences,
	getScopes,
	isKnownNonIndexedCollection,
	isLeftHandSide,
	isTypeScriptExpressionWrapper,
	singular,
	toLocation,
} from './utils/index.js';

const MESSAGE_ID = 'prefer-iterator-zip';
const MESSAGE_ID_SUGGESTION = 'prefer-iterator-zip/suggestion';
const messages = {
	[MESSAGE_ID]: 'Use `Iterator.zip(…)` to iterate over these arrays together.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Iterator.zip(…)`.',
};

const isIdentifier = (node, name) => node?.type === 'Identifier' && node.name === name;

function isIncrement(update, name) {
	if (
		update?.type === 'UpdateExpression'
		&& update.operator === '++'
		&& isIdentifier(update.argument, name)
	) {
		return true;
	}

	if (
		update?.type !== 'AssignmentExpression'
		|| !isIdentifier(update.left, name)
	) {
		return false;
	}

	return (
		update.operator === '+='
		&& isLiteral(update.right, 1)
	) || (
		update.operator === '='
		&& update.right.type === 'BinaryExpression'
		&& update.right.operator === '+'
		&& isIdentifier(update.right.left, name)
		&& isLiteral(update.right.right, 1)
	);
}

function getUpperBound(node, indexName) {
	if (node?.type !== 'BinaryExpression') {
		return;
	}

	if (node.operator === '<' && isIdentifier(node.left, indexName)) {
		return node.right;
	}

	if (node.operator === '>' && isIdentifier(node.right, indexName)) {
		return node.left;
	}
}

function getLengthInput(node) {
	if (
		isMemberExpression(node, {property: 'length', computed: false, optional: false})
		&& node.object.type === 'Identifier'
	) {
		return node.object;
	}
}

function getConjunctionOperands(node) {
	return node?.type === 'LogicalExpression' && node.operator === '&&'
		? [...getConjunctionOperands(node.left), ...getConjunctionOperands(node.right)]
		: [node];
}

function getDistinctInputs(inputs) {
	if (inputs.some(input => !input)) {
		return;
	}

	const inputNames = new Set(inputs.map(input => input.name));
	if (inputNames.size === inputs.length) {
		return inputs;
	}
}

function getMathMinInputs(node) {
	if (!isMethodCall(node, {
		object: 'Math',
		method: 'min',
		minimumArguments: 2,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	return getDistinctInputs(node.arguments.map(argument => getLengthInput(argument)));
}

function getTestInputs(test, indexName) {
	const inputs = getMathMinInputs(getUpperBound(test, indexName));
	if (inputs) {
		return inputs;
	}

	const operands = getConjunctionOperands(test);
	if (operands.length < 2) {
		return;
	}

	return getDistinctInputs(operands.map(operand => getLengthInput(getUpperBound(operand, indexName))));
}

function getCachedLoopInformation(node, indexName, cache, sourceCode) {
	const {declarator, declarationToRemove} = cache;
	const cachedBound = getUpperBound(node.test, indexName);
	if (
		cachedBound?.type !== 'Identifier'
		|| declarator.id.type !== 'Identifier'
		|| declarator.id.name !== cachedBound.name
	) {
		return;
	}

	const [variable] = sourceCode.getDeclaredVariables(declarator);
	const references = variable.references.filter(reference => !reference.init);
	if (
		references.length !== 1
		|| references[0].identifier !== cachedBound
	) {
		return;
	}

	const inputs = getMathMinInputs(declarator.init);
	if (inputs) {
		return {inputs, declarationToRemove};
	}
}

function getLoopInformation(node, context) {
	const {init, update} = node;
	if (
		node.body.type !== 'BlockStatement'
		|| init?.type !== 'VariableDeclaration'
		|| init.kind !== 'let'
		|| init.declarations.length > 2
	) {
		return;
	}

	const [declaration] = init.declarations;
	if (declaration.id.type !== 'Identifier' || !isLiteral(declaration.init, 0)) {
		return;
	}

	const {name} = declaration.id;
	if (!isIncrement(update, name)) {
		return;
	}

	if (init.declarations.length === 1) {
		const inputs = getTestInputs(node.test, name);
		if (inputs) {
			return {inputs};
		}

		const declaration = getPreviousNode(node, context);
		if (
			declaration?.type !== 'VariableDeclaration'
			|| !['const', 'let'].includes(declaration.kind)
			|| declaration.declarations.length !== 1
		) {
			return;
		}

		return getCachedLoopInformation(node, name, {declarator: declaration.declarations[0], declarationToRemove: declaration}, context.sourceCode);
	}

	return getCachedLoopInformation(node, name, {declarator: init.declarations[1]}, context.sourceCode);
}

function getSupportedLoopInformation(node, context) {
	const loopInformation = getLoopInformation(node, context);
	if (
		loopInformation
		&& loopInformation.inputs.every(input => !isKnownNonIndexedCollection(input, context))
	) {
		return loopInformation;
	}
}

function isCapturedReference(identifier, body) {
	for (let node = identifier.parent; node !== body; node = node.parent) {
		if (isFunction(node) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
			return true;
		}
	}

	return false;
}

function isElementRead(node) {
	while (isTypeScriptExpressionWrapper(node.parent) || node.parent.type === 'TSInstantiationExpression') {
		node = node.parent;
	}

	const {parent} = node;
	return !isLeftHandSide(node)
		&& !((parent.type === 'ForOfStatement' || parent.type === 'ForInStatement') && parent.left === node)
		&& !(parent.type === 'CallExpression' && parent.callee === node)
		&& !(parent.type === 'TaggedTemplateExpression' && parent.tag === node);
}

function hasCommentInRanges(context, ranges) {
	const {sourceCode} = context;
	return sourceCode.getAllComments().some(comment => {
		const [start, end] = sourceCode.getRange(comment);
		return ranges.some(([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd);
	});
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.onExit('ForStatement', node => {
		const loopInformation = getSupportedLoopInformation(node, context);
		if (!loopInformation) {
			return;
		}

		const {inputs, declarationToRemove} = loopInformation;

		const [indexVariable] = sourceCode.getDeclaredVariables(node.init);
		const inputVariables = new Map(inputs.map(input => [input.name, findVariable(sourceCode.getScope(input), input)]));
		const bodyScope = sourceCode.getScope(node.body);
		const references = getReferences(bodyScope);
		const reads = new Map(inputs.map(input => [input.name, new Set()]));

		for (const reference of references) {
			const {identifier, resolved} = reference;
			const isIndex = resolved === indexVariable;
			const isInput = inputVariables.has(identifier.name) && resolved === inputVariables.get(identifier.name);
			if (!isIndex && !isInput) {
				continue;
			}

			const member = identifier.parent;
			if (
				isCapturedReference(identifier, node.body)
				|| member.type !== 'MemberExpression'
				|| !member.computed
				|| member.optional
				|| member.object.type !== 'Identifier'
				|| member.property.type !== 'Identifier'
				|| !inputVariables.has(member.object.name)
				|| findVariable(sourceCode.getScope(member), member.object) !== inputVariables.get(member.object.name)
				|| findVariable(sourceCode.getScope(member), member.property) !== indexVariable
				|| !isElementRead(member)
			) {
				return;
			}

			reads.get(member.object.name).add(member);
		}

		if (reads.values().some(nodes => nodes.size === 0)) {
			return;
		}

		const closingParenthesis = sourceCode.getTokenBefore(node.body, isClosingParenToken);
		const headerRange = [sourceCode.getRange(node)[0], sourceCode.getRange(closingParenthesis)[1]];
		const declarationRemovalRange = declarationToRemove && [sourceCode.getRange(declarationToRemove)[0], sourceCode.getRange(node)[0]];
		const problem = {loc: toLocation(headerRange, context), messageId: MESSAGE_ID};
		const replacementRanges = [
			headerRange,
			...reads.values().flatMap(nodes => nodes.values().map(node => sourceCode.getRange(node))),
			...(declarationRemovalRange ? [declarationRemovalRange] : []),
		];
		if (hasCommentInRanges(context, replacementRanges)) {
			return problem;
		}

		const scopes = getScopes(bodyScope);
		const generatedNames = new Set(['Iterator']);
		const names = inputs.map(input => {
			const name = getAvailableVariableName(singular(input.name) || 'element', scopes, name => !generatedNames.has(name));
			generatedNames.add(name);
			return name;
		});

		problem.suggest = [{
			messageId: MESSAGE_ID_SUGGESTION,
			* fix(fixer) {
				if (declarationRemovalRange) {
					yield fixer.removeRange(declarationRemovalRange);
				}

				yield fixer.replaceTextRange(headerRange, `for (const [${names.join(', ')}] of Iterator.zip([${inputs.map(input => input.name).join(', ')}]))`);
				for (const [index, input] of inputs.entries()) {
					for (const read of reads.get(input.name)) {
						let replacement = names[index];
						const tokenBefore = sourceCode.getTokenBefore(read);
						if (
							sourceCode.getRange(tokenBefore)[1] === sourceCode.getRange(read)[0]
							&& (tokenBefore.type === 'Identifier' || tokenBefore.type === 'Keyword')
						) {
							replacement = ` ${replacement}`;
						}

						const tokenAfter = sourceCode.getTokenAfter(read);
						if (
							sourceCode.getRange(read)[1] === sourceCode.getRange(tokenAfter)[0]
							&& (tokenAfter.type === 'Identifier' || tokenAfter.type === 'Keyword')
						) {
							replacement += ' ';
						}

						yield fixer.replaceText(read, replacement);
					}
				}
			},
		}];
		return problem;
	});
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `Iterator.zip()` over parallel-array indexing.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};
export default config;
