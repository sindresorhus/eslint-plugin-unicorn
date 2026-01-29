/**
@import * as ESLint from 'eslint';
@import {UnicornListeners, ListenerType, Listener} from './to-eslint-create.js'
*/

/**
@typedef {(type: ListenerType | ListenerType[], listener: Listener) => ReturnType<Listener>} UnicornRuleListen
@typedef {ESLint.Rule.RuleContext & {
	on: UnicornRuleListen
	onExit: UnicornRuleListen
}} UnicornContext
*/

/**
Create a better `Context` object with `on` and `onExit` method to add listeners

@param {ESLint.Rule.RuleContext} eslintContext
@param {UnicornListeners} listeners
@returns {UnicornContext}
*/
function createUnicornContext(eslintContext, listeners) {
	/** @type {UnicornContext} */
	const context = new Proxy(eslintContext, {
		get(target, property, receiver) {
			if (property === 'on' || property === 'onExit') {
				return listeners[property].bind(listeners);
			}

			return Reflect.get(target, property, receiver);
		},
	});

	return context;
}

export default createUnicornContext;
