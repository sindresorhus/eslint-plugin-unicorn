import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'assert(foo)',
		'import assert from "assert";',
		// Import but not invoke
		outdent`
			import assert from 'assert';
			assert
		`,
		outdent`
			import customAssert from 'assert';
			assert(foo)
		`,
		outdent`
			function foo (assert) {
				assert(bar);
			}
		`,
		outdent`
			import assert from 'assert';

			function foo (assert) {
				assert(bar);
			}
		`,
		// Invalid named import
		outdent`
			import {strict} from 'assert/strict';

			strict(foo)
		`,
		...[
			'import type assert from "assert";',
			'import {type strict as assert} from "node:assert";',
			'import type {strict as assert} from "node:assert";',
		].flatMap(code => [code, `${code}\nassert();`]).map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		// Default import
		outdent`
			import assert from 'assert';
			assert(foo)
		`,
		outdent`
			import assert from 'node:assert';
			assert(foo)
		`,
		outdent`
			import assert from 'assert/strict';
			assert(foo)
		`,
		outdent`
			import assert from 'node:assert/strict';
			assert(foo)
		`,
		outdent`
			import customAssert from 'assert';
			customAssert(foo)
		`,
		outdent`
			import customAssert from 'node:assert';
			customAssert(foo)
		`,
		// Multiple references
		outdent`
			import assert from 'assert';
			assert(foo)
			assert(bar)
			assert(baz)
		`,
		// Named import
		outdent`
			import {strict} from 'assert';
			strict(foo)
		`,
		// Named import with alias
		outdent`
			import {strict as assert} from 'assert';
			assert(foo)
		`,
		// Mixed import
		outdent`
			import assert, {strict} from 'assert';
			assert(foo)
			strict(foo)
		`,
		// Mixed import with alias
		outdent`
			import assert, {strict as assertStrict} from 'assert';
			assert(foo)
			assertStrict(foo)
		`,
		outdent`
			import assert from 'assert';

			assert(/** before comment */ typeof foo === 'string', 'foo must be a string' /** after comment */);
		`,
		outdent`
			import {default as foo} from 'node:assert';
			foo(1);
		`,
	],
});
