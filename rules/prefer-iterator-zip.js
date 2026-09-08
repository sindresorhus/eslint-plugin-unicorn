import {findVariable, isClosingParenToken} from '@eslint-community/eslint-utils';
import {
	isFunction,
	isLiteral,
	isMemberExpression,
	isMethodCall,
} from './ast/index.js';
import {
	getAvailableVariableName,
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

const isIncrement = (update, name) => (
	update?.type === 'UpdateExpression'
	&& update.operator === '++'
	&& isIdentifier(update.argument, name)
) || (
	update?.type === 'AssignmentExpression'
	&& update.operator === '+='
	&& isIdentifier(update.left, name)
	&& isLiteral(update.right, 1)
);

function getInputs(node) {
	const {init, test, update} = node;
	if (
		node.body.type !== 'BlockStatement'
		|| init?.type !== 'VariableDeclaration'
		|| init.kind !== 'let'
		|| init.declarations.length !== 1
		|| test?.type !== 'BinaryExpression'
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

	let bound;
	if (test.operator === '<' && isIdentifier(test.left, name)) {
		bound = test.right;
	} else if (test.operator === '>' && isIdentifier(test.right, name)) {
		bound = test.left;
	}

	if (!isMethodCall(bound, {
		object: 'Math',
		method: 'min',
		minimumArguments: 2,
		optionalCall: false,
		optionalMember: false,
	})) {
		return;
	}

	const inputs = [];
	for (const argument of bound.arguments) {
		if (
			!isMemberExpression(argument, {property: 'length', computed: false, optional: false})
			|| argument.object.type !== 'Identifier'
			|| inputs.some(input => input.name === argument.object.name)
		) {
			return;
		}

		inputs.push(argument.object);
	}

	return inputs;
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

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const {sourceCode} = context;
	context.onExit('ForStatement', node => {
		const inputs = getInputs(node);
		if (!inputs || inputs.some(input => isKnownNonIndexedCollection(input, context))) {
			return;
		}

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
		const problem = {loc: toLocation(headerRange, context), messageId: MESSAGE_ID};
		const replacementRanges = [headerRange, ...reads.values().flatMap(nodes => nodes.values().map(node => sourceCode.getRange(node)))];
		if (sourceCode.getCommentsInside(node).some(comment => {
			const [start, end] = sourceCode.getRange(comment);
			return replacementRanges.some(([rangeStart, rangeEnd]) => start >= rangeStart && end <= rangeEnd);
		})) {
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
				yield fixer.replaceTextRange(headerRange, `for (const [${names.join(', ')}] of Iterator.zip([${inputs.map(input => input.name).join(', ')}]))`);
				for (const [index, input] of inputs.entries()) {
					for (const read of reads.get(input.name)) {
						yield fixer.replaceText(read, names[index]);
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
