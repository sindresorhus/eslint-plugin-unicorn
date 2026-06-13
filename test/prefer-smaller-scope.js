import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function foo() {
				while (condition) {
					const value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue(value);
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					console.log(value);
					value = getValue();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
				}
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
				if (otherCondition) {
					value = getOtherValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				const value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				var value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value, otherValue;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value += getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					({value} = getObject());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					[value] = getArray();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value++;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					++value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (value = getValue()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (value = getValue(); condition; update()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true:
						value = getValue();
						console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					value = getValue();
					console.log(value);
				}
				let value;
			}
		`,
		outdent`
			let value;
			function foo() {
				value = getValue();
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					function bar() {
						value = getValue();
						console.log(value);
					}
					bar();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					class Bar {
						method() {
							value = getValue();
							console.log(value);
						}
					}
					console.log(Bar);
				}
			}
		`,
	],
	invalid: [
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				{
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (const item of items) {
					value = item.value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true: {
						value = getValue();
						console.log(value);
						break;
					}
				}
			}
		`,
		outdent`
			function foo() {
				// Important setup.
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = getValue());
					console.log(value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					let value: Value;
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
