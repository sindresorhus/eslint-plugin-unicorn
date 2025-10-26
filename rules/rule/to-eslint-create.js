import assert from 'node:assert/strict';
import createUnicornContext from './unicorn-context.js';
import UnicornListeners from './unicorn-listeners.js';

/**
@import * as ESLint from 'eslint';
@import {UnicornContext} from './unicorn-context.js';
@import {EslintListers, ListenerType, EslintListener} from './to-eslint-listener.js'
*/

/**
@typedef {ESLint.Rule.RuleModule['create']} EslintCreate
@typedef {(context: UnicornContext) => void} UnicornCreate
*/

// `checkVueTemplate` function will wrap `create` function, there is no need to wrap twice
const wrappedFunctions = new Set();
const markFunctionWrapped = create => {
	wrappedFunctions.add(create);
	return create;
};

/**
Convert Unicorn style of `create` to ESLint style

@param {UnicornCreate} unicornCreate
@returns {EslintCreate}
*/
function toEslintCreate(unicornCreate) {
	if (wrappedFunctions.has(unicornCreate)) {
		return unicornCreate;
	}

	return eslintContext => {
		const unicornListeners = new UnicornListeners(eslintContext);
		const unicornContext = createUnicornContext(eslintContext, unicornListeners);

		const result = unicornCreate(unicornContext);

		assert.equal(result, undefined, 'Rule `create` function should return `undefined`, please use `context.on()` instead of return listeners.');

		const eslintListeners = unicornListeners.toEslintListeners();

		return eslintListeners;
	};
}

export default toEslintCreate;
export {markFunctionWrapped};
