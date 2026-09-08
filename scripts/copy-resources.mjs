import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(rootDir, 'resources')
const targetDir = join(rootDir, 'out', 'resources')

if (!existsSync(sourceDir)) {
  console.warn('resources/ folder not found, skipping copy.')
  process.exit(0)
}

mkdirSync(targetDir, { recursive: true })

for (const entry of readdirSync(sourceDir)) {
  if (!entry.endsWith('.png')) {
    continue
  }

  cpSync(join(sourceDir, entry), join(targetDir, entry), { force: true })
}

console.log(`Copied PNG icons from resources/ to out/resources/`)
