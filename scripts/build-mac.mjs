import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses'
import { packager } from '@electron/packager'
import { build, loadEnv } from 'vite'

if (process.platform !== 'darwin') throw new Error('Build the macOS app on a Mac.')

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const scratch = await mkdtemp(join(tmpdir(), 'my-bookshelf-mac-'))
const source = join(scratch, 'source')
const output = process.env.BOOKSHELF_MAC_OUTPUT_DIR
  ? resolve(process.env.BOOKSHELF_MAC_OUTPUT_DIR)
  : join(root, 'release', 'mac')
const name = 'My Bookshelf'
const fonts = ['cormorant-garamond', 'jetbrains-mono']

try {
  await cp(join(root, 'desktop'), source, { recursive: true })
  const web = join(source, 'web')
  await build({ root, mode: 'mac', build: { outDir: web, emptyOutDir: true } })

  const supabaseUrl = loadEnv('mac', root).VITE_SUPABASE_URL?.trim()
  const authOrigin = /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/?$/i.test(supabaseUrl ?? '')
    ? new URL(supabaseUrl).origin
    : ''
  await writeFile(join(source, 'config.json'), JSON.stringify({ authOrigin }))
  for (const font of fonts) {
    await copyFile(require.resolve(`@fontsource-variable/${font}/LICENSE`), join(source, `${font}-LICENSE.txt`))
  }
  const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'my-bookshelf', version, main: 'main.cjs' }))

  const iconset = join(scratch, 'Bookshelf.iconset')
  await mkdir(iconset)
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2]) {
      const icon = join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`)
      execFileSync('sips', ['-z', String(size * scale), String(size * scale),
        join(root, 'public', 'icons', 'bookshelf-512.png'), '--out', icon])
    }
  }
  const icon = join(scratch, 'Bookshelf.icns')
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icon])

  const [bundle] = await packager({
    dir: source, out: output, name, platform: 'darwin', arch: process.arch,
    electronVersion: require('electron/package.json').version,
    appBundleId: 'com.sissighn.my-bookshelf', icon, asar: true, prune: false, overwrite: true,
  })
  const app = join(bundle, `${name}.app`)
  await flipFuses(app, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  })
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app])
  execFileSync('codesign', ['--verify', '--deep', '--strict', app])
  console.log(`\nmacOS app: ${app}`)
} finally {
  await rm(scratch, { recursive: true, force: true })
}
