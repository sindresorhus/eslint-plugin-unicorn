import {findVariable, isCommentToken} from '@eslint-community/eslint-utils';

const MESSAGE_ID = 'prefer-single-object-destructuring';
const messages = {
	[MESSAGE_ID]: 'Prefer a single object destructuring declaration from `{{source}}`.',
};

const isSupportedDeclarationKind = kind =>
	kind === 'const'
	|| kind === 'let';

const hasCommentsBetween = (sourceCode, firstNode, secondNode) =>
	sourceCode.getTokensBetween(firstNode, secondNode, {includeComments: true})
		.some(token => isCommentToken(token));

const isSimpleObjectPattern = node =>
	node.properties.length > 0
	&& node.properties.every(property =>
		property.type === 'Property'
		&& !property.computed
		&& property.value.type === 'Identifier');

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

const getProblem = (sourceCode, firstNode, secondNode) => {
	const first = getSupportedDeclaration(sourceCode, firstNode);
	const second = getSupportedDeclaration(sourceCode, secondNode);

	if (!(
		first
		&& second
		&& first.node.kind === second.node.kind
		&& first.source === second.source
		&& sourceCode.getCommentsInside(first.node).length === 0
		&& sourceCode.getCommentsInside(second.node).length === 0
		&& !hasCommentsBetween(sourceCode, first.node, second.node)
	)) {
		return;
	}

	const getPropertiesText = node =>
		node.properties.map(property => sourceCode.getText(property)).join(', ');

	const replacement = `${first.node.kind} {${getPropertiesText(first.declarator.id)}, ${getPropertiesText(second.declarator.id)}} = ${first.source};`;

	return {
		node: second.node,
		messageId: MESSAGE_ID,
		data: {
			source: first.source,
		},
		fix: fixer => fixer.replaceTextRange(
			[
				sourceCode.getRange(first.node)[0],
				sourceCode.getRange(second.node)[1],
			],
			replacement,
		),
	};
};

function * getStatementListProblems(sourceCode, statements) {
	for (const [index, secondNode] of statements.entries()) {
		if (index === 0) {
			continue;
		}

		const problem = getProblem(sourceCode, statements[index - 1], secondNode);

		if (problem) {
			yield problem;
		}
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('Program', node => getStatementListProblems(sourceCode, node.body));
	context.on(['BlockStatement', 'StaticBlock'], node => getStatementListProblems(sourceCode, node.body));
	context.on('SwitchCase', node => getStatementListProblems(sourceCode, node.consequent));
};

/** @type {import('eslint').Rule.RuleModule} */
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
