'use strict'

const { execWithOutput } = require('./execWithOutput')
const { logInfo } = require('../log')

async function allowNpmPublish(version) {
  // We need to check if the package was already published. This can happen if
  // the action was already executed before, but it failed in its last step
  // (GH release).
  let packageName = null
  try {
    const packageInfo = await execWithOutput('npm', ['view', '--json'])
    packageName = packageInfo ? JSON.parse(packageInfo).name : null
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
  }

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

async function publishToNpm({
  npmToken,
  opticToken,
  opticUrl,
  npmTag,
  version,
  provenance,
}) {
  const npmVersion = await execWithOutput('npm -v')
  logInfo(`>>>>>>>>>> npmVersion: ${npmVersion}`)

  await execWithOutput('npm', [
    'config',
    'set',
    `//registry.npmjs.org/:_authToken=${npmToken}`,
  ])

  const options = {}
  const flags = ['--tag', npmTag]
  if (provenance) {
    // @TODO - if --provenance aborts NPM <9.5, check version here, and ignore/warn?
    flags.push('--provenance')

    logInfo(Object.keys(process.env))

    // Provenence needs access to a lot of Github Actions env vars,
    // but we shouldn't just copy all, to ensure we don't leak secrets.
    const envVarsToCopy = ['GITHUB_ACTIONS']

    options.env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => envVarsToCopy.includes(key))
    )
  }

  if (await allowNpmPublish(version)) {
    await execWithOutput('npm', ['pack', '--dry-run'])
    if (opticToken) {
      logInfo(
        `**<<< OPTIC CURL COMMAND ${[
          'curl',
          '-s',
          `${opticUrl}${opticToken}`,
        ].join(' ')} >>>**`
      )
      const otp = await execWithOutput('curl', [
        '-s',
        `${opticUrl}${opticToken}`,
      ])
      logInfo(`**<<< OTP RESULT: "${otp}" >>>**`)
      await execWithOutput('npm', ['publish', '--otp', otp, ...flags], options)
    } else {
      logInfo('**<<< NO OPTIC TOKEN >>>**')
      await execWithOutput('npm', ['publish', ...flags], options)
    }
  }
}

exports.publishToNpm = publishToNpm
