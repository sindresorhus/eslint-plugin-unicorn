import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Global scope
		'this',
		// UMD module
		outdent`
			(function (root, factory) {
				if (typeof define === 'function' && define.amd) {
					define([], factory);
				} else if (typeof module === 'object' && module.exports) {
					module.exports = factory();
				} else {
					root.MyModule = factory();
				}
			}(typeof self !== 'undefined' ? self : this, function () {
				const MyModule = {};

				return MyModule;
			}));
		`,
		// Class scope
		outdent`
			class Foo {
				constructor() {
					this.name = "foo";
				}
			}
		`,
		outdent`
			class Foo {
				alias = this.name;
			}
		`,
		outdent`
			class Foo {
				bar() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				static bar() {
					return this.name;
				}
			}
		`,
	],
	invalid: [
		outdent`
			function foo () {
				this.bar = "baz";
			}
		`,
	],
});
