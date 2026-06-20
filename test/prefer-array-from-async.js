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
			const result = [];
			for await (const result of iterable) {
				result.push(result);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(
					// Keep this comment.
					element,
				);
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element++));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await transform(element = value));
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
			for await (var element of iterable) {
				result.push(element);
			}
		`,
		outdent`
			const result = [];
			for await (const [key, value] of iterable) {
				result.push(await transform(key, value));
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
			for await (let element of iterable) {
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
			for await (let element of iterable) {
				result.push(await transform(element++));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await element);
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
		// A sequence expression mapper body must be parenthesized in the arrow function
		outdent`
			const result = [];
			for await (const element of iterable) {
				result.push(await (log(element), element));
			}
		`,
		outdent`
			const result = [];
			for await (const element of iterable)
				result.push(element);
		`,
		// A TypeScript `as` mapper body must be parenthesized in the arrow function
		{
			code: outdent`
				const result = [];
				for await (const element of iterable) {
					result.push(await (element as string));
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
