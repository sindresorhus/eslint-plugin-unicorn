import test from 'ava';
import {getStaticStringValue} from '../../rules/ast/index.js';
import {hasUnsafeArrowConversionReference, isTypeScriptExpressionWrapper, unwrapTypeScriptExpression} from '../../rules/utils/index.js';

test('getStaticStringValue returns strings from static string nodes', t => {
	t.is(getStaticStringValue({
		type: 'Literal',
		value: 'hello',
	}), 'hello');

	t.is(getStaticStringValue({
		type: 'TemplateLiteral',
		expressions: [],
		quasis: [
			{
				value: {
					cooked: 'hello',
				},
			},
		],
	}), 'hello');
});

test('getStaticStringValue ignores non-static string nodes', t => {
	t.is(getStaticStringValue({
		type: 'Literal',
		value: 1,
	}), undefined);

	t.is(getStaticStringValue({
		type: 'TemplateLiteral',
		expressions: [
			{
				type: 'Identifier',
				name: 'value',
			},
		],
		quasis: [],
	}), undefined);
});

test('unwrapTypeScriptExpression unwraps TypeScript expression wrappers', t => {
	const identifier = {
		type: 'Identifier',
		name: 'value',
	};
	const expression = {
		type: 'TSAsExpression',
		expression: {
			type: 'TSSatisfiesExpression',
			expression: {
				type: 'TSNonNullExpression',
				expression: {
					type: 'TSTypeAssertion',
					expression: identifier,
				},
			},
		},
	};

	t.true(isTypeScriptExpressionWrapper(expression));
	t.false(isTypeScriptExpressionWrapper(identifier));
	t.is(unwrapTypeScriptExpression(expression), identifier);
});

test('hasUnsafeArrowConversionReference finds lexical constructs unsafe for arrow conversion', t => {
	const visitorKeys = {
		BlockStatement: ['body'],
		CallExpression: ['callee'],
		ExpressionStatement: ['expression'],
		Identifier: [],
		ThisExpression: [],
	};

	t.true(hasUnsafeArrowConversionReference({
		type: 'BlockStatement',
		body: [
			{
				type: 'ExpressionStatement',
				expression: {
					type: 'ThisExpression',
				},
			},
		],
	}, visitorKeys));

	t.true(hasUnsafeArrowConversionReference({
		type: 'CallExpression',
		callee: {
			type: 'Identifier',
			name: 'eval',
		},
	}, visitorKeys));

	t.false(hasUnsafeArrowConversionReference({
		type: 'CallExpression',
		callee: {
			type: 'Identifier',
			name: 'safe',
		},
	}, visitorKeys));
});
