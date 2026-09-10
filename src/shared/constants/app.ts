import packageJson from '../../../package.json'

export const APP_NAME = 'MM WA Telegram Multiple Accounts'

export const APP_USER_MODEL_ID = 'com.jbs.mm-wa-telegram-multiple-accounts'

export const APP_VERSION = packageJson.version

function formatVersionLabel(version: string): string {
  const betaMatch = version.match(/^(.+)-beta(?:\.(\d+))?$/i)
  if (betaMatch) {
    const build = betaMatch[2] ? ` ${betaMatch[2]}` : ''
    return `${betaMatch[1]} Beta${build}`
  }

  if (/beta/i.test(version)) {
    return version.replace(/-beta/i, ' Beta').replace(/beta/i, 'Beta')
  }

  return version
}

export const APP_VERSION_LABEL = formatVersionLabel(APP_VERSION)

export const APP_WINDOW_TITLE = `${APP_NAME} - ${APP_VERSION_LABEL}`

export const APP_IS_BETA = /beta/i.test(APP_VERSION)

export const GITHUB_REPO_URL = 'https://github.com/hardawebpro/mm-wa-telegram-multiple-accounts'

export const GITHUB_BUG_REPORT_URL = `${GITHUB_REPO_URL}/issues/new`
