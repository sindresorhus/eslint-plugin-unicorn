# Enforce importing a pragma when using JSX

This rule enforces you to import a pragma when you're using JSX. This is so that the JSX can be transformed into JavaScript. E.g. when using `React`; `<div/>` is transformed to `React.createElement('div')`.


## Fail

```js
const Foo = <div>Hello {this.props.name}</div>;
```


## Pass

```js
import React from 'react';

const Foo = <div>Hello {this.props.name}</div>;
```

```js
const React = require('react');

const Foo = <div>Hello {this.props.name}</div>;
```
