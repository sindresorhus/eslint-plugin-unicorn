import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(transform(element));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element);
				foo();
			}
		`,
		outdent`
			const result = [];
			// Keep this comment.
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [existing];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				other.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element, other);
			}
		`,
		outdent`
			async function foo(Array) {
				const result = [];
				for await (const element of iterable) {
					result.push(element);
				}
			}
		`,
		outdent`
			const result = [];
			for await (const element of getIterable(result)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(result, element));
			}
		`,
		outdent`
			await using result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			using result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (await using element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (using element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			var result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result?.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push?.(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result['push'](element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.unshift(element);
			}
		`,
		outdent`
			const result = [];
			for (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(await getValue(element)));
			}
		`,
	],
	invalid: [
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			let result = [];
			for await (const element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of (iterable)) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await element);
			}
		`,
		outdent`
			const result = [];
			for await (const [key, value] of iterable) {
				result.push(await transform(key, value));
			}
		`,
		{
			code: outdent`
				const result: string[] = [];
				for await (const element of iterable) {
					result.push(element);
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await ({value: element}));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable)
				result.push(element);
		`,
	],
});
