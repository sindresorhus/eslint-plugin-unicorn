import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const typescriptLanguageOptions = {
	parser: parsers.typescript.implementation,
	parserOptions: parsers.typescript.mergeParserOptions(),
};

test.snapshot({
	valid: [
		outdent`
			function foo(bar) {
				const result = 1;
				console.log(result);
				if (!bar) {
					return;
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				doSomething();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				var result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const {result} = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			export const result = 1;
			if (!bar) {
				throw new Error();
			}
			console.log(result);
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						continue;
					} else {
						break;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(value) {
				switch (value) {
					case 1:
						const result = 1;
						if (!bar) {
							break;
						}
						console.log(result);
				}
			}
		`,
		outdent`
			function foo(bar) {
				using result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			async function foo(bar) {
				await using result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo() {
				const result = getResult();
				if (!result) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let result;
				result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return result;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return;
				} else {
					console.log(result);
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					cleanup();
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, baz) {
				const result = 1;
				if (!bar) {
					return;
				} else if (baz) {
					throw new Error();
				} else {
					return;
				}
				console.log(result);
			}
		`,
		{
			code: outdent`
				function foo(bar: boolean) {
					const result = getResult();
					if (!bar) {
						return;
					}
					let value: typeof result;
				}
			`,
			languageOptions: typescriptLanguageOptions,
		},
		{
			code: outdent`
				declare const result: string;
				if (!bar) {
					throw new Error();
				}
				console.log(result);
			`,
			languageOptions: typescriptLanguageOptions,
		},
	],
	invalid: [
		outdent`
			function foo(bar) {
				const result = getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = \`result\`;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				console.log(bar);
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			const result = 1;
			if (!bar) {
				throw new Error();
			}
			console.log(result);
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) return;
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					throw new Error();
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let result;
				if (!bar) {
					return;
				}
				result = getResult();
				console.log(result);
			}
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						break;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(items) {
				for (const item of items) {
					const result = 1;
					if (!item) {
						continue;
					}
					console.log(result);
				}
			}
		`,
		outdent`
			function foo(value) {
				switch (value) {
					case 1: {
						const result = 1;
						if (!bar) {
							break;
						}
						console.log(result);
					}
				}
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					cleanup();
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (bar) {
					console.log(bar);
				} else {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1, other = 2;
				if (!bar) {
					return;
				}
				console.log(result, other);
			}
		`,
		outdent`
			function foo(bar) {
				const result = object.result;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = new Result();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, items) {
				const result = [...items];
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar, object) {
				const result = {...object};
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			async function foo(bar) {
				const result = await getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function * foo(bar) {
				const result = yield getResult();
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let source;
				const result = source = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				let index = 0;
				const result = index++;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				// Keep this comment.
				const result = 1;
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1; // Keep this comment.
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) return; // Keep this comment.
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				// Keep this comment.
				if (!bar) {
					return;
				}
				console.log(result);
			}
		`,
		outdent`
			function foo(bar) {
				const result = 1;
				if (!bar) {
					return;
				} else {
					console.log(bar);
				}
				console.log(result);
			}
		`,
	],
});
