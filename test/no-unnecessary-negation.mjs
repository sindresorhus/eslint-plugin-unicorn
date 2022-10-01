import {getTester} from './utils/test.mjs';

const {test, rule, ruleId} = getTester(import.meta);
const message = rule.meta.messages[ruleId];

test({
	valid: ['!!a;', 'Boolean(a);', '!a;'],
	invalid: [
		{code: '!(a != b)', errors: [message], output: 'a == b'},
		{code: '!(a !== b)', errors: [message], output: 'a === b'},
		{code: '!(a == b)', errors: [message], output: 'a != b'},
		{code: '!(a === b)', errors: [message], output: 'a !== b'},
		{code: '!Boolean(a)', errors: [message], output: '!(a)'},
		{code: '!Boolean(!a)', errors: [message], output: '!!a'},
		{code: 'if(!Boolean(!a)){}', errors: [message], output: 'if(a){}'},
		{code: 'Boolean(a != b)', errors: [message], output: 'a != b'},
		{code: '!!!a', errors: [message], output: '!a'},
		{code: 'if(!!a) {}', errors: [message], output: 'if(a) {}'},
		{code: 'if(Boolean(a)) {}', errors: [message], output: 'if(a) {}'},
	],
});
