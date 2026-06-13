import {getStaticValue} from '@eslint-community/eslint-utils';
import helperValidatorIdentifier from '@babel/helper-validator-identifier';
import {isMethodCall} from './ast/index.js';
import {
	getIndentString,
	getNextNode,
	getPreviousNode,
	isSameReference,
} from './utils/index.js';

const {isIdentifierName} = helperValidatorIdentifier;

const MESSAGE_ID = 'prefer-object-define-properties';
const messages = {
	[MESSAGE_ID]: 'Prefer `Object.defineProperties()` over multiple `Object.defineProperty()` calls.',
};

const isDefinePropertyCall = node =>
	isMethodCall(node, {
		object: 'Object',
		method: 'defineProperty',
		argumentsLength: 3,
		optionalCall: false,
		optionalMember: false,
		computed: false,
	});

function getDefinePropertyCall(expressionStatement) {
	if (expressionStatement?.type !== 'ExpressionStatement') {
		return;
	}

	const {expression} = expressionStatement;
	if (!isDefinePropertyCall(expression)) {
		return;
	}

	return expression;
}

function getStaticPropertyKey(node, sourceCode) {
	const staticValue = getStaticValue(node, sourceCode.getScope(node));

	if (!staticValue) {
		return;
	}

	return typeof staticValue.value === 'symbol' ? staticValue.value : String(staticValue.value);
}

function getPropertyKeyText(node, sourceCode) {
	const nodeText = sourceCode.getText(node);

	if (node.type === 'Literal') {
		if (typeof node.value === 'string') {
			if (node.value === '__proto__') {
				return `[${nodeText}]`;
			}

			return isIdentifierName(node.value) ? node.value : nodeText;
		}

		if (typeof node.value === 'number') {
			return nodeText;
		}
	}

	return `[${nodeText}]`;
}

function hasDuplicatePropertyKeys(calls, sourceCode) {
	const staticKeys = new Set();
	const dynamicKeys = [];

	for (const call of calls) {
		const keyNode = call.arguments[1];
		const key = getStaticPropertyKey(keyNode, sourceCode);
		if (key === undefined) {
			if (dynamicKeys.some(dynamicKey => isSameReference(dynamicKey, keyNode))) {
				return true;
			}

			dynamicKeys.push(keyNode);
			continue;
		}

		if (staticKeys.has(key)) {
			return true;
		}

		staticKeys.add(key);
	}

	return false;
}

function hasCommentsInRange(sourceCode, range) {
	return sourceCode.getAllComments().some(comment => {
		const [start, end] = sourceCode.getRange(comment);

		return start >= range[0] && end <= range[1];
	});
}

function getDefinePropertiesFix(expressionStatements, calls, context) {
	const {sourceCode} = context;
	const firstExpressionStatement = expressionStatements[0];
	const lastExpressionStatement = expressionStatements.at(-1);
	const indent = getIndentString(firstExpressionStatement, context);
	const propertyIndent = `${indent}\t`;
	const targetText = sourceCode.getText(calls[0].arguments[0]);
	const propertiesText = calls.map(call => {
		const propertyKeyText = getPropertyKeyText(call.arguments[1], sourceCode);
		const descriptorText = sourceCode.getText(call.arguments[2]).replaceAll('\n', '\n\t');

		return `${propertyIndent}${propertyKeyText}: ${descriptorText},`;
	}).join('\n');

	return fixer => fixer.replaceTextRange(
		[
			sourceCode.getRange(firstExpressionStatement)[0],
			sourceCode.getRange(lastExpressionStatement)[1],
		],
		`Object.defineProperties(${targetText}, {\n${propertiesText}\n${indent}});`,
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	context.on('ExpressionStatement', expressionStatement => {
		const firstCall = getDefinePropertyCall(expressionStatement);
		if (!firstCall) {
			return;
		}

		const previousCall = getDefinePropertyCall(getPreviousNode(expressionStatement, context));
		if (
			previousCall
			&& isSameReference(previousCall.arguments[0], firstCall.arguments[0])
		) {
			return;
		}

		const expressionStatements = [expressionStatement];
		const calls = [firstCall];

		let nextExpressionStatement = getNextNode(expressionStatement, context);
		while (true) {
			const nextCall = getDefinePropertyCall(nextExpressionStatement);

			if (
				!nextCall
				|| !isSameReference(firstCall.arguments[0], nextCall.arguments[0])
			) {
				break;
			}

			expressionStatements.push(nextExpressionStatement);
			calls.push(nextCall);
			nextExpressionStatement = getNextNode(nextExpressionStatement, context);
		}

		if (calls.length < 2) {
			return;
		}

		const problem = {
			node: firstCall.callee.property,
			messageId: MESSAGE_ID,
		};

		const range = [
			sourceCode.getRange(expressionStatements[0])[0],
			sourceCode.getRange(expressionStatements.at(-1))[1],
		];

		if (
			!hasDuplicatePropertyKeys(calls, sourceCode)
			&& !hasCommentsInRange(sourceCode, range)
		) {
			problem.fix = getDefinePropertiesFix(expressionStatements, calls, context);
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
			description: 'Prefer `Object.defineProperties()` over multiple `Object.defineProperty()` calls.',
			recommended: 'unopinionated',
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
