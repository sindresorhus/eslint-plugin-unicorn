/**
Check for JSDoc type annotations or TypeScript checking pragmas anywhere in the file.

@param {import('eslint').Rule.RuleContext} context
@returns {boolean}
*/
export default function hasJavaScriptTypeAnnotations(context) {
	return context.sourceCode.getAllComments().some(comment =>
		/^\s*(?:[*/]\s*)?@ts-check\b/iu.test(comment.value)
		|| (comment.type === 'Block'
			&& comment.value.trimStart().startsWith('*')
			&& /@(?:param|arg|argument|type|returns?|template|this|overload|satisfies|constructor|class|implements|extends|augments)\b/u.test(comment.value)));
}
