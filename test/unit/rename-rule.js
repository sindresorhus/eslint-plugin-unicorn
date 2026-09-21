import fs from 'node:fs/promises';
import test from 'ava';
import {
	renamableRules,
	renameRule,
	replaceRuleId,
	replaceRuleIdInRulesIndex,
	sortReadmeRuleRows,
} from '../../scripts/rename-rule.js';

test('single-word rules are not offered for renaming', t => {
	t.false(renamableRules.includes('indent'));
	t.true(renamableRules.includes('prefer-array-flat'));
});

test.serial('renameRule rejects unsafe names before changing files', async t => {
	const originalRename = fs.rename;
	t.teardown(() => {
		fs.rename = originalRename;
	});
	fs.rename = async () => {
		throw new Error('Attempted to rename a file.');
	};

	for (const [from, to, message] of [
		['indent', 'indent-style', 'Rules without hyphens must be renamed manually to avoid changing unrelated code.'],
		['prefer-array-flat', '123', 'Invalid rule name.'],
		['prefer-array-flat', 'foo.bar', 'Invalid rule name.'],
		['prefer-array-flat', '../foo', 'Invalid rule name.'],
		['prefer-array-flat', undefined, 'Invalid rule name.'],
	]) {
		// eslint-disable-next-line no-await-in-loop
		await t.throwsAsync(renameRule(from, to), {message});
	}
});

test('replaceRuleId only rewrites complete rule IDs', t => {
	const input = [
		'const MESSAGE_ID = \'prefer-array-flat\';',
		'\'unicorn/prefer-array-flat\'',
		'./docs/rules/prefer-array-flat.md',
		'prefer-array-flat-map',
		'no-prefer-array-flat',
	].join('\n');

	t.is(
		replaceRuleId(input, 'prefer-array-flat', 'renamed-rule'),
		[
			'const MESSAGE_ID = \'renamed-rule\';',
			'\'unicorn/renamed-rule\'',
			'./docs/rules/renamed-rule.md',
			'prefer-array-flat-map',
			'no-prefer-array-flat',
		].join('\n'),
	);
});

test('replaceRuleIdInRulesIndex only rewrites the exact export', t => {
	const input = [
		'export {default as \'prefer-array-flat-map\'} from \'./prefer-array-flat-map.js\';',
		'export {default as \'prefer-array-flat\'} from \'./prefer-array-flat.js\';',
	].join('\n');

	t.is(
		replaceRuleIdInRulesIndex(input, 'prefer-array-flat', 'renamed-rule'),
		[
			'export {default as \'prefer-array-flat-map\'} from \'./prefer-array-flat-map.js\';',
			'export {default as \'renamed-rule\'} from \'./renamed-rule.js\';',
		].join('\n'),
	);
});

for (const [from, to, input, output] of [
	['indent', 'indent-style', 'export {default as indent} from \'./indent.js\';', 'export {default as \'indent-style\'} from \'./indent-style.js\';'],
	['indent-style', 'indent', 'export {default as \'indent-style\'} from \'./indent-style.js\';', 'export {default as indent} from \'./indent.js\';'],
	['indent', 'indentation', 'export {default as indent} from \'./indent.js\';', 'export {default as indentation} from \'./indentation.js\';'],
]) {
	test(`replaceRuleIdInRulesIndex renames ${from} to ${to}`, t => {
		const unrelated = 'export {default as \'indent-other\'} from \'./indent-other.js\';';
		t.is(replaceRuleIdInRulesIndex(`${input}\n${unrelated}`, from, to), `${output}\n${unrelated}`);
	});
}

test('sortReadmeRuleRows keeps the renamed row inside the rules table', t => {
	const input = [
		'# eslint-plugin-unicorn',
		'',
		'<!-- begin auto-generated rules list -->',
		'',
		'| Name | Description |',
		'| :--- | :--- |',
		'| [alpha-rule](docs/rules/alpha-rule.md) | Alpha |',
		'| [zzz-rule](docs/rules/zzz-rule.md) | Throw |',
		'<!-- end auto-generated rules list -->',
		'',
		'## FAQ',
	].join('\n');

	t.is(
		sortReadmeRuleRows(input, 'zzz-rule'),
		[
			'# eslint-plugin-unicorn',
			'',
			'<!-- begin auto-generated rules list -->',
			'',
			'| Name | Description |',
			'| :--- | :--- |',
			'| [alpha-rule](docs/rules/alpha-rule.md) | Alpha |',
			'| [zzz-rule](docs/rules/zzz-rule.md) | Throw |',
			'<!-- end auto-generated rules list -->',
			'',
			'## FAQ',
		].join('\n'),
	);
});
