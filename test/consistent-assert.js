import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'assert(foo)',
		'import assert from "assert";',
		// Import but not invoke
		outdent`
			import assert from 'node:assert';
			assert;
		`,
		outdent`
			import customAssert from 'node:assert';
			assert(foo);
		`,
		outdent`
			function foo (assert) {
				assert(bar);
			}
		`,
		outdent`
			import assert from 'node:assert';

			function foo (assert) {
				assert(bar);
			}
		`,
		// Invalid named import
		outdent`
			import {strict} from 'node:assert/strict';

			strict(foo);
		`,
		outdent`
			import * as assert from 'node:assert';
			assert(foo);
		`,
		outdent`
			import assert from 'node:assert/strict';
			console.log(assert)
		`,
		...[
			'import type assert from "node:assert/strict";',
			'import {type strict as assert} from "node:assert/strict";',
			'import type {strict as assert} from "node:assert/strict";',
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
		// All cases
		outdent`
			import a, {strict as b, default as c} from 'node:assert';
			import d, {strict as e, default as f} from 'assert';
			import g, {default as h} from 'node:assert/strict';
			import i, {default as j} from 'assert/strict';
			a(foo);
			b(foo);
			c(foo);
			d(foo);
			e(foo);
			f(foo);
			g(foo);
			h(foo);
			i(foo);
			j(foo);
		`,
		outdent`
			import assert from 'assert';

			((
				/* comment */ ((
					/* comment */
					assert
					/* comment */
					)) /* comment */
					(/* comment */ typeof foo === 'string', 'foo must be a string' /** after comment */)
			));
		`,
	],
});
