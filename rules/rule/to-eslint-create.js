import createUnicornContext from './unicorn-context.js';
import UnicornListeners from './unicorn-listeners.js';

/**
@import * as ESLint from 'eslint';
@import {UnicornContext} from './unicorn-context.js';
@import {EslintListers, ListenerType, EslintListener} from './to-eslint-listener.js'
*/

/**
@typedef {ESLint.Rule.RuleModule['create']} EslintCreate
@typedef {(context: UnicornContext) => (EslintListers | void)} UnicornCreate
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
		const listeners = unicornCreate(unicornContext);

		if (listeners) {
			for (const [selector, listener] of Object.entries(listeners)) {
				unicornListeners.on(selector, listener);
			}
		}

		const eslintListeners = unicornListeners.toEslintListeners();

		return eslintListeners;
	};
}

export default toEslintCreate;
export {markFunctionWrapped};
