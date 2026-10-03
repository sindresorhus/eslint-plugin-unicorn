import test from 'node:test';
import {getStaticStringValue} from '../../rules/ast/index.js';
import {
	canTokensBeAdjacent,
	getPrecedence,
	hasUnsafeArrowConversionReference,
	isLengthOrSizeMemberExpression,
	isTypeScriptExpressionWrapper,
	matchesAnyRegExp,
	unwrapTypeScriptExpression,
} from '../../rules/utils/index.js';
import {isLengthMinusOneOf, isLengthOf} from '../../rules/utils/comparison.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

test('getStaticStringValue returns strings from static string nodes', t => {
	t.assert.strictEqual(getStaticStringValue({
		type: 'Literal',
		value: 'hello',
	}), 'hello');

	t.assert.strictEqual(getStaticStringValue({
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
	t.assert.strictEqual(getStaticStringValue({
		type: 'Literal',
		value: 1,
	}), undefined);

	t.assert.strictEqual(getStaticStringValue({
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

	t.assert.strictEqual(isTypeScriptExpressionWrapper(expression), true);
	t.assert.strictEqual(isTypeScriptExpressionWrapper(identifier), false);
	t.assert.strictEqual(unwrapTypeScriptExpression(expression), identifier);
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

	t.assert.strictEqual(isLengthOrSizeMemberExpression(createMemberExpression('length')), true);
	t.assert.strictEqual(isLengthOrSizeMemberExpression(createMemberExpression('size')), true);
	t.assert.strictEqual(isLengthOrSizeMemberExpression(createMemberExpression('width')), false);
	t.assert.strictEqual(isLengthOrSizeMemberExpression(createMemberExpression('length', {optional: true})), false);
	t.assert.strictEqual(isLengthOrSizeMemberExpression(createMemberExpression('length', {computed: true})), false);
});

test('hasUnsafeArrowConversionReference finds lexical constructs unsafe for arrow conversion', t => {
	const visitorKeys = {
		BlockStatement: ['body'],
		CallExpression: ['callee'],
		ExpressionStatement: ['expression'],
		Identifier: [],
		ThisExpression: [],
	};

	t.assert.strictEqual(hasUnsafeArrowConversionReference({
		type: 'BlockStatement',
		body: [
			{
				type: 'ExpressionStatement',
				expression: {
					type: 'ThisExpression',
				},
			},
		],
	}, visitorKeys), true);

	t.assert.strictEqual(hasUnsafeArrowConversionReference({
		type: 'CallExpression',
		callee: {
			type: 'Identifier',
			name: 'eval',
		},
	}, visitorKeys), true);

	t.assert.strictEqual(hasUnsafeArrowConversionReference({
		type: 'CallExpression',
		callee: {
			type: 'Identifier',
			name: 'safe',
		},
	}, visitorKeys), false);
});

test('getPrecedence orders operators from loosest to tightest binding', t => {
	t.assert.strictEqual(getPrecedence({type: 'SequenceExpression'}) < getPrecedence({type: 'AssignmentExpression'}), true);
	t.assert.strictEqual(getPrecedence({type: 'YieldExpression'}) < getPrecedence({type: 'ConditionalExpression'}), true);
	t.assert.strictEqual(
		getPrecedence({type: 'ConditionalExpression'})
		< getPrecedence({type: 'LogicalExpression', operator: '??'}),
		true,
	);
	t.assert.strictEqual(getPrecedence({type: 'LogicalExpression', operator: '??'}), getPrecedence({type: 'LogicalExpression', operator: '||'}));
	t.assert.strictEqual(
		getPrecedence({type: 'LogicalExpression', operator: '||'})
		< getPrecedence({type: 'LogicalExpression', operator: '&&'}),
		true,
	);
	t.assert.strictEqual(
		getPrecedence({type: 'BinaryExpression', operator: '+'})
		< getPrecedence({type: 'BinaryExpression', operator: '*'}),
		true,
	);
	t.assert.strictEqual(
		getPrecedence({type: 'BinaryExpression', operator: '<'})
		=== getPrecedence({type: 'TSAsExpression'}),
		true,
	);
	t.assert.strictEqual(getPrecedence({type: 'UnaryExpression'}) === getPrecedence({type: 'AwaitExpression'}), true);
	t.assert.strictEqual(getPrecedence({type: 'UnaryExpression'}) === getPrecedence({type: 'TSNonNullExpression'}), true);
	t.assert.strictEqual(
		getPrecedence({type: 'UpdateExpression', prefix: true})
		< getPrecedence({type: 'UpdateExpression', prefix: false}),
		true,
	);
	t.assert.strictEqual(getPrecedence({type: 'UpdateExpression', prefix: false}) < getPrecedence({type: 'CallExpression'}), true);
	t.assert.strictEqual(getPrecedence({type: 'CallExpression'}) < getPrecedence({type: 'NewExpression'}), true);
	t.assert.strictEqual(getPrecedence({type: 'NewExpression'}) < getPrecedence({type: 'Identifier'}), true);
});

test('getPrecedence pins the absolute boundaries the should-add-parentheses helpers depend on', t => {
	// The unary/await argument helpers parenthesize everything below the unary level (`< 16`).
	t.assert.strictEqual(getPrecedence({type: 'TSAsExpression'}) < 16, true);
	t.assert.strictEqual(getPrecedence({type: 'TSSatisfiesExpression'}) < 16, true);
	t.assert.strictEqual(getPrecedence({type: 'AwaitExpression'}) === 16, true);
	// These sit *at* the unary level, so `< 16` misses them and the helpers must list them explicitly.
	t.assert.strictEqual(getPrecedence({type: 'TSTypeAssertion'}) < 16, false);
	t.assert.strictEqual(getPrecedence({type: 'TSNonNullExpression'}) < 16, false);
	t.assert.strictEqual(getPrecedence({type: 'UpdateExpression', prefix: false}) < 16, false);

	// The call-callee helper parenthesizes everything below the call level (`< 18`).
	t.assert.strictEqual(getPrecedence({type: 'TSNonNullExpression'}) < 18, true);
	t.assert.strictEqual(getPrecedence({type: 'CallExpression'}) < 18, false);
	t.assert.strictEqual(getPrecedence({type: 'NewExpression'}) < 18, false);
});

test('canTokensBeAdjacent detects merges from strings and tokens', t => {
	t.assert.strictEqual(canTokensBeAdjacent('const', 'foo'), false);
	t.assert.strictEqual(canTokensBeAdjacent('foo', '123'), false);
	t.assert.strictEqual(canTokensBeAdjacent('123', '456'), false);
	t.assert.strictEqual(canTokensBeAdjacent('a +', '+ b'), false);
	t.assert.strictEqual(canTokensBeAdjacent('a -', '-b'), false);
	t.assert.strictEqual(canTokensBeAdjacent('a /', '/ comment'), false);
	t.assert.strictEqual(canTokensBeAdjacent('a /', '* comment */'), false);
	t.assert.strictEqual(canTokensBeAdjacent('/', {type: 'Line', value: ' comment'}), false);
	t.assert.strictEqual(canTokensBeAdjacent('/', {type: 'Line', value: ''}), false);
	t.assert.strictEqual(canTokensBeAdjacent('/', {type: 'Block', value: ' comment '}), false);

	t.assert.strictEqual(canTokensBeAdjacent('foo', '(bar)'), true);
	t.assert.strictEqual(canTokensBeAdjacent('foo()', '.bar'), true);
	t.assert.strictEqual(canTokensBeAdjacent('', 'foo'), true);
	t.assert.strictEqual(canTokensBeAdjacent('foo', ''), true);

	t.assert.strictEqual(canTokensBeAdjacent({type: 'Identifier', value: 'foo'}, {type: 'Identifier', value: 'bar'}), false);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Punctuator', value: ')'}, {type: 'Punctuator', value: '('}), true);

	// A numeric literal absorbing a following/preceding decimal point.
	t.assert.strictEqual(canTokensBeAdjacent('2', '.2'), false);
	t.assert.strictEqual(canTokensBeAdjacent('2', '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent('12', '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent('08', '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent('1_2', '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent('2', {type: 'Punctuator', value: '.'}), false);
	t.assert.strictEqual(canTokensBeAdjacent('2', '.#value'), false);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Numeric', value: '12'}, '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Numeric', value: '08'}, '.toString'), false);
	t.assert.strictEqual(canTokensBeAdjacent('2.', 'foo'), false);
	t.assert.strictEqual(canTokensBeAdjacent('2.', '5'), false);
	t.assert.strictEqual(canTokensBeAdjacent('of', '.2'), true);
	t.assert.strictEqual(canTokensBeAdjacent('0x2', '.toString'), true);
	t.assert.strictEqual(canTokensBeAdjacent('1e3', '.toString'), true);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Numeric', value: '0x2'}, '.toString'), true);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Numeric', value: '1e3'}, '.toString'), true);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Numeric', value: '2n'}, '.toString'), true);
	t.assert.strictEqual(canTokensBeAdjacent('foo2', '.bar'), true);
	t.assert.strictEqual(canTokensBeAdjacent('foo.', 'bar'), true);

	// A comment token always swallows whatever follows it on the same line.
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Line', value: '// foo'}, {type: 'Punctuator', value: '('}), false);
	t.assert.strictEqual(canTokensBeAdjacent({type: 'Shebang', value: '#!/usr/bin/env node'}, {type: 'Punctuator', value: '('}), false);
});

test('isLengthOf and isLengthMinusOneOf detect a `.length` access on a given object', t => {
	// Parse `object.method(argument)` and return `[argument, object]`
	const parse = code => {
		const {expression} = typescriptEslintParser.parseForESLint(code).ast.body[0];

		return [expression.arguments[0], expression.callee.object];
	};

	const isLengthOfCode = code => isLengthOf(...parse(code));
	const isLengthMinusOneOfCode = code => isLengthMinusOneOf(...parse(code));

	t.assert.strictEqual(isLengthOfCode('foo.method(foo.length)'), true);
	t.assert.strictEqual(isLengthOfCode('foo.bar.method(foo.bar.length)'), true);
	// TypeScript wrappers have no runtime effect, on either side
	t.assert.strictEqual(isLengthOfCode('foo.method((foo as string[]).length)'), true);
	t.assert.strictEqual(isLengthOfCode('foo.method(foo.length as number)'), true);
	t.assert.strictEqual(isLengthOfCode('(foo as string[]).method(foo.length)'), true);
	t.assert.strictEqual(isLengthOfCode('(foo satisfies string[]).method(foo.length)'), true);
	t.assert.strictEqual(isLengthOfCode('this.method(this.length)'), true);

	t.assert.strictEqual(isLengthOfCode('foo.method(bar.length)'), false);
	t.assert.strictEqual(isLengthOfCode('foo.method(foo.size)'), false);
	t.assert.strictEqual(isLengthOfCode('foo.method(foo?.length)'), false);
	t.assert.strictEqual(isLengthOfCode('foo.method(foo[length])'), false);
	t.assert.strictEqual(isLengthOfCode('foo.method(foo)'), false);

	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length - 1)'), true);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method((foo.length - 1) as number)'), true);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method((foo.length as number) - 1)'), true);
	// `1.0` is the same number as `1`, `1n` is not
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length - 1.0)'), true);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length - 1n)'), false);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length - 0)'), false);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length - 2)'), false);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length + 1)'), false);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(bar.length - 1)'), false);
	t.assert.strictEqual(isLengthMinusOneOfCode('foo.method(foo.length)'), false);
});

test('matchesAnyRegExp ignores `lastIndex` but keeps the flags', t => {
	const global = /a/g;
	t.assert.strictEqual(matchesAnyRegExp('a', [global]), true);
	// eslint-disable-next-line node-test/no-duplicate-assertions -- The second call proves `lastIndex` is not carried over.
	t.assert.strictEqual(matchesAnyRegExp('a', [global]), true);
	t.assert.strictEqual(global.lastIndex, 0);

	const sticky = Object.freeze(/todo/iy);
	t.assert.strictEqual(matchesAnyRegExp('TODO', [sticky]), true);
	// eslint-disable-next-line node-test/no-duplicate-assertions -- The second call proves `lastIndex` is not carried over.
	t.assert.strictEqual(matchesAnyRegExp('TODO', [sticky]), true);
	t.assert.strictEqual(matchesAnyRegExp('xTODO', [sticky]), false);
});
