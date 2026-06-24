/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const greeting = `Hello ${name}`;',
		'const greeting = `Hello ${user.name}`;',
		'const greeting = `Hello \\${name}`;',
		'const greeting = `Hello \\{name}`;',
		'const greeting = html`{name}`;',
		'const query = gql`query { user { name } }`;',
		'const greeting = String.raw`{name}`;',
		'const greeting = "{name}";',
		'const greeting = "$name}";',
		'const greeting = `Hello {name + suffix}`;',
		'const greeting = `Hello {user?.name}`;',
		'const greeting = `Hello {user[name]}`;',
		'const greeting = `Hello {{name}}`;',
		'const greeting = `Hello {{$name}}`;',
		// Named import/export specifiers in code-generation templates
		'const code = `import {foo} from "bar";`;',
		'const code = `\nimport {foo} from "bar";\n`;',
		'const code = `export {foo} from "./x";`;',
		// Local re-export without `from`
		'const code = `export {foo};`;',
		'const code = `import type {foo} from "bar";`;',
		'const code = `import foo, {bar} from "baz";`;',
		// Multiple named specifiers (the comma keeps it from matching at all)
		'const code = `import {foo, bar} from "baz";`;',
		// Indented import line in a multi-line code-generation template
		'const code = `\n\timport {foo} from "bar";\n`;',
		// Destructuring declarations in code-generation templates
		'const code = `const {foo} = bar;`;',
		'const code = `let {foo} = bar;`;',
		'const code = `var {foo} = bar;`;',
		// JSDoc/braces inside embedded block comments are not interpolation mistakes
		'const code = `/**\n * @param {string} [id]\n */`;',
		'const code = `/* {number} */`;',
		'const code = `/* {MyType} */`;',
		'const code = `/* {foo.Bar} */`;',
		'const code = `/** ${description} @param {string} id */`;',
		'const code = `/** ${/* first */ (description)} @param {string} id */`;',
		'const code = `/** ${/* first */\r\n (description)} @param {string} id */`;',
		'const code = `/** ${description /* note */} @param {string} id */`;',
		'const code = `/** ${description}\r\n * @param {string} id\r\n */`;',
		// The missing-opening-brace form is also ignored inside block comments
		'const code = `/* $name} */`;',
		// Multiple braces inside a single block comment are all ignored
		'const code = `/* {a} {b} */`;',
	],
	invalid: [
		'const greeting = `Hello {name}`;',
		// Object/destructuring braces are intentionally still reported
		'const code = `const x = {name};`;',
		// `import` mid-sentence is not a specifier
		'const greeting = `Please import {name} now`;',
		// `important` is not the `import` keyword
		'const greeting = `important {name}`;',
		// `constant` is not the `const` keyword
		'const greeting = `constant {name}`;',
		// `isBindingDeclaration` only guards `{foo}`, not the missing-opening-brace `$foo}` form
		'const code = `const $foo} = bar;`;',
		'const greeting = `Hello {user.name}`;',
		'const greeting = `Hello $name}`;',
		'const greeting = `Hello $user.name}`;',
		'const greeting = `Hello {firstName} {lastName}`;',
		'const greeting = `Hello $firstName} $lastName}`;',
		'const greeting = `Hello {firstName} ${middleName} {lastName}`;',
		'const greeting = `${salutation}, {name}`;',
		'const greeting = `${salutation}, {name} ${punctuation}`;',
		// A closed block comment spanning an interpolation does not suppress a real mistake after it
		'const code = `/** ${description}\r\n*/ {name}`;',
		// A closed block comment does not suppress a real mistake after it
		'const code = `/* doc */ Hello {name}`;',
		// A real mistake before a block comment is reported, while the comment brace is ignored
		'const code = `{name} /* {type} */`;',
		// A stray `/*` (no closing `*/`) is not a comment, so the mistake is still reported
		'const code = `const re = "/*"; {name}`;',
		// Line comments are intentionally unsupported
		'const code = `// {name}`;',
	],
});
