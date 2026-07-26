import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {
			projectService: {
				allowDefaultProject: ['*.ts'],
			},
		},
	},
});

test.snapshot({
	valid: [
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {}
			if (bar === 2) {}
		`,
		outdent`
			if (foo == 1) {}
			if (foo == 2) {}
		`,
		outdent`
			if (foo === 1 && bar === 2) {}
			if (foo === 3) {}
		`,
		outdent`
			if (foo === 1) {}
			bar();
			if (foo === 2) {}
		`,
		outdent`
			function unicorn() {
				if (foo === 1) {
					return;
				}

				if (foo === 2) {}
			}
		`,
		outdent`
			function unicorn() {
				if (foo === 1) {
					throw new Error();
				}

				if (foo === 2) {}
			}
		`,
		// `process.exit()` always exits, so these should remain separate `if` statements.
		outdent`
			function handleSignal(signal) {
				if (signal === 'SIGINT') {
					process.exit(130);
				}

				if (signal === 'SIGTERM' || signal === 'SIGHUP') {
					process.exit(1);
				}
			}
		`,
		// A previous branch can exit through an exhaustive switch of terminal process.exit calls.
		outdent`
			function handleSignal(signal, value) {
				if (signal === 'SIGINT') {
					switch (value) {
						case 1:
							process.exit(130);
					default:
							process.exit(1);
					}
				}

				if (signal === 'SIGTERM') {}
			}
		`,
		// A previous branch can exit through a catch that always calls process.exit.
		outdent`
			function handleSignal(signal) {
				if (signal === 'SIGINT') {
					try {
						throw error;
					} catch {
						process.exit(130);
					}
				}

				if (signal === 'SIGTERM') {}
			}
		`,
		outdent`
			while (unicorn) {
				if (foo === 1) {
					break;
				}

				if (foo === 2) {}
			}
		`,
		outdent`
			while (unicorn) {
				if (foo === 1) {
					continue;
				}

				if (foo === 2) {}
			}
		`,
		// The previous branch always exits via an exhaustive `switch`, detected via code path analysis, so it is skipped.
		outdent`
			function unicorn() {
				if (foo === 1) {
					switch (bar) {
						case 1:
							return;
						default:
							throw new Error();
					}
				}

				if (foo === 2) {}
			}
		`,
		// The previous branch always exits via an infinite loop, so it is skipped.
		outdent`
			function unicorn() {
				if (foo === 1) {
					while (true) {
						poll();
					}
				}

				if (foo === 2) {}
			}
		`,
		// The previous branch always exits via a `try`/`finally` that returns, so it is skipped.
		outdent`
			function unicorn() {
				if (foo === 1) {
					try {
						doSomething();
					} finally {
						return cleanup();
					}
				}

				if (foo === 2) {}
			}
		`,
		outdent`
			if (foo === 1) {}
			else {}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {}

			if (foo === 2) {}
			else {}
		`,
		outdent`
			if (foo === 1) {
				foo = 2;
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {
				foo++;
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo.bar === 1) {
				foo.bar = 2;
			}

			if (foo.bar === 2) {}
		`,
		outdent`
			if (foo.bar === 1) {
				foo = {};
			}

			if (foo.bar === 2) {}
		`,
		outdent`
			if (foo === 1) {
				({foo} = object);
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {
				[foo] = array;
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo.bar.baz === 1) {
				foo.bar = {baz: 2};
			}

			if (foo.bar.baz === 2) {}
		`,
		outdent`
			if (foo[bar] === 1) {
				bar = 'baz';
			}

			if (foo[bar] === 2) {}
		`,
		outdent`
			if (foo.bar === 1) {
				delete foo.bar;
			}

			if (foo.bar === undefined) {}
		`,
		outdent`
			if (foo?.bar === undefined) {}
			if (foo.bar === 2) {}
		`,
		outdent`
			function unicorn(foo) {
				if (foo === 1) {
					var foo = 2;
				}

				if (foo === 2) {}
			}
		`,
		outdent`
			if (foo === 1) {
				for (foo of values) {}
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {
				for ({foo} in object) {}
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === bar) {}
			if (foo === baz) {}
		`,
		outdent`
			if (foo === 1) {}
			if (foo === 1) {}
		`,
		outdent`
			if (foo === 1 || foo === 2) {}
			if (foo === 2 || foo === 3) {}
		`,
		outdent`
			if (foo) {}
			if (foo === false) {}
		`,
		outdent`
			if (Boolean(foo)) {}
			if (foo === false) {}
		`,
		outdent`
			const foo = true;

			if (foo) {}
			if (foo === true) {}
		`,
		typeAware(outdent`
			declare const options: {enabled: string};

			if (options.enabled) {}
			if (options.enabled === false) {}
		`),
		{
			code: outdent`
				function unicorn(foo: boolean, Boolean) {
					if (Boolean(foo)) {}
					if (foo === false) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function unicorn(foo?: boolean) {
					if (!foo) {}
					if (foo === undefined) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (foo) {}
					if (foo === true) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// The trailing `else` makes the previous chain exhaustive.
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
			else {}

			if (foo === 3) {}
		`,
		// The trailing `else` would stop running once the following chain is joined.
		outdent`
			if (foo === 1) {}

			if (foo === 2) {}
			else if (foo === 3) {}
			else {}
		`,
		// A later condition in the previous chain repeats the following value.
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}

			if (foo === 2) {}
		`,
		// A later condition in the following chain repeats a previous value.
		outdent`
			if (foo === 1) {}

			if (foo === 2) {}
			else if (foo === 1) {}
		`,
		// A later condition in the following chain checks another discriminant.
		outdent`
			if (foo === 1) {}

			if (foo === 2) {}
			else if (bar === 3) {}
		`,
		// A later condition in the previous chain checks another discriminant.
		outdent`
			if (foo === 1) {}
			else if (bar === 2) {}

			if (foo === 3) {}
		`,
		// A later branch in the previous chain exits.
		outdent`
			function unicorn() {
				if (foo === 1) {}
				else if (foo === 2) {
					return;
				}

				if (foo === 3) {}
			}
		`,
		// A later branch in the previous chain mutates the discriminant.
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {
				foo = 3;
			}

			if (foo === 3) {}
		`,
		// The first branch in the previous chain exits.
		outdent`
			function unicorn() {
				if (foo === 1) {
					return;
				}
				else if (foo === 2) {}

				if (foo === 3) {}
			}
		`,
		// The first branch in the previous chain mutates the discriminant.
		outdent`
			if (foo === 1) {
				foo = 3;
			}
			else if (foo === 2) {}

			if (foo === 3) {}
		`,
		// Every value of a `||` condition inside a chain counts towards the overlap check.
		outdent`
			if (foo === 1) {}
			else if (foo === 2 || foo === 3) {}

			if (foo === 4) {}
			else if (foo === 3) {}
		`,
	],
	invalid: [
		outdent`
			if (foo === 1) {}
			if (foo === 2) {}
		`,
		// `null` literal as a distinct static value
		outdent`
			if (foo === null) {}
			if (foo === 1) {}
		`,
		// `this` as the discriminant
		outdent`
			if (this === null) {}
			if (this === undefined) {}
		`,
		// Deeply nested member expression discriminant
		outdent`
			if (a.b.c === 1) {}
			if (a.b.c === 2) {}
		`,
		// Three sequential ifs inside a switch case
		outdent`
			switch (x) {
				case 'a':
					if (foo === 1) {}
					if (foo === 2) {}
					if (foo === 3) {}
			}
		`,
		outdent`
			if (foo === 1) {
				bar();
			}

			if (foo === 2) {}
		`,
		outdent`
			if (foo === 1) {}
			if (foo === 2) {}
			if (foo === 3) {}
		`,
		outdent`
			if (1 === foo) {}
			if (2 === foo) {}
		`,
		outdent`
			if (foo.bar === 1) {}
			if (foo.bar === 2) {}
		`,
		outdent`
			if (foo.bar === 1) {}
			if (foo['bar'] === 2) {}
		`,
		outdent`
			if (foo['bar'] === 1) {}
			if (foo['bar'] === 2) {}
		`,
		outdent`
			if (foo === 1 || foo === 2) {}
			if (foo === 3 || foo === 4) {}
		`,
		outdent`
			class Foo {
				#state;

				method() {
					if (this.#state === 1) {}
					if (this.#state === 2) {}
				}
			}
		`,
		{
			code: outdent`
				if ((foo as string) === 'one') {}
				if (foo === 'two') {}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				if (foo! === 'one') {}
				if (foo === 'two') {}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				if ((foo satisfies string) === 'one') {}
				if (foo === 'two') {}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (foo) {}
					if (foo === false) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const foo = true;

			if (foo) {}
			if (foo === false) {}
		`,
		typeAware(outdent`
			declare const options: {enabled: boolean};

			if (options.enabled) {}
			if (options.enabled === false) {}
		`),
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (!foo) {}
					if (foo === true) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (Boolean(foo)) {}
					if (foo === false) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (foo === false) {}
					if (Boolean(foo)) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			switch (foo) {
				case 'bar':
					if (foo === 1) {}
					if (foo === 2) {}
			}
		`,
		outdent`
			class Foo {
				static {
					if (foo === 1) {}
					if (foo === 2) {}
				}
			}
		`,
		// A chain that is joined with the following `if`, from issue #3586.
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}

			if (foo === 3) {}
			else if (foo === 4) {}

			if (foo === 5) {}
		`,
		// A later branch in the previous chain has a side effect, so only a suggestion is offered.
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {
				bar();
			}

			if (foo === 3) {}
		`,
		// The first branch in the previous chain has a side effect, so only a suggestion is offered.
		outdent`
			if (foo === 1) {
				bar();
			}
			else if (foo === 2) {}

			if (foo === 3) {}
		`,
		// Every value of a `||` condition inside a chain counts, in both chains.
		outdent`
			if (foo === 1 || foo === 2) {}
			else if (foo === 3) {}

			if (foo === 4) {}
			else if (foo === 5 || foo === 6) {}
		`,
		// A later condition in the following chain has a side effect, so only a suggestion is offered.
		{
			code: outdent`
				function unicorn(foo: boolean) {
					if (foo === false) {}

					if (foo === true) {}
					else if (Boolean(foo)) {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function handleSignal(process, signal) {
				if (signal === 'SIGINT') {
					process.exit(130);
				}

				if (signal === 'SIGTERM' || signal === 'SIGHUP') {
					process.exit(1);
				}
			}
		`,
		outdent`
			import process from 'node:process';

			if (signal === 'SIGINT') {
				process.exit(130);
			}

			if (signal === 'SIGTERM' || signal === 'SIGHUP') {
				process.exit(1);
			}
		`,
	],
});
