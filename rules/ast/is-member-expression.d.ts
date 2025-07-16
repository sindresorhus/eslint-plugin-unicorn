import type { Node, MemberExpression } from "estree";

export default function isMemberExpression(
	node: Node,
	options?:
		| {
				property?: string;
				properties?: string[];
				object?: string;
				objects?: string[];
				optional?: boolean;
				computed?: boolean;
		  }
		| string
		| string[]
): node is MemberExpression;
