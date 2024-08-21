import {outdent} from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'height > 10 ? height : 20',
		'height > 50 ? Math.min(50, height) : height',
		'(0,foo) > 10 ? 10 : (0,foo)',
	],
	invalid: [
		// Prefer `Math.min()`
		'height > 50 ? 50 : height',
		'height >= 50 ? 50 : height',
		'height < 50 ? height : 50',
		'height <= 50 ? height : 50',

		// Prefer `Math.min()`
		'height > maxHeight ? maxHeight : height',
		'height < maxHeight ? height : maxHeight',

		// Prefer `Math.min()`
		'window.height > 50 ? 50 : window.height',
		'window.height < 50 ? window.height : 50',

		// Prefer `Math.max()`
		'height > 50 ? height : 50',
		'height >= 50 ? height : 50',
		'height < 50 ? 50 : height',
		'height <= 50 ? 50 : height',

		// Prefer `Math.max()`
		'height > maxHeight ? height : maxHeight',
		'height < maxHeight ? maxHeight : height',

		// Edge test when there is no space between ReturnStatement and ConditionalExpression
		outdent`
			function a() {
				return +foo > 10 ? 10 : +foo
			}
		`,
		outdent`
			function a() {
				return+foo > 10 ? 10 : +foo
			}
		`,
	],
});
