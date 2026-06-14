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
			const foo = true;

			if (foo) {}
			if (foo === true) {}
		`,
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
	],
	invalid: [
		outdent`
			if (foo === 1) {}
			if (foo === 2) {}
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
	],
});
