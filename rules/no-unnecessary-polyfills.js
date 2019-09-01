'use strict'
const semver = require('semver')
const readPkgUp = require('read-pkg-up')
const compatTable = require('@babel/preset-env/data/built-ins.json')
const getDocsUrl = require('./utils/get-docs-url')
const upperfirst = require('lodash.upperfirst')
const camelcase = require('lodash.camelcase')

function isRequireCall(node) {
  return node.callee.name === 'require'
}

function getVersionFromPkg(cwd) {
  const pkg = readPkgUp.sync({ cwd })
  return pkg && pkg.pkg.engines && pkg.pkg.engines.node
}

function isValidVersion(version) {
  return /^[\d.]+$/.test(version.trim())
}

const polyfills = {
  'es6.promise': [ 'promise-polyfill' ],
  'es7.promise.finally': [ 'p-finally' ],
}

const polyfillMap = Object.keys(compatTable).reduce((current, name) => {
  let [ ecmaVersion, constructorName, methodName = '' ] = name.split('.')

  constructorName = `(${constructorName}|${camelcase(constructorName)})`
  methodName = `(${methodName}|${camelcase(methodName)})`

  const prefixes = '(mdn-polyfills|polyfill-|core-js(-pure)?/features/|)'
  const suffixes = '(-polyfill|)'
  const delimiter = '(\\.|-|\.prototype\.|/|)'

  const polyfill = polyfills[ name ]

  current.push({
    feature: name,
    polyfillRegex: new RegExp(`^${prefixes}(` + `${ecmaVersion}${delimiter}${constructorName}${delimiter}${methodName}` + '|' + `${constructorName}${delimiter}${methodName}` + '|' + `${ecmaVersion}${delimiter}${constructorName}` + '|' + methodName +  '|' + (polyfill ? `(${polyfill.join('|')})` : '') + `)${suffixes}$`, 'i'),
  })

  return current
}, [])

function formatErrorMessage(featureName) {
  const [ _ecmaVersion, namespace, method ] = featureName.split('.')

  return `Use the built-in \`${method ? `${upperfirst(namespace)}#${camelcase(method)}` : `${upperfirst(namespace)}`}\`.`
}

function processRule(context, node, moduleName, targetVersion) {
  const polyfill = polyfillMap.find(({ polyfillRegex }) => polyfillRegex.test(moduleName))

  if (polyfill) {
    const feature = compatTable[ polyfill.feature ]
    const supportedNodeVersion = semver.valid(semver.coerce(feature.node))
    const validRangeTargetVersion = semver.validRange(targetVersion).replace('=', '')
    const validTargetVersion = isValidVersion(targetVersion) && semver.valid(semver.coerce(targetVersion))

    if (validTargetVersion) {
      if (semver.lte(supportedNodeVersion, validTargetVersion)) {
        context.report({
          node,
          message: formatErrorMessage(polyfill.feature),
        })
      }
    } else if (semver.ltr(supportedNodeVersion, validRangeTargetVersion)) {
      context.report({
        node,
        message: formatErrorMessage(polyfill.feature),
      })
    }
  }
}

const create = context => {
  const options = context.options[ 0 ]
  const targetVersion = (options && options.targetVersion) || getVersionFromPkg(context.getFilename())

  if (!targetVersion) {
    return {}
  }

  return {
    CallExpression: node => {
      if (isRequireCall(node)) {
        const moduleName = node.arguments[ 0 ].value
        processRule(context, node, moduleName, targetVersion)
      }
    },
    ImportDeclaration: node => processRule(context, node, node.source.value, targetVersion),
  }
}

const schema = [ {
  type: 'object',
  properties: {
    targetVersion: {
      type: 'string',
    },
  },
} ]

module.exports = {
  create,
  meta: {
    schema,
    type: 'suggestion',
    docs: {
      url: getDocsUrl(__filename),
    },
  },
}
