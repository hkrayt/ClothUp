// Copies the version from package.json into the Tauri config and Cargo.toml.
// Android reads package.json directly in android/app/build.gradle.
// Usage: npm version 0.2.0 --no-git-tag-version && npm run sync-version
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))

const confPath = 'src-tauri/tauri.conf.json'
const conf = JSON.parse(readFileSync(confPath, 'utf8'))
conf.version = version
writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n')

const cargoPath = 'src-tauri/Cargo.toml'
const cargo = readFileSync(cargoPath, 'utf8').replace(/^version = ".*"$/m, `version = "${version}"`)
writeFileSync(cargoPath, cargo)

// Keep the lockfile's own entry in step so builds don't leave it modified.
const lockPath = 'src-tauri/Cargo.lock'
const lock = readFileSync(lockPath, 'utf8').replace(/(name = "clothup"\r?\nversion = )".*"/, `$1"${version}"`)
writeFileSync(lockPath, lock)

console.log(`Synced version ${version}`)
