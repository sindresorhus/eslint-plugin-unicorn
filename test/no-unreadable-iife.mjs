import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = (bar => bar)();',
		outdent`
			const foo = (() => {
				return a ? b : c
			})();
		`,
	],
	invalid: [
		'const foo = (() => (a ? b : c))();',
		outdent`
			const foo = (() => (
				a ? b : c
			))();
		`,
		outdent`
			const foo = (
				() => (
					a ? b : c
				)
			)();
		`,
		outdent`
			const foo = (() => (
				a, b
			))();
		`,
		outdent`
			const foo = (() => ({
				a: b,
			}))();
		`,
		'const foo = (bar => (bar))();',
		outdent`
			(async () => ({
				bar,
			}))();
		`,
		outdent`
			const foo = (async (bar) => ({
				bar: await baz(),
			}))();
		`,
		'(async () => (( {bar} )))();',
	],
});
