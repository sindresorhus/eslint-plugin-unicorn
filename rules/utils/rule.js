import toEslintCreate, {markFunctionWrapped} from '../rule/to-eslint-create.js';

export function checkVueTemplate(unicornCreate, options) {
	const {
		visitScriptBlock,
	} = {
		visitScriptBlock: true,
		...options,
	};

	const create = toEslintCreate(unicornCreate);

	return markFunctionWrapped(context => {
		const listeners = create(context);
		const {parserServices} = context.sourceCode;

		// `vue-eslint-parser`
		if (parserServices?.defineTemplateBodyVisitor) {
			return visitScriptBlock
				? parserServices.defineTemplateBodyVisitor(listeners, listeners)
				: parserServices.defineTemplateBodyVisitor(listeners);
		}

		return listeners;
	});
}

