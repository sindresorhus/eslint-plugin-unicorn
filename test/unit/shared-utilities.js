import test from 'ava';
import {getStaticStringValue} from '../../rules/ast/index.js';
import {
	canTokensBeAdjacent,
	getPrecedence,
	hasUnsafeArrowConversionReference,
	isLengthOrSizeMemberExpression,
	isTypeScriptExpressionWrapper,
	unwrapTypeScriptExpression,
} from '../../rules/utils/index.js';
import {isLengthMinusOneOf, isLengthOf} from '../../rules/utils/comparison.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

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

test('isLengthOrSizeMemberExpression detects non-optional dot length and size access', t => {
	const createMemberExpression = (property, options = {}) => ({
		type: 'MemberExpression',
		object: {
			type: 'Identifier',
			name: 'value',
		},
		property: {
			type: 'Identifier',
			name: property,
		},
		optional: false,
		computed: false,
		...options,
	});

	t.true(isLengthOrSizeMemberExpression(createMemberExpression('length')));
	t.true(isLengthOrSizeMemberExpression(createMemberExpression('size')));
	t.false(isLengthOrSizeMemberExpression(createMemberExpression('width')));
	t.false(isLengthOrSizeMemberExpression(createMemberExpression('length', {optional: true})));
	t.false(isLengthOrSizeMemberExpression(createMemberExpression('length', {computed: true})));
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

test('getPrecedence orders operators from loosest to tightest binding', t => {
	t.true(getPrecedence({type: 'SequenceExpression'}) < getPrecedence({type: 'AssignmentExpression'}));
	t.true(getPrecedence({type: 'YieldExpression'}) < getPrecedence({type: 'ConditionalExpression'}));
	t.true(
		getPrecedence({type: 'ConditionalExpression'})
		< getPrecedence({type: 'LogicalExpression', operator: '??'}),
	);
	t.is(getPrecedence({type: 'LogicalExpression', operator: '??'}), getPrecedence({type: 'LogicalExpression', operator: '||'}));
	t.true(
		getPrecedence({type: 'LogicalExpression', operator: '||'})
		< getPrecedence({type: 'LogicalExpression', operator: '&&'}),
	);
	t.true(
		getPrecedence({type: 'BinaryExpression', operator: '+'})
		< getPrecedence({type: 'BinaryExpression', operator: '*'}),
	);
	t.true(
		getPrecedence({type: 'BinaryExpression', operator: '<'})
		=== getPrecedence({type: 'TSAsExpression'}),
	);
	t.true(getPrecedence({type: 'UnaryExpression'}) === getPrecedence({type: 'AwaitExpression'}));
	t.true(getPrecedence({type: 'UnaryExpression'}) === getPrecedence({type: 'TSNonNullExpression'}));
	t.true(
		getPrecedence({type: 'UpdateExpression', prefix: true})
		< getPrecedence({type: 'UpdateExpression', prefix: false}),
	);
	t.true(getPrecedence({type: 'UpdateExpression', prefix: false}) < getPrecedence({type: 'CallExpression'}));
	t.true(getPrecedence({type: 'CallExpression'}) < getPrecedence({type: 'NewExpression'}));
	t.true(getPrecedence({type: 'NewExpression'}) < getPrecedence({type: 'Identifier'}));
});

test('getPrecedence pins the absolute boundaries the should-add-parentheses helpers depend on', t => {
	// The unary/await argument helpers parenthesize everything below the unary level (`< 16`).
	t.true(getPrecedence({type: 'TSAsExpression'}) < 16);
	t.true(getPrecedence({type: 'TSSatisfiesExpression'}) < 16);
	t.true(getPrecedence({type: 'AwaitExpression'}) === 16);
	// These sit *at* the unary level, so `< 16` misses them and the helpers must list them explicitly.
	t.false(getPrecedence({type: 'TSTypeAssertion'}) < 16);
	t.false(getPrecedence({type: 'TSNonNullExpression'}) < 16);
	t.false(getPrecedence({type: 'UpdateExpression', prefix: false}) < 16);

	// The call-callee helper parenthesizes everything below the call level (`< 18`).
	t.true(getPrecedence({type: 'TSNonNullExpression'}) < 18);
	t.false(getPrecedence({type: 'CallExpression'}) < 18);
	t.false(getPrecedence({type: 'NewExpression'}) < 18);
});

test('canTokensBeAdjacent detects merges from strings and tokens', t => {
	t.false(canTokensBeAdjacent('const', 'foo'));
	t.false(canTokensBeAdjacent('foo', '123'));
	t.false(canTokensBeAdjacent('123', '456'));
	t.false(canTokensBeAdjacent('a +', '+ b'));
	t.false(canTokensBeAdjacent('a -', '-b'));
	t.false(canTokensBeAdjacent('a /', '/ comment'));
	t.false(canTokensBeAdjacent('a /', '* comment */'));
	t.false(canTokensBeAdjacent('/', {type: 'Line', value: ' comment'}));
	t.false(canTokensBeAdjacent('/', {type: 'Line', value: ''}));
	t.false(canTokensBeAdjacent('/', {type: 'Block', value: ' comment '}));

	t.true(canTokensBeAdjacent('foo', '(bar)'));
	t.true(canTokensBeAdjacent('foo()', '.bar'));
	t.true(canTokensBeAdjacent('', 'foo'));
	t.true(canTokensBeAdjacent('foo', ''));

	t.false(canTokensBeAdjacent({type: 'Identifier', value: 'foo'}, {type: 'Identifier', value: 'bar'}));
	t.true(canTokensBeAdjacent({type: 'Punctuator', value: ')'}, {type: 'Punctuator', value: '('}));

	// A numeric literal absorbing a following/preceding decimal point.
	t.false(canTokensBeAdjacent('2', '.2'));
	t.false(canTokensBeAdjacent('2', '.toString'));
	t.false(canTokensBeAdjacent('12', '.toString'));
	t.false(canTokensBeAdjacent('08', '.toString'));
	t.false(canTokensBeAdjacent('1_2', '.toString'));
	t.false(canTokensBeAdjacent('2', {type: 'Punctuator', value: '.'}));
	t.false(canTokensBeAdjacent('2', '.#value'));
	t.false(canTokensBeAdjacent({type: 'Numeric', value: '12'}, '.toString'));
	t.false(canTokensBeAdjacent({type: 'Numeric', value: '08'}, '.toString'));
	t.false(canTokensBeAdjacent('2.', 'foo'));
	t.false(canTokensBeAdjacent('2.', '5'));
	t.true(canTokensBeAdjacent('of', '.2'));
	t.true(canTokensBeAdjacent('0x2', '.toString'));
	t.true(canTokensBeAdjacent('1e3', '.toString'));
	t.true(canTokensBeAdjacent({type: 'Numeric', value: '0x2'}, '.toString'));
	t.true(canTokensBeAdjacent({type: 'Numeric', value: '1e3'}, '.toString'));
	t.true(canTokensBeAdjacent({type: 'Numeric', value: '2n'}, '.toString'));
	t.true(canTokensBeAdjacent('foo2', '.bar'));
	t.true(canTokensBeAdjacent('foo.', 'bar'));

	// A comment token always swallows whatever follows it on the same line.
	t.false(canTokensBeAdjacent({type: 'Line', value: '// foo'}, {type: 'Punctuator', value: '('}));
	t.false(canTokensBeAdjacent({type: 'Shebang', value: '#!/usr/bin/env node'}, {type: 'Punctuator', value: '('}));
});

test('isLengthOf and isLengthMinusOneOf detect a `.length` access on a given object', t => {
	// Parse `object.method(argument)` and return `[argument, object]`
	const parse = code => {
		const {expression} = typescriptEslintParser.parseForESLint(code).ast.body[0];

		return [expression.arguments[0], expression.callee.object];
	};

	const isLengthOfCode = code => isLengthOf(...parse(code));
	const isLengthMinusOneOfCode = code => isLengthMinusOneOf(...parse(code));

	t.true(isLengthOfCode('foo.method(foo.length)'));
	t.true(isLengthOfCode('foo.bar.method(foo.bar.length)'));
	// TypeScript wrappers have no runtime effect, on either side
	t.true(isLengthOfCode('foo.method((foo as string[]).length)'));
	t.true(isLengthOfCode('foo.method(foo.length as number)'));
	t.true(isLengthOfCode('(foo as string[]).method(foo.length)'));
	t.true(isLengthOfCode('(foo satisfies string[]).method(foo.length)'));
	t.true(isLengthOfCode('this.method(this.length)'));

	t.false(isLengthOfCode('foo.method(bar.length)'));
	t.false(isLengthOfCode('foo.method(foo.size)'));
	t.false(isLengthOfCode('foo.method(foo?.length)'));
	t.false(isLengthOfCode('foo.method(foo[length])'));
	t.false(isLengthOfCode('foo.method(foo)'));

	t.true(isLengthMinusOneOfCode('foo.method(foo.length - 1)'));
	t.true(isLengthMinusOneOfCode('foo.method((foo.length - 1) as number)'));
	t.true(isLengthMinusOneOfCode('foo.method((foo.length as number) - 1)'));
	// `1.0` is the same number as `1`, `1n` is not
	t.true(isLengthMinusOneOfCode('foo.method(foo.length - 1.0)'));
	t.false(isLengthMinusOneOfCode('foo.method(foo.length - 1n)'));
	t.false(isLengthMinusOneOfCode('foo.method(foo.length - 0)'));
	t.false(isLengthMinusOneOfCode('foo.method(foo.length - 2)'));
	t.false(isLengthMinusOneOfCode('foo.method(foo.length + 1)'));
	t.false(isLengthMinusOneOfCode('foo.method(bar.length - 1)'));
	t.false(isLengthMinusOneOfCode('foo.method(foo.length)'));
});
