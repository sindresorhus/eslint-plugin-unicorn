# Do not use `document.cookie` directly

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*
<!-- RULE_NOTICE_END -->

It's not recommended to use [`document.cookie`](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie) directly as it's easy to get the string wrong. Instead, you should use the [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API) or a [cookie library](https://www.npmjs.com/search?q=cookie).

## Fail

```js
document.cookie =
	'foo=bar' +
	'; Path=/' +
	'; Domain=example.com' +
	'; expires=Fri, 31 Dec 9999 23:59:59 GMT' +
	'; Secure';
```

```js
document.cookie += '; foo=bar';
```

## Pass

```js
await cookieStore.set({
	name: 'foo',
	value: 'bar',
	expires: Date.now() + 24 * 60 * 60 * 1000,
	domain: 'example.com'
});
```

```js
const array = document.cookie.split('; ');
```

```js
import Cookies from 'js-cookie';

Cookies.set('foo', 'bar');
```
