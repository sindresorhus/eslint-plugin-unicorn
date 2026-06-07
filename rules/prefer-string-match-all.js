import {findVariable, getStaticValue} from '@eslint-community/eslint-utils';
import regjsparser from 'regjsparser';
import {
	isFunction,
	isMethodCall,
	isNewExpression,
	isNullLiteral,
	isRegexLiteral,
} from './ast/index.js';

const {parse: parseRegExp} = regjsparser;
const MESSAGE_ID = 'prefer-string-match-all';
const messages = {
	[MESSAGE_ID]: 'Prefer `String#matchAll()` over a `RegExp#exec()` loop.',
};

const hasCommentsInRange = (sourceCode, [start, end]) =>
	sourceCode.getAllComments().some(comment => {
		const [commentStart, commentEnd] = sourceCode.getRange(comment);
		return commentStart >= start && commentEnd <= end;
	});

const getAssignmentExpression = node => {
	if (node.type === 'AssignmentExpression') {
		return node;
	}

	if (
		node.type === 'BinaryExpression'
		&& (node.operator === '!==' || node.operator === '!=')
	) {
		if (isNullLiteral(node.right)) {
			return node.left;
		}

		if (isNullLiteral(node.left)) {
			return node.right;
		}
	}
};

const getLoopData = node => {
	const assignmentExpression = getAssignmentExpression(node.test);

	if (
		assignmentExpression?.type !== 'AssignmentExpression'
		|| assignmentExpression.operator !== '='
		|| assignmentExpression.left.type !== 'Identifier'
	) {
		return;
	}

	const {right} = assignmentExpression;
	if (!isMethodCall(right, {
		method: 'exec',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	})) {
		return;
	}

	return {
		matchIdentifier: assignmentExpression.left,
		regexpNode: right.callee.object,
		stringNode: right.arguments[0],
	};
};

const getPreviousLetDeclaration = (node, matchIdentifierName) => {
	const {parent} = node;
	if (!parent || !Array.isArray(parent.body)) {
		return;
	}

	const index = parent.body.indexOf(node);
	const previousStatement = parent.body[index - 1];

	if (
		previousStatement?.type !== 'VariableDeclaration'
		|| previousStatement.kind !== 'let'
		|| previousStatement.declarations.length !== 1
	) {
		return;
	}

	const [declarator] = previousStatement.declarations;
	if (
		declarator.init
		|| declarator.id.type !== 'Identifier'
		|| declarator.id.name !== matchIdentifierName
	) {
		return;
	}

	return previousStatement;
};

const getRegExpVariable = (node, sourceCode) => {
	if (node.type !== 'Identifier') {
		return;
	}

	return findVariable(sourceCode.getScope(node), node);
};

