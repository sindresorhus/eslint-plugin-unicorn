# Disallow unsafe regular expressions

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
<!-- /RULE_NOTICE -->

Uses [safe-regex](https://github.com/substack/safe-regex) to disallow potentially [catastrophic](https://regular-expressions.mobi/catastrophic.html) [exponential-time](https://perlgeek.de/blog-en/perl-tips/in-search-of-an-exponetial-regexp.html) regular expressions.

## Fail

```js
const regex = /^(a?){25}(a){25}$/;
```

```js
const regex = /(x+x+)+y/;
```

```js
const regex = /foo|(x+x+)+y/;
```

```js
const regex = /(a+){10}y/;
```

```js
const regex = /(a+){2}y/;
```

```js
const regex = /(.*){1,32000}[bc]/;
```

## Pass

```js
const regex = /\bOakland\b/;
```

```js
const regex = /\b(Oakland|San Francisco)\b/i;
```

```js
const regex = /^\d+1337\d+$/i;
```

```js
const regex = /^\d+(1337|404)\d+$/i;
```

```js
const regex = /^\d+(1337|404)*\d+$/i;
```

```js
const regex = new RegExp('a?'.repeat(25) + 'a'.repeat(25));
```
