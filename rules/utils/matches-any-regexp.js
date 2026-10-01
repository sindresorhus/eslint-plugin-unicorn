/**
Check if any of the patterns matches the value.

The `g` and `y` flags make `RegExp#test()` stateful through `lastIndex`, so a stateful pattern is tested with a fresh copy, which starts at `lastIndex` 0 and keeps the flags (a `y` pattern stays anchored). The pattern itself is left alone, it can be frozen.

@param {string} value - The value to test.
@param {RegExp[]} patterns - The patterns to test against.
@returns {boolean} `true` if any pattern matches the value.
*/
export default function matchesAnyRegExp(value, patterns) {
	return patterns.some(pattern => {
		if (pattern.global || pattern.sticky) {
			pattern = new RegExp(pattern);
		}

		return pattern.test(value);
	});
}
