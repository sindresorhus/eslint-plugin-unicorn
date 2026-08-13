import test from 'ava';
import {ESLint} from 'eslint';

const eslint = new ESLint({overrideConfigFile: './eslint.config.js'});

const lint = async (code, filePath = 'package.json') => {
	const [result] = await eslint.lintText(code, {filePath});
	if (result.fatalErrorCount > 0) {
		throw new Error(result.messages.map(message => message.message).join('\n'));
	}

	return result;
};

test('required project scripts are enforced', async t => {
	const result = await lint('{}');
	t.is(result.messages.filter(message => message.ruleId === 'internal-package-json/require-scripts').length, 0);
	t.is(result.errorCount, 0);

	const emptyScriptsResult = await lint('{"scripts":{}}');
	t.deepEqual(
		emptyScriptsResult.messages
			.filter(message => message.ruleId === 'internal-package-json/require-scripts')
			.map(message => message.message),
		['The `lint` script is required.', 'The `test` script is required.'],
	);
	t.is(emptyScriptsResult.errorCount, 2);

	const partialResult = await lint('{"scripts":{"lint":"eslint ."}}');
	t.deepEqual(
		partialResult.messages
			.filter(message => message.ruleId === 'internal-package-json/require-scripts')
			.map(message => message.message),
		['The `test` script is required.'],
	);
	t.is(partialResult.errorCount, 1);

	const validResult = await lint('{"scripts":{"lint":"eslint .","test":"ava"}}');
	t.is(validResult.messages.filter(message => message.ruleId === 'internal-package-json/require-scripts').length, 0);
	t.is(validResult.errorCount, 0);
});

test('package scripts are sorted', async t => {
	const result = await lint('{"scripts":{"test":"ava","lint":"eslint ."}}');
	t.is(result.messages.filter(message => message.ruleId === 'package-json/sort-scripts').length, 1);
});

test('package JSON configuration only enables the replacement rules', async t => {
	const config = await eslint.calculateConfigForFile('package.json');
	t.deepEqual(
		Object.fromEntries(Object.entries(config.rules).filter(([ruleId]) => ruleId.startsWith('package-json/'))),
		{
			'package-json/dependency-version-range': [2, {range: 'caret', dependencyTypes: ['dependencies']}],
			'package-json/no-duplicate-dependencies': [2],
			'package-json/sort-dependencies': [2, {properties: ['dependencies', 'devDependencies', 'optionalDependencies']}],
			'package-json/sort-scripts': [2],
		},
	);
});

test('duplicate package properties are rejected', async t => {
	const result = await lint('{"name":"first","name":"second"}');
	t.is(result.messages.filter(message => message.ruleId === 'json/no-duplicate-keys').length, 1);
});

test('package JSON rules apply recursively', async t => {
	const filePath = 'test/fixtures/example/package.json';
	const result = await lint('{"scripts":{"test":"ava","lint":"eslint ."}}', filePath);
	t.true(result.messages.some(message => message.ruleId === 'package-json/sort-scripts'));
	t.is(result.fatalErrorCount, 0);

	const internalResult = await lint('{"scripts":{}}', filePath);
	t.true(internalResult.messages.some(message => message.ruleId === 'internal-package-json/require-scripts'));
});

test('bundled dependencies are sorted', async t => {
	const invalidResult = await lint('{"bundledDependencies":["z","a"]}');
	t.is(invalidResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 1);
	t.is(invalidResult.errorCount, 1);

	const punctuationResult = await lint('{"bundledDependencies":["a_b","a-b"]}');
	t.is(punctuationResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 1);
	t.is(punctuationResult.errorCount, 1);

	const duplicateResult = await lint('{"bundledDependencies":["a","z"],"bundledDependencies":["z","a"]}');
	t.is(duplicateResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 1);

	const validResult = await lint('{"bundledDependencies":["a","z"]}');
	t.is(validResult.messages.filter(message => message.ruleId === 'internal-package-json/sort-bundled-dependencies').length, 0);
	t.is(validResult.errorCount, 0);
});
