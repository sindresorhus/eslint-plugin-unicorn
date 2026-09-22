import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

const jsonLanguages = [languages.json, languages.jsonc, languages.json5];

test.snapshot({
	valid: jsonLanguages.flatMap(language => [
		'{"userName": "bad-name", "nested": [{"otherKey": 1}]}',
		'{"userId": 1, "éclairName": 2}',
		{code: '{"PascalKey": 1, "userName": 2}', options: [{PascalCase: true}]},
		{code: '{"bad-key": 1}', options: [{ignore: ['^bad-']}]},
		{code: '{"any key": 1}', options: [{camelCase: false}]},
	].map(testCase => ({language, ...(typeof testCase === 'string' ? {code: testCase} : testCase)}))),
	invalid: jsonLanguages.flatMap(language => [
		'{"user-name": "user_name", "nested": {"OtherKey": 1}}',
		'{"user_name": 1, "": 2, "two words": 3}',
		'{"userID": 1}',
		String.raw`{"user\u002Dname": 1}`,
	].map(code => ({code, language}))),
});

const caseTests = [
	['camelCase', 'userName', 'user_name'],
	['PascalCase', 'UserName', 'userName'],
	['SCREAMING_SNAKE_CASE', 'USER_NAME', 'user_name'],
	['kebab-case', 'user-name', 'User-Name'],
	['snake_case', 'user_name', 'user-name'],
];

test.snapshot({
	valid: caseTests.map(([caseName, validName]) => ({code: JSON.stringify({[validName]: 1}), language: languages.json, options: [{camelCase: false, [caseName]: true}]})),
	invalid: caseTests.map(([caseName, , invalidName]) => ({code: JSON.stringify({[invalidName]: 1}), language: languages.json, options: [{camelCase: false, [caseName]: true}]})),
});

test.snapshot({
	valid: [
		{code: '{userName: 1}', language: languages.json5},
		{code: 'userName: bad-name\n123: value\ntrue: value\n? [bad-key, OtherKey]\n: value', language: languages.yaml},
		{code: 'defaults: &defaults {userName: 1}\nconfig: {<<: *defaults, otherKey: 2}', language: languages.yaml},
		{code: 'userName = "bad-name"\n[nested.otherKey]\nvalue = {innerKey = 1}', language: languages.toml},
		{code: '[nested."other.key"]\nvalue = 1', language: languages.toml, options: [{ignore: [String.raw`\.`]}]},
	],
	invalid: [
		{code: '{user_name: 1}', language: languages.json5},
		{code: String.raw`{user\u005fname: 1}`, language: languages.json5},
		{code: 'user-name: 1\nnested: {OtherKey: 2}\n"user\\u005Fname": 3', language: languages.yaml},
		{code: '"<<": value', language: languages.yaml},
		{code: 'user-name = 1\n[nested.OtherKey]\n"user\\u005Fname".inner-key = 2', language: languages.toml},
		{code: '[[other_key]]\nvalue = {inner-key = 1}', language: languages.toml},
		{code: '[nested."other.key"]\nvalue = 1', language: languages.toml},
	],
});
