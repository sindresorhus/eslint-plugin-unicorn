import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescript = code => ({
	code,
	languageOptions: {
		parser: parsers.typescript,
	},
});

test.snapshot({
	valid: [
		outdent`
			let result = [];
			result = result.concat(chunk);
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = other.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				other = result.concat(chunk);
			}
		`,
		outdent`
			let result = [initial];
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			let result;
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			const result = [];
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			const text = '';
			for (const part of parts) {
				text.concat(part);
			}
		`,
		outdent`
			let text = '';
			for (const part of parts) {
				text = text.concat(part);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result?.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result['concat'](chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat(chunk).filter(Boolean);
			}
		`,
		outdent`
			for (const chunk of chunks) {
				let result = [];
				result = result.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				function append() {
					result = result.concat(chunk);
				}
			}
		`,
		outdent`
			let result = [];
			const append = () => {
				result = result.concat(chunk);
			};

			for (const chunk of chunks) {
				append(chunk);
			}
		`,
		outdent`
			this.result = [];
			for (const chunk of chunks) {
				this.result = this.result.concat(chunk);
			}
		`,
		outdent`
			const result = chunks.reduce((result, chunk) => result.concat(chunk), []);
		`,
		typescript(outdent`
			let result = ['initial'] as string[];
			for (const chunk of chunks) {
				result = (result as string[]).concat(chunk);
			}
		`),
	],
	invalid: [
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (let index = 0; index < chunks.length; index++) {
				result = result.concat(chunks[index]);
			}
		`,
		outdent`
			let result = [];
			for (const index in chunks) {
				result = result.concat(chunks[index]);
			}
		`,
		outdent`
			let result = [];
			while (chunks.length > 0) {
				result = result.concat(chunks.pop());
			}
		`,
		outdent`
			let result = [];
			do {
				result = result.concat(getChunk());
			} while (hasMoreChunks());
		`,
		outdent`
			let result = [];
			for (let index = 0; index < chunks.length; result = result.concat(chunks[index++])) {}
		`,
		outdent`
			var result = [];
			for (const chunk of chunks) {
				result = result.concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				(result) = (result).concat(chunk);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat(first, second);
			}
		`,
		outdent`
			let result = [];
			for (const chunk of chunks) {
				result = result.concat(...chunkGroups);
			}
		`,
		typescript(outdent`
			let result = [] as string[];
			for (const chunk of chunks) {
				result = (result as string[]).concat(chunk);
			}
		`),
		typescript(outdent`
			let result = [] satisfies string[];
			for (const chunk of chunks) {
				result = result!.concat(chunk);
			}
		`),
		typescript(outdent`
			let result = <string[]>[];
			for (const chunk of chunks) {
				result = (<string[]>result).concat(chunk);
			}
		`),
		outdent`
			for (let result = []; condition; result = result.concat(chunk)) {}
		`,
		outdent`
			for (let result = []; condition;) {
				result = result.concat(chunk);
			}
		`,
	],
});
