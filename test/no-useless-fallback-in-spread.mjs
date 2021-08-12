import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = [...(foo || [])]',
		'const array = [...(foo || {})]',
		'const array = [...(foo && {})]',
		'const object = {...(foo && {})}',
		'const object = {...(foo ? foo : {})}',
		'const object = {...foo}',
		'const object = {...(foo ?? ({} || {}))}',
		'const {...foo} = object',
		'function foo({...bar}){}',
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
		'const object = {...((foo ?? {}) || {})}',
		'const object = {...((foo && {}) || {})}',
		'const object = {...(foo && {} || {})}',
		'const object = {...({...(foo || {})})}',
		'function foo(a = {...(bar || {})}){}',
		// The only case we'll break, but we should not care about it.
		'const object = {...(document.all || {})}',
	],
});
