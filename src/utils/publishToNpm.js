'use strict'
const { logInfo } = require('../log')

const { execWithOutput } = require('./execWithOutput')
async function getPackageName() {
  let packageName = null
  try {
    const packageInfo = await execWithOutput('npm', ['view', '--json'])
    packageName = packageInfo ? JSON.parse(packageInfo).name : null
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
  }

  return packageName
}
async function allowNpmPublish(version) {
  // We need to check if the package was already published. This can happen if
  // the action was already executed before, but it failed in its last step
  // (GH release).

  const packageName = await getPackageName()
  // Package has not been published before
  if (!packageName) {
    return true
  }

  // NPM only looks into the remote registry when we pass an explicit
  // package name & version, so we don't have to fear that it reads the
  // info from the "local" package.json file.
  let packageVersionInfo

  try {
    // npm < v8.13.0 returns empty output, newer versions throw a E404
    // We handle both and consider them as package version not existing
    packageVersionInfo = await execWithOutput('npm', [
      'view',
      `${packageName}@${version}`,
    ])
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
  }

  return !packageVersionInfo
}
/**
 * 
 * @param {
 *  npmToken,
    opticToken,
    opticUrl,
    npmTag,
    version,
    provenance: boolean
    hasAccess: boolean
 * }  
 */
async function publishToNpm({
  npmToken,
  opticToken,
  opticUrl,
  npmTag,
  version,
  provenance,
  hasAccess,
}) {
  await execWithOutput('npm', [
    'config',
    'set',
    `//registry.npmjs.org/:_authToken=${npmToken}`,
  ])

  const packageName = await getPackageName()

  const flags = ['--tag', npmTag]
  // new packages and private packages disable provenance, they need to be public
  if (hasAccess && provenance) {
    flags.push('--provenance', '--access', 'public')
  }

  if (await allowNpmPublish(version)) {
    await execWithOutput('npm', ['pack', '--dry-run'])
    if (opticToken) {
      const otp = await execWithOutput('curl', [
        '-s',
        `${opticUrl}${opticToken}`,
      ])

      logInfo(`PUBLISH has otp WITH >>>>>>>>> ${['npm', 'publish', '--otp', otp, ...flags].join(' ')}`)
      await execWithOutput('npm', ['publish', '--otp', otp, ...flags])
    } else {
      logInfo(`PUBLISH no otp WITH >>>>>>>>> ${['npm', 'publish', ...flags].join(' ')}`)
      await execWithOutput('npm', ['publish', ...flags])
    }
  }
}

exports.publishToNpm = publishToNpm
