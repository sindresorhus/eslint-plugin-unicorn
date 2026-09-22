/* eslint camelcase: ['error', {allow: ['snake_case']}] */
import {
	camelCase,
	pascalCase,
	constantCase,
	kebabCase,
	snakeCase,
} from 'change-case';
import onDataKey from './shared/data-keys.js';

const MESSAGE_ID = 'key-name-casing';
const messages = {
	[MESSAGE_ID]: 'Key `{{name}}` must be in {{cases}}.',
};

const cases = {
	camelCase,
	PascalCase: pascalCase,
	SCREAMING_SNAKE_CASE: constantCase,
	'kebab-case': kebabCase,
	snake_case: snakeCase,
};

/**
@param {import('eslint').Rule.RuleContext} context
*/
const create = context => {
	const options = context.options[0];
	const chosenCases = Object.keys(cases).filter(name => options[name]);
	if (chosenCases.length === 0) {
		return;
	}

	const ignorePatterns = options.ignore.map(pattern => new RegExp(pattern, 'u'));
	const listFormatter = new Intl.ListFormat('en-US', {type: 'disjunction'});
	const caseDescription = listFormatter.format(chosenCases.map(name => `\`${name}\``));
	onDataKey(context, ({node, name}) => {
		if (
			ignorePatterns.some(pattern => pattern.test(name))
			|| (name !== '' && chosenCases.some(caseName => cases[caseName](name) === name))
		) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				name,
				cases: caseDescription,
			},
		};
	});
};

const schema = [{
	type: 'object',
	additionalProperties: false,
	properties: {
		...Object.fromEntries(Object.keys(cases).map(name => [name, {
			type: 'boolean',
			description: `Whether to allow ${name} keys.`,
		}])),
		ignore: {
			type: 'array',
			items: {type: 'string'},
			uniqueItems: true,
			description: 'Regular expression patterns for keys to ignore.',
		},
	},
}];

/**
@type {import('eslint').Rule.RuleModule}
*/
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a case style for data keys.',
			recommended: false,
		},
		schema,
		defaultOptions: [{
			camelCase: true,
			PascalCase: false,
			SCREAMING_SNAKE_CASE: false,
			'kebab-case': false,
			snake_case: false,
			ignore: [],
		}],
		messages,
		languages: [
			'json/json',
			'json/jsonc',
			'json/json5',
			'yml/yaml',
			'toml/toml',
		],
	},
};

export default config;
