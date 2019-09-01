module.exports.isImportDeclaration = node => node.init ?
  astUtils.isStaticRequire(node.init) :
  node.parent.type === 'ImportDeclaration';
