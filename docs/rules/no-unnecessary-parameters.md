# no-unnecessary-parameters

📝 Disallow parameters that receive the same value at every call.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A parameter can become unnecessary when every call passes the same value, or when every call uses its default. Removing it makes the function's actual dependencies clearer and avoids repeating arguments at each call site.

This rule checks functions whose callers can be determined within the current file. It is disabled by default because keeping a parameter can be useful for documenting an interface or anticipating other callers.

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

The rule also reports defaults that depend on earlier parameters. A fix is available for a final parameter with a simple earlier-parameter default when moving it into the body preserves its scope and evaluation timing.

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

Configured readonly globals are reported, but not automatically replaced because their value may change outside the file.

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

- Local function declarations, function expressions, and arrow functions assigned directly to stable bindings.
- Instance and static `#private` methods, including those in exported classes.
- Explicit constructors of local, non-exported classes, and local constructor functions called with `new`.
- Direct recursion that forwards the same, unwritten parameter. Other recursive arguments must agree with the value received at external calls.
- Primitive literals, signed numbers and BigInts, template strings without substitutions, `undefined`, `void 0`, and accessible stable identifier bindings. Literal spelling does not matter, but `0` and `-0` are different values.
- Shallow object-destructured properties with static keys, including renaming, defaults, and an object rest property. Arguments must be unambiguous object literals; an outer parameter default of `{}` is supported.
- Omitted parameters, including parameters without a default. Complex defaults are reported when every call omits the argument or passes `undefined`, without evaluating the default.

## Scope and limitations

The rule cannot prove all callers are known when a function is exported, reassigned, aliased, passed as a callback, or used as a value. Those functions are ignored. Public methods, TypeScript `private` methods, decorated functions or parameters, overload declarations, inherited constructors, and top-level script bindings are also ignored.

The rule does not follow imported live bindings, `var` bindings, mutable values, object variables, nested destructuring, or mutual recursion. Object spreads, dynamic keys, duplicate keys, accessors, and prototype-dependent properties are unsupported. Spread arguments are ignored when they make a parameter's position uncertain.

Functions using their own `arguments` are ignored. Files containing direct `eval` or `with` are ignored. TypeScript syntax is supported without type information; TypeScript `this` parameters and parameter-property slots are left unchanged.

Autofixes update the declaration, references, and all callers together. They preserve object shorthand keys and leave an empty object pattern when the final destructured property is removed. At most one parameter or property per function is fixed in each lint pass, so repeated passes can remove multiple unnecessary parameters.

Some reports require manual changes, including readonly globals, unsafe parameter writes, complex defaults, defaults referring to outer bindings, dependencies between parameter initializers, unsafe initialization order or conflicting scopes, and explicit or contextual TypeScript signatures. A concise arrow default is left for manual changes when rewriting its body would overlap argument removals within that body. A fix is also omitted when it would remove or relocate a comment. Reflection through instance constructors or function source text is unsupported.
