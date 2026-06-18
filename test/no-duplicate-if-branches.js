import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			if (foo) {
				bar();
			} else {
				baz();
			}
		`,
		outdent`
			if (foo) {
				bar();
			}
		`,
		outdent`
			if (foo) {
			} else {
			}
		`,
		outdent`
			if (foo) {
				;
			} else {
				;
			}
		`,
		outdent`
			if (foo) {
				// TODO
			} else {
				// TODO
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else if (baz) {
				qux();
			} else {
				quux();
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else if (baz) {
				bar(1);
			}
		`,
		outdent`
			if (format === 'json') {
				parseJson();
			} else if (format === 'yaml') {
				parseYaml();
			} else {
				parseJson();
			}
		`,
		outdent`
			if (foo) {
				foo.bar();
			} else {
				foo['bar']();
			}
		`,
		outdent`
			class Unicorn {
				#value;

				method() {
					if (foo) {
						this.#value;
					} else {
						this.value;
					}
				}
			}
		`,
		outdent`
			if (foo) {
				a++;
				b;
			} else {
				a;
				++b;
			}
		`,
		outdent`
			if (foo) {
				if (bar) {
					baz();
				}
			} else if (qux) {
				baz();
			}
		`,
		outdent`
			function unicorn() {
				if (foo) {
					return;
				}

				if (bar) {
					return;
				}
			}
		`,
	],
	invalid: [
		outdent`
			if (isAdmin) {
				showDashboard();
				loadStats();
			} else {
				showDashboard();
				loadStats();
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else if (baz) {
				bar();
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else if (baz) {
				bar();
			} else {
				bar();
			}
		`,
		outdent`
			if (foo) {
				bar();
			} else if (baz) {
				qux();
			} else {
				qux();
			}
		`,
		outdent`
			function unicorn() {
				if (foo)
					return bar();
				else
					return bar();
			}
		`,
		outdent`
			if (foo)
				bar();
			else {
				bar();
			}
		`,
		outdent`
			if (foo) {
				// Comment does not make the branch different.
				bar();
			} else {
				bar();
			}
		`,
		outdent`
			if (foo) {
				bar(
					baz
				);
			} else {
				bar(baz);
			}
		`,
		outdent`
			function unicorn() {
				if (foo) {
					return bar();
				} else {
					return bar()
				}
			}
		`,
		outdent`
			function unicorn() {
				if (foo) {
					do {
						bar();
					} while (baz);
				} else {
					do {
						bar();
					} while (baz)
				}
			}
		`,
		{
			code: outdent`
				if (foo) {
					const bar = value as string;
					baz(bar);
				} else {
					const bar = value as string;
					baz(bar);
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				if (foo) {
					const bar = value satisfies string;
					baz(bar!);
				} else {
					const bar = value satisfies string;
					baz(bar!);
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
});
