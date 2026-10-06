# no-unnecessary-parameters

📝 Disallow parameters that receive the same value at every call.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports parameters that receive the same value or always use their default at every known call within the file. Removing them clarifies the function's dependencies and avoids repeating arguments.

## Examples

```js
// ❌
function log(message, level) {
	console.log(level, message);
}

log('Starting', 'info');
log('Finished', 'info');

// ✅
function log(message) {
	console.log('info', message);
}

log('Starting');
log('Finished');
```

Parameters in the middle of a signature are checked too.

```js
// ❌
function format(value, unit, digits) {
	return `${value.toFixed(digits)}${unit}`;
}

format(1, 'px', 0);
format(2, 'px', 1);

// ✅
function format(value, digits) {
	return `${value.toFixed(digits)}px`;
}

format(1, 0);
format(2, 1);
```

A constant already accessible to the function does not need to be passed repeatedly.

```js
// ❌
const limit = 10;

function clamp(value, maximum) {
	return Math.min(value, maximum);
}

clamp(1, limit);
clamp(2, limit);

// ✅
const limit = 10;

function clamp(value) {
	return Math.min(value, limit);
}

clamp(1);
clamp(2);
```

Calls with an omitted argument or an explicit `undefined` use the parameter's default. Explicit arguments equal to a supported constant default are checked too.

```js
// ❌
function print(message, extra = false) {
	console.log(message, extra);
}

print('Starting');
print('Finished', false);
print('Done', undefined);

// ✅
function print(message) {
	console.log(message, false);
}

print('Starting');
print('Finished');
print('Done');
```

Defaults referring to earlier parameters are reported too. When safe, a final default becomes a local variable:

```js
// ❌
function pair(first, second = first) {
	return [first, second];
}

pair(1);
pair(2);

// ✅
function pair(first) {
	const second = first;
	return [first, second];
}

pair(1);
pair(2);
```

Recursive calls can share a default value that must be fresh for each external call:

```js
// ✅
function walk(node, seen = new Set()) {
	if (seen.has(node)) {
		return seen;
	}

	seen.add(node);
	return node.next ? walk(node.next, seen) : seen;
}

walk({next: {}});
walk({});
```

Shallow object-destructured properties are checked independently.

```js
// ❌
function run({path, verbose, dryRun = false}) {
	console.log(path, verbose, dryRun);
}

run({path: 'first', verbose: true});
run({path: 'second', verbose: true, dryRun: false});

// ✅
function run({path}) {
	console.log(path, true, false);
}

run({path: 'first'});
run({path: 'second'});
```

Global bindings are reported but require manual changes because their values may change outside the file.

```js
// ❌
/* global document: readonly */
function find(selector, root) {
	return root.querySelector(selector);
}

find('.first', document);
find('.second', document);
```

## Options

Type: `object`

### minimumCallCount

Type: `integer`\
Default: `2`\
Minimum: `1`

The minimum number of distinct call sites required to report a parameter. Calls inside the function do not count toward this threshold. A call inside a loop still counts as one call site.

Set this to `1` to check functions called only once.

```js
{
	rules: {
		'unicorn/no-unnecessary-parameters': ['error', {minimumCallCount: 1}],
	},
}
```

## Supported patterns

- Local functions, arrow functions, and explicit constructors.
- Instance and static `#private` methods, including those in exported classes.
- Primitive literals, `undefined`, `void 0`, stable identifier bindings, and omitted or default arguments.
- Direct recursion forwarding an unchanged parameter.
- Shallow object destructuring with static keys, renaming, defaults, and rest. Arguments must be object literals; an outer default of `{}` is supported.

## Scope and limitations

Functions with unknown callers, public methods, and functions using their own `arguments` are ignored. Ambiguous arguments and nested destructuring are skipped. Files with direct `eval`, `with`, or non-strict block function declarations are skipped.

When external calls use a default forwarded by recursion, only primitives and stable outer bindings are checked. Other defaults are skipped to preserve shared state.

Autofixes update declarations and callers together. Global bindings, complex defaults, and changes affecting scope, timing, syntax, or comments require manual fixes.

Autofixes are disabled throughout files using a TypeScript extension or parser, `@ts-check`, or JSDoc type annotations like `@param`, `@type`, `@constructor`, and `@class`. Descriptive JSDoc is unaffected.

External `checkJs` settings are not detected without TypeScript parser services. Reflection through instance constructors or function source text is unsupported.
