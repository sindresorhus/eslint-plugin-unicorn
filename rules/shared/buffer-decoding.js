import {isMethodCall} from '../ast/index.js';
import {getCommentSafeProblem} from '../utils/index.js';
import {isBufferReference} from './buffer-reference.js';

/**
Get a problem for calling an inherited Uint8Array decoder through Buffer.
*/
export default function getBufferDecodingProblem(node, context, {method, messageId}) {
	if (
		!isMethodCall(node, {
			method,
			computed: false,
			optionalCall: false,
			optionalMember: false,
			allowSpreadElement: true,
		})
		|| !isBufferReference(node.callee.object, context)
	) {
		return;
	}

	const {object} = node.callee;
	return getCommentSafeProblem(context, {
		node: node.callee,
		messageId,
		data: {method},
		fix: fixer => fixer.replaceText(object, 'Uint8Array'),
	}, object);
}