const isStaticConstStringIdentifier = (node, sourceCode) => {
	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(sourceCode.getScope(node), node);
	if (variable?.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	if (definition.node.parent.kind !== 'const') {
		return false;
	}

	const staticResult = getStaticValue(node, sourceCode.getScope(node));
	return typeof staticResult?.value === 'string';
};

const isGlobalRegExpDefinition = variable => {
	if (variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;
	const {init} = definition.node;
	if (
		!init
		|| definition.node.parent.kind === 'var'
	) {
		return false;
	}

	if (
		!isRegexLiteral(init)
		&& !isNewExpression(init, {name: 'RegExp'})
	) {
		return false;
	}

	const staticResult = getStaticValue(init, variable.scope);

	if (!staticResult) {
		return false;
	}

	const {value} = staticResult;
	return (
		Object.prototype.toString.call(value) === '[object RegExp]'
		&& value.global
		&& !canMatchEmptyString(value)
	);
};

const canMatchEmptyString = regexp => {
	let tree;

	try {
		tree = parseRegExp(regexp.source, regexp.flags, {
			unicodePropertyEscape: regexp.flags.includes('u'),
			unicodeSet: regexp.flags.includes('v'),
			namedGroups: true,
			lookbehind: true,
		});
	} catch {
		return true;
	}

	return isRegExpNodeNullable(tree);
};

const isRegExpNodeNullable = node => {
	switch (node.type) {
		case 'alternative': {
			return node.body.every(node => isRegExpNodeNullable(node));
		}

		case 'disjunction': {
			return node.body.some(node => isRegExpNodeNullable(node));
		}

		case 'group': {
			if (node.behavior !== 'normal' && node.behavior !== 'ignore') {
				return true;
			}

			return node.body.every(node => isRegExpNodeNullable(node));
		}

		case 'quantifier': {
			return node.min === 0 || node.body.every(node => isRegExpNodeNullable(node));
		}

		case 'anchor': {
			return true;
		}

		case 'value':
		case 'characterClassEscape':
		case 'unicodePropertyEscape':
		case 'dot': {
			return false;
		}

		case 'characterClass': {
			return node.body.some(node => node.type === 'classStrings' || isRegExpNodeNullable(node));
		}

		default: {
			return true;
		}
	}
};

const nodeContains = (ancestor, descendant) => {
	while (descendant) {
		if (descendant === ancestor) {
			return true;
		}

		descendant = descendant.parent;
	}

	return false;
};

const isMatchVariableUsedOutsideLoop = (variable, whileStatement) =>
	variable.references.some(reference => !nodeContains(whileStatement, reference.identifier));

const isMatchVariableAssignedInBody = (variable, body) =>
	variable.references.some(reference => reference.isWrite() && nodeContains(body, reference.identifier));

const isDelayedScope = node =>
	isFunction(node)
	|| node.type === 'ClassBody';

const isInsideDelayedScope = (node, ancestor) => {
	while (node && node !== ancestor) {
		if (isDelayedScope(node)) {
			return true;
		}

		node = node.parent;
	}

	return false;
};

const isMatchVariableCapturedInBody = (variable, body) =>
	variable.references.some(reference => nodeContains(body, reference.identifier) && isInsideDelayedScope(reference.identifier, body));

const isRegExpVariableOnlyUsedInCondition = (variable, whileStatement) =>
	variable.references.every(reference => reference.init || nodeContains(whileStatement.test, reference.identifier));

const isRegExpVariableDeclaredInLoopScope = (variable, whileStatement) =>
	variable.defs[0]?.node.parent.parent === whileStatement.parent;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('WhileStatement', node => {
		const loopData = getLoopData(node);
		if (!loopData) {
			return;
		}

		const {matchIdentifier, regexpNode, stringNode} = loopData;
		const previousLetDeclaration = getPreviousLetDeclaration(node, matchIdentifier.name);
		const regexpVariable = getRegExpVariable(regexpNode, sourceCode);

		if (!previousLetDeclaration) {
			return;
		}

		if (!regexpVariable || !isGlobalRegExpDefinition(regexpVariable)) {
			return;
		}

		if (
			!isStaticConstStringIdentifier(stringNode, sourceCode)
			|| !isRegExpVariableDeclaredInLoopScope(regexpVariable, node)
			|| !isRegExpVariableOnlyUsedInCondition(regexpVariable, node)
		) {
			return;
		}

		const variable = findVariable(sourceCode.getScope(matchIdentifier), matchIdentifier);

		if (
			!variable
			|| isMatchVariableUsedOutsideLoop(variable, node)
			|| isMatchVariableAssignedInBody(variable, node.body)
			|| isMatchVariableCapturedInBody(variable, node.body)
		) {
			return;
		}

		const declarationRange = [
			sourceCode.getRange(previousLetDeclaration)[0],
			sourceCode.getRange(node)[0],
		];
		const closingParenthesisToken = sourceCode.getTokenBefore(node.body, token => token.value === ')');
		const headerRange = [
			sourceCode.getRange(node)[0],
			sourceCode.getRange(closingParenthesisToken)[1],
		];

		if (
			hasCommentsInRange(sourceCode, declarationRange)
			|| hasCommentsInRange(sourceCode, headerRange)
		) {
			return;
		}

		const regexpText = sourceCode.getText(regexpNode);
		const stringText = sourceCode.getText(stringNode);

		return {
			node,
			messageId: MESSAGE_ID,
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				yield fixer.removeRange(declarationRange);
				yield fixer.replaceTextRange(headerRange, `for (const ${matchIdentifier.name} of ${stringText}.matchAll(${regexpText}))`);
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
			description: 'Prefer `String#matchAll()` over `RegExp#exec()` loops.',
			recommended: 'unopinionated',
		},
		fixable: 'code',
		messages,
	},
};

export default config;
