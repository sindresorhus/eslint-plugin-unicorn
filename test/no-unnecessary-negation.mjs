import { getTester } from "./utils/test.mjs";

const { test, rule, ruleId } = getTester(import.meta);
const msg = rule.meta.messages[ruleId];

test({
	valid: ["!!a;", "Boolean(a);", "!a;"],
	invalid: [
		{ code: "!(a != b)", errors: [msg], output: "a == b" },
		{ code: "!(a !== b)", errors: [msg], output: "a === b" },
		{ code: "!(a == b)", errors: [msg], output: "a != b" },
		{ code: "!(a === b)", errors: [msg], output: "a !== b" },
		{ code: "!Boolean(a)", errors: [msg], output: "!(a)" },
		{ code: "!Boolean(!a)", errors: [msg], output: "!!a" },
		{ code: "if(!Boolean(!a)){}", errors: [msg], output: "if(a){}" },
		{ code: "Boolean(a != b)", errors: [msg], output: "a != b" },
		{ code: "!!!a", errors: [msg], output: "!a" },
		{ code: "if(!!a) {}", errors: [msg], output: "if(a) {}" },
		{ code: "if(Boolean(a)) {}", errors: [msg], output: "if(a) {}" },
	],
});
