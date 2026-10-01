import {findVariable, getPropertyName} from '@eslint-community/eslint-utils';
import {getCommentSafeProblem, getParenthesizedText, hasNonDirectiveComment, unwrapTypeScriptExpression} from './utils/index.js';

const MESSAGE_ID = 'prefer-single-object-destructuring';
const MESSAGE_ID_INLINE = 'prefer-direct-object-destructuring';
const messages = {
	[MESSAGE_ID]: 'Prefer a single object destructuring declaration from `{{source}}`.',
	[MESSAGE_ID_INLINE]: 'Prefer destructuring directly from the initializer of `{{source}}`.',
};

const supportedInlineInitializerTypes = new Set([
	'Identifier',
	'MemberExpression',
	'ChainExpression',
	'CallExpression',
	'NewExpression',
	'TaggedTemplateExpression',
	'AwaitExpression',
]);

const isSupportedDeclarationKind = kind =>
	kind === 'const'
	|| kind === 'let';

const isSimpleObjectPattern = node =>
	node.properties.length > 0
	&& node.properties.every(property =>
		property.type === 'Property'
		&& !property.computed
		&& property.value.type === 'Identifier');

// Merging would put the same key in one pattern twice, which is valid but reads like a mistake
const hasDuplicateKey = (firstPattern, secondPattern) => {
	const keys = new Set(firstPattern.properties.map(property => getPropertyName(property)));
	return secondPattern.properties.some(property => keys.has(getPropertyName(property)));
};

const isConstVariableReference = (sourceCode, node) => {
	const variable = findVariable(sourceCode.getScope(node), node);
	if (!variable || variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	return definition.type === 'Variable'
		&& definition.node.type === 'VariableDeclarator'
		&& definition.parent.type === 'VariableDeclaration'
		&& !definition.parent.declare
		&& definition.parent.kind === 'const';
};

const getSupportedDeclaration = (sourceCode, node) => {
	if (!(
		node.type === 'VariableDeclaration'
		&& isSupportedDeclarationKind(node.kind)
		&& !node.declare
		&& node.declarations.length === 1
	)) {
		return;
	}

	const [declarator] = node.declarations;

	if (!(
		declarator.id.type === 'ObjectPattern'
		&& !declarator.id.typeAnnotation
		&& isSimpleObjectPattern(declarator.id)
		&& declarator.init?.type === 'Identifier'
		&& isConstVariableReference(sourceCode, declarator.init)
	)) {
		return;
	}

	return {
		node,
		declarator,
		source: declarator.init.name,
	};
};

const getInlineProblem = (context, firstNode, secondNode) => {
	const {sourceCode} = context;
	if (!(
		firstNode.type === 'VariableDeclaration'
		&& firstNode.kind === 'const'
		&& !firstNode.declare
		&& firstNode.declarations.length === 1
	)) {
		return;
	}

	const [declarator] = firstNode.declarations;
	if (declarator.id.type !== 'Identifier' || declarator.id.typeAnnotation || !declarator.init) {
		return;
	}

	const second = getSupportedDeclaration(sourceCode, secondNode);
	if (!second) {
		return;
	}

	const variable = findVariable(sourceCode.getScope(second.declarator.init), second.declarator.init);
	const replacementRange = [
		sourceCode.getRange(firstNode)[0],
		sourceCode.getRange(secondNode)[1],
	];
	if (
		variable.defs[0].node !== declarator
		|| variable.references.some(reference => !reference.init && reference.identifier !== second.declarator.init)
		|| hasNonDirectiveComment(context, replacementRange)
	) {
		return;
	}

	// Limit inlining to expressions that preserve contextual typing and inferred function/class names.
	const initializer = unwrapTypeScriptExpression(declarator.init);
	if (!supportedInlineInitializerTypes.has(initializer.type)) {
		return;
	}

	const replacement = `${secondNode.kind} ${sourceCode.getText(second.declarator.id)} = ${getParenthesizedText(declarator.init, context)};`;

	return getCommentSafeProblem(context, {
		node: declarator.id,
		messageId: MESSAGE_ID_INLINE,
		data: {source: declarator.id.name},
		fix: fixer => fixer.replaceTextRange(replacementRange, replacement),
	}, replacementRange);
};

const getMergeProblem = (context, firstNode, secondNode) => {
	const {sourceCode} = context;
	const first = getSupportedDeclaration(sourceCode, firstNode);
	const second = getSupportedDeclaration(sourceCode, secondNode);

	if (!(first
		&& second
		&& first.node.kind === second.node.kind
		&& first.source === second.source)) {
		return;
	}

	const replacementRange = [
		sourceCode.getRange(first.node)[0],
		sourceCode.getRange(second.node)[1],
	];
	if (
		hasDuplicateKey(first.declarator.id, second.declarator.id)
		|| hasNonDirectiveComment(context, replacementRange)
	) {
		return;
	}

	const getPropertiesText = node =>
		node.properties.map(property => sourceCode.getText(property)).join(', ');

	const replacement = `${first.node.kind} {${getPropertiesText(first.declarator.id)}, ${getPropertiesText(second.declarator.id)}} = ${first.source};`;

	return getCommentSafeProblem(context, {
		node: second.node,
		messageId: MESSAGE_ID,
		data: {
			source: first.source,
		},
		fix: fixer => fixer.replaceTextRange(replacementRange, replacement),
	}, replacementRange);
};

function * getStatementListProblems(context, statements) {
	for (const [index, secondNode] of statements.entries()) {
		if (index === 0) {
			continue;
		}

		const firstNode = statements[index - 1];
		const problem = getInlineProblem(context, firstNode, secondNode) ?? getMergeProblem(context, firstNode, secondNode);

		if (problem) {
			yield problem;
		}
	}
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	context.on('Program', node => getStatementListProblems(context, node.body));
	context.on(['BlockStatement', 'StaticBlock'], node => getStatementListProblems(context, node.body));
	context.on('SwitchCase', node => getStatementListProblems(context, node.consequent));
};

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer a single object destructuring declaration per local const source.',
			recommended: true,
		},
		fixable: 'code',
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
