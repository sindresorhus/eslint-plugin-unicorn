# Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

Enforces the use of, for example, `child.remove();` over `child.parentNode.removeChild(child);`. The DOM function [`Node#remove()`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove) is preferred over the indirect removal of an object with [`Node#removeChild()`](https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild).


## Fail

```js
parentNode.removeChild(foo);
parentNode.removeChild(this);
```


## Pass

```js
foo.remove();
this.remove();
```
