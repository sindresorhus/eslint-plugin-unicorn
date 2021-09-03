import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const suggestionCase = ({code, suggestions}) => ({
	code,
	errors: [
		{
			messageId: 'preferNumberIsInteger',
			suggestions,
		},
	],
});

test({
	valid: [
		'Number.isInteger(13)',
		'Number.isInteger(13.0)',
		'Number.isInteger(value)',
		'(value^0) === notValue',
		'(value | 0) === notValue',
		'Math.round(value) === notValue',
		'parseInt(value, 10) === notValue',
		'~~value === notValue',
	],
	invalid: [
		suggestionCase({code: 'value % 1 === 0', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'value % 1 == 0', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '(value^0) === value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '(value^0) == value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '(value | 0) === value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '(value | 0) == value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'parseInt(value, 10) === value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'parseInt(value, 10) == value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '_.isInteger(value)', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'lodash.isInteger(value)', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'underscore.isInteger(value)', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'Math.round(value) === value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: 'Math.round(value) == value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '~~value === value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
		suggestionCase({code: '~~value == value', suggestions: [{
			messageId: 'preferNumberIsIntegerSuggestion',
			output: 'Number.isInteger(value)',
		}]}),
	],
});
