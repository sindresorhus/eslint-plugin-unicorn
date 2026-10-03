import test from 'node:test';
import assertToken from '../../rules/utils/assert-token.js';

const token = {value: 'b', type: 'a', extraKeyInToken: ''};

test('Pass on matched token', t => {
	t.assert.strictEqual(assertToken(token, {
		expected: {type: 'a', value: 'b'},
	}), undefined, 'All matched.');
	t.assert.strictEqual(assertToken(token, {
		expected: {type: 'a'},
	}), undefined, '`type` matched.');
	t.assert.strictEqual(assertToken(token, {
		expected: {value: 'b'},
	}), undefined, '`value` matched.');
	t.assert.strictEqual(assertToken(token, {
		expected: 'b',
	}), undefined, 'treat string as `value`.');
	t.assert.strictEqual(assertToken(token, {
		test: () => true,
		expected: 'x',
	}), undefined, '`test` function.');
	t.assert.strictEqual(assertToken(token, {
		expected: ['a', 'b', 'c'],
	}), undefined, '`expected` is array.');
});

test('Throw error when not match', t => {
	t.assert.throws(() => {
		assertToken(token, {
			expected: {type: 'a', value: 'c'},
			ruleId: 'test-rule',
		});
	}, {message: /^Expected token /u}, '`value` did not match.');
	t.assert.throws(() => {
		assertToken(token, {
			test: () => false,
			expected: token,
			ruleId: 'test-rule',
		});
	}, {message: /^Expected token /u}, '`test` function return `false`.');
	t.assert.throws(() => {
		assertToken(token, {
			expected: {nonExistingProperty: ''},
			ruleId: 'test-rule',
		});
	}, {message: /^Expected token /u}, 'assert non-existing property.');
	t.assert.throws(() => {
		assertToken(token, {
			expected: ['x', 'y', 'z'],
			ruleId: 'test-rule',
		});
	}, {message: /^Expected token /u}, '`expected` is array.');
});

test('Error message', t => {
	t.assert.throws(() => {
		assertToken(token, {
			expected: ['expectedValue', {type: 'expectedType'}],
			ruleId: 'test-rule',
		});
	}, error => {
		t.assert.strictEqual(
			error.message.includes(JSON.stringify({value: token.value, type: token.type})),
			true,
			'Should include actual token info.',
		);
		t.assert.strictEqual(
			error.message.includes(JSON.stringify({value: 'expectedValue'}))
			&& error.message.includes(JSON.stringify({type: 'expectedType'})),
			true,
			'Should include expected token info.',
		);
		t.assert.strictEqual(
			error.message.includes('extraKeyInToken'),
			false,
			'Should not include extra key in token.',
		);
		const correctIssueLink = 'https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title='
			+ encodeURIComponent('`test-rule`: Unexpected token \'{"value":"b","type":"a"}\'');
		t.assert.strictEqual(
			error.message.includes(correctIssueLink),
			true,
			'Should include issue link.',
		);
		t.assert.strictEqual(
			error.message,
			'Expected token \'{"value":"expectedValue"}\' or \'{"type":"expectedType"}\', got \'{"value":"b","type":"a"}\'.\nPlease open an issue at https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=%60test-rule%60%3A%20Unexpected%20token%20\'%7B%22value%22%3A%22b%22%2C%22type%22%3A%22a%22%7D\'.',
		);
		return true;
	});
});
