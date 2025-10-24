import createUnicornContext from './unicorn-context.js';
import UnicornListeners from './unicorn-listeners.js';

/**
@import * as ESLint from 'eslint';
@import {UnicornRuleContext} from './unicorn-context.js';
*/

/**
@typedef {keyof ESLint.Rule.RuleListener} ListenerType
@typedef {valueof ESLint.Rule.RuleListener} Listener
@typedef {ESLint.Rule.RuleModule['create']} EslintCreate
@typedef {(context: UnicornRuleContext) => ReturnType<EslintCreate> | void} UnicornCreate
@typedef {ESLint.Rule['RuleListener']} EslintListers
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
