import test from 'ava';
import assertToken from '../../rules/utils/assert-token.js';

const token = {value: 'b', type: 'a', extraKeyInToken: ''};

test('Pass on matched token', t => {
	t.is(assertToken(token, {
		expected: {type: 'a', value: 'b'},
	}), undefined, 'All matched.');
	t.is(assertToken(token, {
		expected: {type: 'a'},
	}), undefined, '`type` matched.');
	t.is(assertToken(token, {
		expected: {value: 'b'},
	}), undefined, '`value` matched.');
	t.is(assertToken(token, {
		expected: 'b',
	}), undefined, 'treat string as `value`.');
	t.is(assertToken(token, {
		test: () => true,
		expected: 'x',
	}), undefined, '`test` function.');
	t.is(assertToken(token, {
		expected: ['a', 'b', 'c'],
	}), undefined, '`expected` is array.');
});

test('Throw error when not match', t => {
	t.throws(() => {
		assertToken(token, {
			expected: {type: 'a', value: 'c'},
			ruleId: 'test-rule',
		});
	}, undefined, '`value` did not match.');
	t.throws(() => {
		assertToken(token, {
			test: () => false,
			expected: token,
			ruleId: 'test-rule',
		});
	}, undefined, '`test` function return `false`.');
	t.throws(() => {
		assertToken(token, {
			expected: {nonExistingProperty: ''},
			ruleId: 'test-rule',
		});
	}, undefined, 'assert non-existing property.');
	t.throws(() => {
		assertToken(token, {
			expected: ['x', 'y', 'z'],
			ruleId: 'test-rule',
		});
	}, undefined, '`expected` is array.');
});

test('Error message', t => {
	const error = t.throws(() => {
		assertToken(token, {
			expected: ['expectedValue', {type: 'expectedType'}],
			ruleId: 'test-rule',
		});
	});

	t.true(
		error.message.includes(JSON.stringify({value: token.value, type: token.type})),
		'Should include actual token info.',
	);
	t.true(
		error.message.includes(JSON.stringify({value: 'expectedValue'})) &&
		error.message.includes(JSON.stringify({type: 'expectedType'})),
		'Should include expected token info.',
	);
	t.false(
		error.message.includes('extraKeyInToken'),
		'Should not include extra key in token.',
	);
	const correctIssueLink = 'https://github.com/sindresorhus/eslint-plugin-unicorn/issues/new?title=' +
		encodeURIComponent('`test-rule`: Unexpected token \'{"value":"b","type":"a"}\'');
	t.true(
		error.message.includes(correctIssueLink),
		'Should include issue link.',
	);

	t.snapshot(error);
});
