# Prefer ternary expressions over simple `if-else` statements

This rule enforces the use of ternary expressions over  'simple' `if-else` statements where 'simple' means the consequent and alternate are each one line and have the same basic type and form.

Using an `if-else` statement typically results in more lines of code than a single lined ternary expression, which leads to an unnecessarily larger codebase that is more difficult to maintain.

Additionally, using an `if-else` statement can result in defining variables using `let` or `var` solely to be reassigned within the blocks. This leads to varaibles being unnecessarily mutable and prevents `prefer-const` from flagging the variable.

This rule is fixable.


## Fail

```js
let foo =''
if(bar){
	foo = 3
}
else{
	foo = 4
}
```

```js
if(bar){
	return 3
}
else{
	return 4
}
```

```js
if(bar){
	await firstPromise()
}
else{
	await secondPromise()
}
```

```js
if(bar){
	yield bat
}
else{
	yield baz
}
```

## Pass

```js
let foo = bar ? 3 : 4
```

```js
return bar ? 3 : 4
```

```js
await (bar ? 3 : 4)
```

```js
yield (bar ? 3 : 4)
```

```js
let foo = ''
if(bar){
	baz()
	foo = 3
}
else{
	foo = 4
}
```

```js
if(bar){
	foo = 3
}
else{
	return 4
}
```

```js
if(bar){
	foo = 3
}
else{
	baz = 4
}
```
