# Disallow `process.exit()`

This rule is an extension to ESLint's [`no-process-exit` rule](http://eslint.org/docs/rules/no-process-exit), that allows `process.exit()` to be called in files that start with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) → `#!/usr/bin/env node`. It also allows `process.exit()` to be called in `process.on('<event>', func)` event handlers and files with `worker_threads` modules required.


## Fail

```js
process.exit(0);
```


## Pass

```js
#!/usr/bin/env node
process.exit(0);
```

```js
process.on('SIGINT', () => {
    console.log('Got SIGINT');
    process.exit(1);
});
```

```js
import {workerData, parentPort} from 'worker_threads'

const {data, seq} = workerData

doSomething()
  .then(() => {
    const response = `modified ${data}`
    parentPort.postMessage(`Data processed - ${seq}: ${response}`)
  })
  .catch(error => {
    process.exit(1)
  })
```
