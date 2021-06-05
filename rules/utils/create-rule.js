'use strict';
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

function createRule(importMeta, rule) {
	return {
		meta: {
			// If there is are, options add `[]` so ESLint can validate that no data is passed to the rule.
			// https://github.com/not-an-aardvark/eslint-plugin-eslint-plugin/blob/master/docs/rules/require-meta-schema.md
			schema: [],
			...rule.meta,
			docs: {
				...rule.meta.docs,
				// TODO: Use `importMeta.url` when ESLint supports ESM.
				url: getDocumentationUrl(importMeta)
			}
		},
		create: wrapCreateFunction(rule.create)
	};
}

module.exports = createRule;
