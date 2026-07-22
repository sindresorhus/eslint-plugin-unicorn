# no-unsafe-sqlite-interpolation

📝 Disallow interpolation into SQL strings passed to Node’s `node:sqlite` APIs.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Interpolating values into SQL strings makes them part of the SQL source instead of bound parameters. This can lead to SQL injection and data corruption.

Tagged templates passed directly to `exec()` or `prepare()` are also reported because they are not `SQLTagStore` calls, including static tags such as `String.raw`.

Use placeholders with `DatabaseSync#prepare()` and bind values when executing the prepared statement:

```js
const query = database.prepare('SELECT * FROM users WHERE id = ?');
query.get(id);
```

For Node.js 24.9.0 and later, use `SQLTagStore` tagged templates, which bind interpolated values as parameters:

```js
const sql = database.createTagStore();
sql.get`SELECT * FROM users WHERE id = ${id}`;
```

This rule only recognizes runtime `DatabaseSync` instances imported or required from exactly `node:sqlite`, including simple immutable `const` aliases of constructors, namespaces, and instances, and only checks `exec()` and `prepare()`. It intentionally ignores string concatenation, generic query methods, dynamic imports, factory-created databases, and mutable assignment flows.

## Examples

```js
import {DatabaseSync} from 'node:sqlite';

const database = new DatabaseSync(':memory:');

// ❌
database.exec(`SELECT * FROM users WHERE id = ${id}`);
```

```js
import {DatabaseSync} from 'node:sqlite';

const database = new DatabaseSync(':memory:');

// ❌
database.prepare(`SELECT * FROM users WHERE id = ${id}`);
```

```js
import {DatabaseSync} from 'node:sqlite';

const database = new DatabaseSync(':memory:');

// ✅
database.exec('CREATE TABLE users (id INTEGER)');
```
