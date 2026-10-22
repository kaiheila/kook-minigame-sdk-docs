import assert from 'node:assert/strict'

const rules = [
  ['default SDK import', /\bimport\s+createKookClient\s*(?:,|from\b)/],
  ['unreleased package identifier', /(?:@|%40)kookapp(?:\/|%2f)/i],
  ['local path', /(?:[a-z]:[\\/]+Users[\\/]|\/(?:Users|home)\/[^\s/]+\/|file:\/\/)/i],
  ['internal service URL', /https?:\/\/(?:[\w-]+\.)*(?:wiki|jira|confluence|jenkins|internal|intranet)[.-]/i],
  ['private key', /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['cloud credential', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['chat credential', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['signed token', /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ['registry credential', /(?:_authToken|_auth)\s*=\s*(?!\$\{)[A-Za-z0-9_+/=-]{12,}/],
  [
    'literal credential',
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|authorization)\s*[:=]\s*['"][A-Za-z0-9_+/=.-]{12,}['"]/i,
  ],
]

export function assertPublicText(text, file) {
  for (const [label, pattern] of rules) {
    assert(!pattern.test(text), `Review required: ${label} in ${file}`)
  }
}
