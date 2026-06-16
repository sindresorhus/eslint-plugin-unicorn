import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = [...(foo || [])]',
		'const array = [...(foo || {})]',
		'const array = [...(foo && {})]',
		'const object = {...(foo && {})}',
		'const object = {...({} || foo)}',
		'const object = {...({} && foo)}',
		'const object = {...({} ?? foo)}',
		'const object = {...foo}',
		'const object = {...(foo ?? ({} || {}))}',
		'const {...foo} = object',
		'function foo({...bar}){}',
		'const object = {...(foo || {}).toString()}',
		'const object = {...fn(foo || {})}',
		'const object = call({}, ...(foo || {}))',
		'const object = {...(foo || {not: "empty"})}',
		'const object = {...(foo || {...{}})}',

		// Ternary
		// Neither branch is an empty object
		'const object = {...(foo ? {a: 1} : {b: 2})}',
		// Both branches are empty objects
		'const object = {...(foo ? {} : {})}',
		// Handled by `prefer-logical-operator-over-ternary`
		'const object = {...(foo ? foo : {})}',
		'const object = {...(!foo ? {} : foo)}',
		'const object = {...(foo.bar ? foo.bar : {})}',
		// Array spread, not object
		'const array = [...(foo ? {a: 1} : {})]',
		// Ternary is not the direct spread argument
		'const object = {...(foo ? {a: 1} : {}).bar}',

		// `checkTernary: false` leaves ternaries alone
		{
			code: 'const object = {...(foo ? {bar: true} : {})}',
			options: [{checkTernary: false}],
		},
		{
			code: 'const object = {...(foo ? {} : {bar: true})}',
			options: [{checkTernary: false}],
		},
	],
	invalid: [
		'const object = {...(foo || {})}',
		'const object = {...(foo ?? {})}',
		'const object = {...(foo ?? (( {} )))}',
		'const object = {...((( foo )) ?? (( {} )))}',
		'const object = {...(( (( foo )) ?? (( {} )) ))}',
		'async ()=> ({...((await foo) || {})})',
		'const object = {...(0 || {})}',
		'const object = {...((-0) || {})}',
		'const object = {...(.0 || {})}',
		'const object = {...(0n || {})}',
		'const object = {...(false || {})}',
		'const object = {...(null || {})}',
		'const object = {...(undefined || {})}',
		'const object = {...((a && b) || {})}',
		'const object = {...(NaN || {})}',
		'const object = {...("" || {})}',
		'const object = {...([] || {})}',
		'const object = {...({} || {})}',
		'const object = {...(foo || {}),}',
		// Report but don't drop comments in the removed part
		'const object = {...(foo /* keep */ || {})}',
		'const object = {...(foo || /* keep */ {})}',
		'const object = {...((foo ?? {}) || {})}',
		'const object = {...((foo && {}) || {})}',
		'const object = {...(foo && {} || {})}',
		'const object = {...({...(foo || {})})}',
		'const object = {...({...((0, foo) || {})})}',
		'function foo(a = {...(bar || {})}){}',
		// The only case we'll break, but we should not care about it.
		'const object = {...(document.all || {})}',

		// Ternary
		'const object = {...(foo ? {bar: true} : {})}',
		'const object = {...(!foo ? {} : {bar: true})}',
		'const object = {...(foo ? {} : {bar: true})}',
		// Non-object kept branch
		'const object = {...(foo ? bar : {})}',
		'const object = {...(foo ? {} : bar)}',
		// Precedence
		'const object = {...(a || b ? {x: 1} : {})}',
		'const object = {...(a && b ? {} : {x: 1})}',
		'const object = {...(a ?? b ? {x: 1} : {})}',
		'async () => ({...(await foo ? {a: 1} : {})})',
		'const object = {...((a, b) ? {x: 1} : {})}',
		'const object = {...((a, b) ? {} : {x: 1})}',
		// Kept branch needs parentheses as the right operand
		'const object = {...(foo ? (() => x) : {})}',
		'const object = {...(foo ? a || b : {})}',
		// Kept branch is `??`, which is a syntax error as a bare `&&` operand
		'const object = {...(foo ? a ?? b : {})}',
		'const object = {...(foo ? {} : a ?? b)}',
		// Optional chaining in the test
		'const object = {...(foo?.bar ? {a: 1} : {})}',
		// Parentheses
		'const object = {...((( foo )) ? (( {a: 1} )) : (( {} )))}',
		// No surrounding parentheses
		'const object = ({...foo ? {a: 1} : {}})',
		// Double negation
		'const object = {...(!!foo ? {} : {bar: true})}',
		// TypeScript
		{
			code: 'const object = {...(foo ? bar! : {})}',
			languageOptions: {parser: parsers.typescript},
		},
		// Comment inside the ternary skips the fix
		'const object = {...(foo ? {a: 1} : /* keep */ {})}',
		// Comment outside the ternary is preserved by the fix
		'const object = {...(/* keep */ foo ? {a: 1} : {})}',

		// `checkTernary: false` still reports the `||`/`??` fallback (option scopes to ternaries only)
		{
			code: 'const object = {...(foo || {})}',
			options: [{checkTernary: false}],
		},
		{
			code: 'const object = {...(foo ?? {})}',
			options: [{checkTernary: false}],
		},
		// `checkTernary: true` reports ternaries, same as the default
		{
			code: 'const object = {...(foo ? {bar: true} : {})}',
			options: [{checkTernary: true}],
		},
	],
});
