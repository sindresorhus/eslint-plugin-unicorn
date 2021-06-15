'use strict';
const {findVariable} = require('eslint-utils');
const avoidCapture = require('./utils/avoid-capture.js');
const renameVariable = require('./utils/rename-variable.js');
const {matches, methodCallSelector} = require('./selectors/index.js');

const MESSAGE_ID = 'catch-error-name';
const messages = {
	[MESSAGE_ID]: 'The catch parameter `{{originalName}}` should be named `{{fixedName}}`.'
};

const selector = matches([
	// `try {} catch (foo) {}`
	[
		'CatchClause',
		' > ',
		'Identifier.param'
	].join(''),
	// - `promise.then(…, foo => {})`
	// - `promise.then(…, function(foo) {})`
	// - `promise.catch(foo => {})`
	// - `promise.catch(function(foo) {})`
	[
		matches([
			methodCallSelector({name: 'then', length: 2}),
			methodCallSelector({name: 'catch', length: 1})
		]),
		' > ',
		':matches(FunctionExpression, ArrowFunctionExpression).arguments:last-child',
		' > ',
		'Identifier.params:first-child'
	].join('')
]);

const create = context => {
	const {ecmaVersion} = context.parserOptions;

	const options = {
		name: 'error',
		ignore: [],
		...context.options[0]
	};
	const {name: expectedName} = options;
	const ignore = options.ignore.map(
		pattern => pattern instanceof RegExp ? pattern : new RegExp(pattern, 'u')
	);
	const isNameAllowed = name =>
		name === expectedName ||
		ignore.some(regexp => regexp.test(name)) ||
		name.endsWith(expectedName) ||
		name.endsWith(expectedName.charAt(0).toUpperCase() + expectedName.slice(1));

	return {
		[selector]: node => {
			const originalName = node.name;

			if (
				isNameAllowed(originalName) ||
				isNameAllowed(originalName.replace(/_+$/g, ''))
			) {
				return;
			}

			const scope = context.getScope();
			const variable = findVariable(scope, node);

			// This was reported https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1075#issuecomment-768072967
			// But can't reproduce, just ignore this case
			/* istanbul ignore next */
			if (!variable) {
				return;
			}

			if (originalName === '_' && variable.references.length === 0) {
				return;
			}

			const scopes = [
				variable.scope,
				...variable.references.map(({from}) => from)
			];
			const fixedName = avoidCapture(expectedName, scopes, ecmaVersion);

			return {
				node,
				messageId: MESSAGE_ID,
				data: {
					originalName,
					fixedName
				},
				fix: fixer => renameVariable(variable, fixedName, fixer)
			};
		}
	};
};

const schema = [
	{
		type: 'object',
		properties: {
			name: {
				type: 'string'
			},
			ignore: {
				type: 'array',
				uniqueItems: true
			}
		}
	}
];

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce a specific parameter name in catch clauses.'
		},
		fixable: 'code',
		schema,
		messages
	}
};
