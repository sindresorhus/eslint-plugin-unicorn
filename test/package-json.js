import test from 'ava';
import {ESLint} from 'eslint';

const eslint = new ESLint({overrideConfigFile: './eslint.config.js'});
const ignoredFixturePaths = [
	'test/fixtures/no-unnecessary-polyfills/issue-2270-node-18-range/package.json',
	'test/fixtures/no-unnecessary-polyfills/issue-2270-node-22/package.json',
	'test/fixtures/no-unnecessary-polyfills/package-json-sectioned-browserslist/package.json',
];

const lint = async code => {
	const [result] = await eslint.lintText(code, {filePath: 'package.json'});
	return result;
};

test('required project scripts are enforced', async t => {
	const result = await lint('{}');
	t.is(result.messages.filter(message => message.ruleId === 'internal-package-json/require-scripts').length, 0);

	const emptyScriptsResult = await lint('{"scripts":{}}');
	t.deepEqual(
		emptyScriptsResult.messages
			.filter(message => message.ruleId === 'internal-package-json/require-scripts')
			.map(message => message.message),
		['The `lint` script is required.', 'The `test` script is required.'],
	);

	const partialResult = await lint('{"scripts":{"lint":"eslint ."}}');
	t.deepEqual(
		partialResult.messages
			.filter(message => message.ruleId === 'internal-package-json/require-scripts')
			.map(message => message.message),
		['The `test` script is required.'],
	);
});

test('package scripts are sorted', async t => {
	const result = await lint('{"scripts":{"test":"ava","lint":"eslint ."}}');
	t.is(result.messages.filter(message => message.ruleId === 'package-json/sort-scripts').length, 1);
});

test('duplicate package properties are rejected', async t => {
	const result = await lint('{"name":"first","name":"second"}');
	t.is(result.messages.filter(message => message.ruleId === 'json/no-duplicate-keys').length, 1);
});

test('package JSON rules apply recursively', async t => {
	const [result] = await eslint.lintText('{"scripts":{}}', {filePath: 'test/fixtures/example/package.json'});
	t.true(result.messages.some(message => message.ruleId === 'package-json/require-fields'));
	t.true(result.messages.some(message => message.ruleId === 'internal-package-json/require-scripts'));
});

test('partial package JSON fixtures stay ignored', async t => {
	const ignored = await Promise.all(ignoredFixturePaths.map(filePath => eslint.isPathIgnored(filePath)));
	t.true(ignored.every(Boolean));

	t.false(await eslint.isPathIgnored('package.json'));
});

test('bundled dependencies are sorted', async t => {
	const invalidResult = await lint('{"bundledDependencies":["z","a"]}');
	t.is(invalidResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 1);

	const punctuationResult = await lint('{"bundledDependencies":["a_b","a-b"]}');
	t.is(punctuationResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 1);

	const validResult = await lint('{"bundledDependencies":["a","z"]}');
	t.is(validResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 0);
});
