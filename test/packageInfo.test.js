const {
  getLocalInfo,
  getPublishedInfo,
  isPackageNameScoped
} = require('../src/utils/packageInfo')


tap.test('getPublishedInfo does not get any info for this package', async t => {
  // This package is a Github Action and not published on NPM so expect null
  const packageInfo = await getPublishedInfo()
  t.notOk(packageInfo)
})

tap.test('getLocalInfo gets name of this package', t => {
  const packageInfo = getLocalInfo()
  t.equal(packageInfo.name, 'optic-release-automation-action')
})

tap.test('isPackageNameScoped treats scoped package names as scoped', t => {
  t.ok(isPackageNameScoped('@nearform/package'))
  t.ok(isPackageNameScoped('@nearform/some-package'))
  t.ok(isPackageNameScoped('@some-scope/package'))
  t.ok(isPackageNameScoped('@some-scope/some-package'))
})

tap.test('isPackageNameScoped treats unscoped package names as unscoped', t => {
  t.notOk(isPackageNameScoped('nearform-some-package'))
  t.notOk(isPackageNameScoped('nearform/@some-package'))
  t.notOk(isPackageNameScoped('@some-scope-package'))
  t.notOk(isPackageNameScoped('some-scope/some-package'))
})

