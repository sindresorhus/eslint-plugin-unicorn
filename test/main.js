import test from 'ava';
import pkg from '../package';
import plugin from '..';
import getDocsUrl from '../rules/utils/get-docs-url';

const VALID_TYPES = new Set(['problem', 'suggestion', 'layout']);

test('each rule should has validate meta info', t => {
	for (const [ruleId, rule] of Object.entries(plugin.rules)) {
		t.truthy(rule.meta);
		t.true(VALID_TYPES.has(rule.meta.type));
		t.truthy(rule.meta.docs);
		t.is(rule.meta.docs.url, getDocsUrl(ruleId));
	}
})
