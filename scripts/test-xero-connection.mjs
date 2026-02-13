#!/usr/bin/env node
/**
 * Test Xero connection - run: node scripts/test-xero-connection.mjs
 * Loads .env.local and verifies token + org access.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const env = readFileSync(envPath, 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.trim().startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=')
    if (key) acc[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '')
    return acc
  }, {})

const CLIENT_ID = env.XERO_CLIENT_ID
const CLIENT_SECRET = env.XERO_CLIENT_SECRET
const TENANT_ID = env.XERO_TENANT_ID

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET in .env.local')
  process.exit(1)
}

console.log('Testing Xero connection...\n')

// 1. Get token
const tokenRes = await fetch('https://identity.xero.com/connect/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'accounting.transactions accounting.settings accounting.contacts',
  }),
})

if (!tokenRes.ok) {
  console.error('Token request failed:', tokenRes.status, await tokenRes.text())
  process.exit(1)
}

const tokenData = await tokenRes.json()
console.log('✓ Access token obtained (expires in', tokenData.expires_in, 's)')

// 2. Get Organisation (proves API access)
const headers = {
  Authorization: `Bearer ${tokenData.access_token}`,
  Accept: 'application/json',
}
if (TENANT_ID) headers['xero-tenant-id'] = TENANT_ID

const orgRes = await fetch('https://api.xero.com/api.xro/2.0/Organisation', { headers })
if (!orgRes.ok) {
  console.error('Organisation request failed:', orgRes.status, await orgRes.text())
  process.exit(1)
}

const orgData = await orgRes.json()
const org = orgData.Organisations?.[0]
if (org) {
  console.log('✓ Organisation:', org.Name)
  console.log('  OrganisationID:', org.OrganisationID)
}
console.log('\n✅ Xero connection working.')
process.exit(0)
