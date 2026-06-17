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
	],
});
