'use strict';
const eslintrc = require('@eslint/eslintrc');
const {environments} = eslintrc.Legacy;

const globals = Object.fromEntries(
	['builtin', 'es2024', 'node', 'browser']
		.flatMap(environment => Object.entries(environments.get(environment).globals))
);

module.exports = {
	languageOptions: {
		globals,
	},
};
