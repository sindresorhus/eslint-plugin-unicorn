'use strict';

const isMethodNamed = ({type, callee}, name) => {
	return (
		type === 'CallExpression' &&
		callee.type === 'MemberExpression' &&
		callee.property.type === 'Identifier' &&
		callee.property.name === name
	);
};

module.exports = isMethodNamed;
