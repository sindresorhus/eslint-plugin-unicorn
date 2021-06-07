'use strict';
const path = require('path');
const fs = require('fs');
const getDocumentationUrl = require('./get-documentation-url');

const isIterable = object => typeof object[Symbol.iterator] === 'function';

function reportProblems(listener, context) {
	// Listener arguments can be `codePath, node` or `node`
	return function (...listenerArguments) {
		let problems = listener(...listenerArguments);

		if (!problems) {
			return;
		}

		if (!isIterable(problems)) {
			problems = [problems];
		}

		// TODO: Allow `fix` function to abort
		for (const problem of problems) {
			context.report(problem);
		}
	};
}

function wrapCreateFunction(create) {
	return function (context) {
		const listeners = create(context);

		return Object.fromEntries(
			Object.entries(listeners)
				.map(([selector, listener]) => [selector, reportProblems(listener, context)])
		);
	};
}

function loadRule(ruleId) {
	const rule = require(`../${ruleId}`);

	return {
		meta: {
			// If there is are, options add `[]` so ESLint can validate that no data is passed to the rule.
			// https://github.com/not-an-aardvark/eslint-plugin-eslint-plugin/blob/master/docs/rules/require-meta-schema.md
			schema: [],
			...rule.meta,
			docs: {
				...rule.meta.docs,
				url: getDocumentationUrl(ruleId)
			}
		},
		create: wrapCreateFunction(rule.create)
	};
}

function loadRules() {
	const files = fs.readdirSync('./rules', {withFileTypes: true}).filter(file => file.isFile());
	return Object.fromEntries(files.map(file => {
		const ruleId = path.basename(file.name, '.js');
		return [ruleId, loadRule(ruleId)];
	}));
}

module.exports = {loadRule, loadRules};