import test from 'ava';
import rule from '../rules/prefer-exponentiation-operator';

test('deprecated', t => {
	t.true(rule.deprecated);
	t.deepEqual(rule.replacedBy, ['prefer-exponentiation-operator']);
});
