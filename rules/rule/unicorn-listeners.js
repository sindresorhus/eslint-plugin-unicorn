import toEslintListener from './to-eslint-listener.js';

/**
@import {EslintListers, ListenerType, Listener} from './to-eslint-create.js'
*/

class UnicornListeners {
	#context;
	#listeners = new Map();

	constructor(context) {
		this.#context = context;
	}

	#addEventListener(selectors, listener) {
		const listeners = this.#listeners;
		for (const selector of selectors) {
			if (listeners.has(selector)) {
				listeners.get(selector).push(listener);
			} else {
				listeners.set(selector, [listener]);
			}
		}
	}

	/**
	@param {ListenerType | ListenerType[]} selectorOrSelectors
	@param {Listener} listener
	*/
	on(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors, listener);
	}

	/**
	@param {ListenerType | ListenerType[]} selectorOrSelectors
	@param {Listener} listener
	*/
	onExit(selectorOrSelectors, listener) {
		const selectors = Array.isArray(selectorOrSelectors) ? selectorOrSelectors : [selectorOrSelectors];
		this.#addEventListener(selectors.map(selector => `${selector}:exit`), listener);
	}

	/**
	@returns {EslintListers}
	*/
	toEslintListeners() {
		const eslintListeners = {};

		for (const [selector, listeners] of this.#listeners) {
			eslintListeners[selector] = toEslintListener(
				this.#context,
				function * (...listenerArguments) {
					for (const listener of listeners) {
						yield listener(...listenerArguments);
					}
				},
			);
		}

		return eslintListeners;
	}
}

export default UnicornListeners;
