# Disallow unsafe regular expressions

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
<!-- /RULE_NOTICE -->

Uses [safe-regex](https://github.com/substack/safe-regex) to disallow potentially [catastrophic](https://regular-expressions.mobi/catastrophic.html) [exponential-time](https://perlgeek.de/blog-en/perl-tips/in-search-of-an-exponetial-regexp.html) regular expressions.

## Fail

```js
const regex = /^(a?){25}(a){25}$/;
const regex = RegExp('a?'.repeat(26) + 'a'.repeat(26));
const regex = /(x+x+)+y/;
const regex = /foo|(x+x+)+y/;
const regex = /(a+){10}y/;
const regex = /(a+){2}y/;
const regex = /(.*){1,32000}[bc]/;
```

## Pass

```js
const regex = /\bOakland\b/;
const regex = /\b(Oakland|San Francisco)\b/i;
const regex = /^\d+1337\d+$/i;
const regex = /^\d+(1337|404)\d+$/i;
const regex = /^\d+(1337|404)*\d+$/i;
const regex = RegExp('a?'.repeat(25) + 'a'.repeat(25));
```
