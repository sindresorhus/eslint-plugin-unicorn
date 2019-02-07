# Prefer one variables names over the others and to not have ambigue names.

Using abbreviations in code is considered a bad style by some people as abbreviation knowledge is context dependant and not shared by all code writers even in current timeframe, not even speaking about the future. Also, some projects might require to prevent usage of certain words or abbreviations as they might be confusing in project context.

This rule is fixable for words and abbreviations deemed non-ambiguous.

## Options
Configuration is done by 2 options `baseRuleset` and `rules`:
```js
{
  "unicorn/prefer-better-name": ["error", {
    "baseRuleset": "default", // optional, possible values are `default` and `extended`
    "rules": {
      "badName|anotherBadName": "goodName", // sets the rule to change `badName` and `anotherBadName` to `goodName`
      "oneMoreBadName": "anotherGoodName", // sets the rule to change `oneMoreBadName` to `anotherGoodName`
      "ambiguousName": "possibleMeaning|anotherPossibleMeaning", // `ambiguousName`, hinting it could mean either `possibleMeaning` or `anotherPossibleMeaning`
      "mostlyGoodName|aBitGoodName": "", // disables the rules for `mostlyGoodName` and `aBitGoodName`
    }
  }]
}
```

## Fail (with `default` ruleset)
```js
const e = new Error();
```

## Pass (with `default` ruleset)
```js
const error = new Error();
```

## Ruleset `default`

Consists of following rules:
```json
{
  "err": "error",
  "cb": "callback",
  "opts": "options",
  "str": "string",
  "obj": "object",
  "num": "number",
  "val": "value",
  "e": "event|error",
  "el": "element",
  "req": "request",
  "res": "response|result",
  "btn": "button",
  "msg": "message",
  "len": "length",
  "env": "environment",
  "dev": "development",
  "prod": "production",
  "tmp": "temporary",
  "arg": "argument",
  "tbl": "table",
  "db": "database",
  "ctx": "context",
  "mod": "module"
}
```

## Ruleset `extended`

Consistsof all rules from ruleset `default` plus

```json
{
  "elem": "element",
  "arr": "array",
  "btn": "button",
  "msg": "message",
  "len": "length",
  "tmp": "temporary",
  "ans": "answer",
  "arg": "argument",
  "rec": "record",
  "attrs": "attributes",
  "ns": "namespace",
  "prop": "property",
  "ref": "reference",
  "cmd": "command",
  "k": "key",
  "v": "value",
  "idx": "index"
}
```
