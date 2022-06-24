import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			Object.defineProperty({}, "load", {
			    value: () => {},
			    writable: true
			});
		`,
		outdent`
			Object.defineProperty({}, "load", {
			    value: () => {},
			    writable: true
			});
			Object.defineProperty();
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
		`,
		outdent`
			Object.defineProperties({}, {
			    load: {
			        value: () => {},
			        writable: true
			    },
			    build: {
			        value: null,
			        writable: true
			    },
			});
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
			Object.defineProperty({}, foo, {
			    value: null,
			    writable: true
			});
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
			Object.defineProperty({}, "load", foo);
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
			{
				Object.defineProperty({}, "load", {
			    	value: null,
			    	writable: true
				});
			}
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
			{}
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
		`,
		outdent`
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});



			
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
		`,
	],
	invalid: [
		outdent`
			Object.defineProperty({}, "load", {
			    value: () => {},
			    writable: true
			});
			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
		`,
		outdent`
			Object.defineProperty({}, "load", {
			    value: () => {},
			    writable: true
			});

			//

			Object.defineProperty({}, "build", {
			    value: null,
			    writable: true
			});
		`,
		outdent`
			Object.defineProperty({}, "load", {
			    value: () => {},
			    writable: true
			});
			{}
			Object.defineProperty({}, "test", {
			    value: null,
			    writable: true
			});
			Object.defineProperty({}, "test-b", {
			    value: null,
			    writable: true
			});
		`,
	],
});
