# Prefer one variables names over the others(configurable). Prefer not to have ambigue names.

Will output errors on all encounters of bad names from ruleset. If the rule is non-ambiguous, it is a fixable error.

Configuration is done by 2 options, a name of base ruleset and an object containing rules in format:
```js
{
  "badName|anotherBadName": "goodName", // sets the rule to change badName and anotherBadName to goodName
  "oneMoreBadName": "anotherGoodName", // sets the rule to change oneMoreBadName to anotherGoodName
  "ambiguousName": "possibleMeaning|anotherPossibleMeaning", // ambiguous name, with hint to what it could mean
  "mostlyGoodName|aBitGoodName": "", // disables the rules for mostlyGoodName and aBitGoodName
}
```

## Ruleset `default`
This ruleset consists of following rules:
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
