'use strict'
const fs = require('fs')
const { execWithOutput } = require('../utils/execWithOutput')

/**
 * Get info from the registry about a package that is already published.
 * 
 * Returns null if not published.
 */
async function getPublishedInfo() {
  try {
    const packageInfo = await execWithOutput('npm', ['view', '--json'])
    return packageInfo ? JSON.parse(packageInfo) : null
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
    return null
  }
}

/**
 * Get info from the local package.json file.
 * 
 * @TODO test with workspaces, monorepos etc.
 */
function getLocalInfo() {
  const packageJsonFile = fs.readFileSync('./package.json', 'utf8')
  const packageInfo = JSON.parse(packageJsonFile)

  return packageInfo
}

/**
 * Checks if an NPM package name has a scope ('@some-scope/package-name')
 * and is therefore capable of being published privately. 
 * 
 * @param {string} packageName 
 * @returns {boolean}
 */
function isPackageNameScoped(packageName) {
  return packageName.match(/^@.+\/./)
}

module.exports = {
  getLocalInfo,
  getPublishedInfo,
  isPackageNameScoped,
}
