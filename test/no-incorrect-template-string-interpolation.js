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
	],
	invalid: [
		'const greeting = `Hello {name}`;',
		'const greeting = `Hello {user.name}`;',
		'const greeting = `Hello $name}`;',
		'const greeting = `Hello $user.name}`;',
		'const greeting = `Hello {firstName} {lastName}`;',
		'const greeting = `Hello $firstName} $lastName}`;',
		'const greeting = `Hello {firstName} ${middleName} {lastName}`;',
		'const greeting = `${salutation}, {name}`;',
	],
});
