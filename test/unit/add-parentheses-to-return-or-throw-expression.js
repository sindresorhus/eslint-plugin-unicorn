import test from 'node:test';
import {Linter} from 'eslint';
import addParenthesesToReturnOrThrowExpression from '../../rules/fix/add-parentheses-to-return-or-throw-expression.js';

const linter = new Linter();

// Report each `foo` identifier and add parentheses to the statement that contains it
const rule = {
	meta: {
		fixable: 'code',
	},
	create: context => ({
		'Identifier[name="foo"]'(node) {
			context.report({
				node,
				message: 'Add parentheses.',
				fix: fixer => addParenthesesToReturnOrThrowExpression(fixer, node.parent, context),
			});
		},
	}),
};

// Apply the fix once, `verifyAndFix()` would keep adding parentheses
const fix = code => {
	const [message] = linter.verify(code, {
		plugins: {
			test: {
				rules: {rule},
			},
		},
		rules: {'test/rule': 'error'},
	});

	if (!message.fix) {
		return code;
	}

	const {range, text} = message.fix;
	return code.slice(0, range[0]) + text + code.slice(range[1]);
};

test('adds parentheses to a `return` or `throw` argument', t => {
	t.assert.strictEqual(fix('function f() { return foo; }'), 'function f() { return ( foo); }');
	t.assert.strictEqual(fix('throw foo'), 'throw ( foo)');
});

test('does nothing for other statements', t => {
	t.assert.strictEqual(fix('foo;'), 'foo;');
});
