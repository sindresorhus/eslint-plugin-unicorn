import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const value = (() => { return getValue(); })();',
		'const value = (() => { getValue(); })();',
		'(() => value)();',
		'(async () => { await run(); })();',
		'(function * () { yield value; })();',
		'(function named() { run(); })();',
		'(function (value) { run(value); })(value);',
		'(() => { return value; })();',
		'(() => { if (condition) { return; } })();',
		'(() => { var value = 1; run(value); })();',
		'(() => { if (condition) { var value = 1; } })();',
		'(() => { eval(code); })();',
		'(() => { if (condition) { eval(code); } })();',
		'(function () { this.run(); })();',
		'(function () { arguments[0](); })();',
		'(function () { console.log(new.target); })();',
		'(function () { const run = () => this.run(); run(); })();',
		'(function () { const getArguments = () => arguments; getArguments(); })();',
		'(function () { const getNewTarget = () => new.target; getNewTarget(); })();',
		'(function () { \'use strict\'; run(); })();',
		'(() => { \'use strict\'; run(); })();',
		'(function () { run(); }).call(this);',
		'(() => { run(); })?.();',
		outdent`
			(/* comment */ () => {
				run();
			})();
		`,
		outdent`
			(() => {
				run();
			} /* comment */)();
		`,
		outdent`
			(() => {
				run();
			})() /* comment */;
		`,
		{
			code: outdent`
				(() => {
					function foo() {}
					foo();
				})();
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: outdent`
				(() => {
					if (condition) {
						function foo() {}
						foo();
					}
				})();
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
	],
	invalid: [
		outdent`
			(() => {
				const value = getValue();
				run(value);
			})();
		`,
		outdent`
			(function () {
				const value = getValue();
				run(value);
			})();
		`,
		outdent`
			if (condition) {
				(() => {
					const value = getValue();
					run(value);
				})();
			}
		`,
		outdent`
			(() => {
				// Keep this comment.
				run();
			})();
		`,
		outdent`
			(() => {
				this.run();
			})();
		`,
		outdent`
			(() => {
				function nested() {
					return value;
				}

				run(nested);
			})();
		`,
		outdent`
			(() => {
				function nested() {
					this.run();
				}

				run(nested);
			})();
		`,
		{
			code: outdent`
				(() => {
					const value = getValue() satisfies number;
					run(value);
				})();
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				(() => {
					function foo() {}
					foo();
				})();
			`,
			languageOptions: {
				sourceType: 'module',
			},
		},
	],
});
