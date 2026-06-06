import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'// This is a single comment.',
		outdent`
			// This is a long comment.
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment!
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment?
			// I don't like long lines.
		`,
		outdent`
			// This comment is intentionally separate.
			// This one is separate too!
			// This one is also separate?
		`,
		outdent`
			// This is a long comment but

			// I don't like long lines.
		`,
		outdent`
			// This is a long comment but
			//
			// I don't like long lines.
		`,
		outdent`
			// ----------
			// Section
			// ----------
		`,
		outdent`
			// \`array.reduce(callback)\`
			// \`Array.prototype.reduce.call(array, callback)\`
		`,
		outdent`
			// - \`promise.then(onFulfilled, onRejected)\`
			// - \`promise.catch(onRejected)\`
		`,
		outdent`
			// https://example.com/reference
			// Only meta characters which can't be deciphered from \`String.fromCharCode()\`
		`,
		outdent`
			// {then() {}}
			// {get then() {}}
		`,
		outdent`
			// This is a long comment but
				// I don't like long lines.
		`,
		outdent`
			console.log("unicorn"); // This is a long comment but
			// I don't like long lines.
		`,
		outdent`
			// This is a long comment but
			console.log("unicorn"); // I don't like long lines.
		`,
		outdent`
			// This is a local explanation but
			// it is attached to the statement below
			console.log("unicorn");
		`,
		outdent`
			console.log("unicorn");
			// This is a local explanation but
			// it is attached to the statement above
		`,
		outdent`
			/* This is a long comment but
			I don't like long lines. */
		`,
		outdent`
			#!/usr/bin/env node
			// This is a single comment.
		`,
		outdent`
			/// <reference types="node" />
			/// <reference types="mocha" />
		`,
		outdent`
			// Type checked JavaScript
			// @ts-check
			const value = 1;
		`,
		outdent`
			// Coverage setup
			// c8 ignore next
			const value = 1;
		`,
		outdent`
			// Formatting setup
			// prettier-ignore
			const value = 1;
		`,
		outdent`
			// eslint-disable-next-line no-console
			// This is a single comment
			console.log("unicorn");
		`,
		outdent`
			// This is a single comment
			// eslint-disable-next-line no-console
			console.log("unicorn");
		`,
		outdent`
			// Environment setup
			// eslint-env node
			console.log(process);
		`,
		outdent`
			// Rule setup
			// eslint no-console: off
			console.log("unicorn");
		`,
		outdent`
			// Global setup
			// global process
			console.log(process);
		`,
		outdent`
			// Export setup
			// exported value
			const value = 1;
		`,
		outdent`
			switch (value) {
				case 1:
					break;
				// Switch setup
				// no default
			}
		`,
	],
	invalid: [
		outdent`
			// This is a long comment but
			// I don't like long lines
		`,
		outdent`
			// This is a long comment but
			// I don't like long lines and
			// I still don't want to use long lines
		`,
		outdent`
			if (unicorn) {

				// This is a long comment but
				// I don't like long lines

			}
		`,
		outdent`
			// First sentence.
			// This is wrapped but
			// continued
		`,
		outdent`
			// Global state is initialized but
			// the next step runs later
		`,
		outdent`
			//This is a long comment but
			//   spacing should be normalized
		`,
		outdent`
			// This is a long comment but
			// it ends here.
			// This is intentionally separate.
		`,
		outdent`
			// This is a long comment but
			// I don't like long lines

			// This is another long comment but
			// I still don't like long lines
		`,
	],
});
