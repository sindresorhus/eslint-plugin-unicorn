import isDirectEvalCall from '../ast/is-direct-eval-call.js';
import getVisitorChildNodes from './get-visitor-child-nodes.js';

const isNewTarget = node =>
	node.type === 'MetaProperty'
	&& node.meta.name === 'new'
	&& node.property.name === 'target';

const isArgumentsIdentifier = node =>
	node.type === 'Identifier'
	&& node.name === 'arguments';

const isUnsafeArrowConversionNode = node =>
	node.type === 'ThisExpression'
	|| node.type === 'Super'
	|| isNewTarget(node)
	|| isArgumentsIdentifier(node)
	|| isDirectEvalCall(node);

export default function hasUnsafeArrowConversionReference(node, visitorKeys) {
	if (isUnsafeArrowConversionNode(node)) {
		return true;
	}

	return getVisitorChildNodes(node, visitorKeys).some(child => hasUnsafeArrowConversionReference(child, visitorKeys));
}
