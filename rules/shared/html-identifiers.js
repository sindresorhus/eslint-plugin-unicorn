import {decodeHTMLAttribute} from 'entities';
import {toLocation} from '../utils/index.js';

/**
Visit decoded HTML IDs and individual class names. Entity-containing values are reported as a whole because decoded offsets do not match source offsets.
*/
export default function onHtmlIdentifier(context, listener) {
	const templateDelimiters = ['{{', '{%', '<%', '${', ...Object.keys(context.languageOptions?.templateEngineSyntax ?? {})];
	context.on('Attribute', function * ({key, value: node, startWrapper}) {
		const attributeName = key.value.toLowerCase();
		if (!['id', 'class'].includes(attributeName) || !node || node.parts.length > 0) {
			return;
		}

		let range = context.sourceCode.getRange(node);
		const raw = startWrapper ? node.value : context.sourceCode.text.slice(range[0]).match(/^[^\t\n\f\r "'<>`]+/u)?.[0];
		if (!raw || templateDelimiters.some(delimiter => raw.includes(delimiter))) {
			return;
		}

		const name = decodeHTMLAttribute(raw);
		if (!name) {
			return;
		}

		range = [range[0], range[0] + raw.length];
		if (attributeName === 'id') {
			yield listener({node, name, location: toLocation(range, context)});
			return;
		}

		for (const match of name.matchAll(/[^\t\n\f\r ]+/g)) {
			const tokenRange = name === raw
				? [range[0] + match.index, range[0] + match.index + match[0].length]
				: range;
			yield listener({node, name: match[0], location: toLocation(tokenRange, context)});
		}
	});
}
