/**
 * Copy Stripe products, prices, and metadata from live → test mode.
 *
 * Usage:
 *   node scripts/copy-stripe-to-test.mjs
 *
 * Requires both live and test secret keys in .env.local:
 *   STRIPE_SECRET_KEY        (live sk_live_...)
 *   STRIPE_TEST_SECRET_KEY   (test sk_test_...)
 *
 * Output:
 *   Prints a new .env block with test price IDs you can paste into .env.local
 */

import Stripe from 'stripe'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

const liveKey = env.STRIPE_SECRET_KEY
const testKey = env.STRIPE_TEST_SECRET_KEY

if (!liveKey?.startsWith('sk_live_')) {
  console.error('❌ STRIPE_SECRET_KEY must be a live key (sk_live_...)')
  process.exit(1)
}
if (!testKey?.startsWith('sk_test_')) {
  console.error('❌ STRIPE_TEST_SECRET_KEY not found in .env.local')
  console.error('   Add it: STRIPE_TEST_SECRET_KEY=sk_test_...')
  console.error('   (Find it in Stripe Dashboard → Test mode → Developers → API keys)')
  process.exit(1)
}

const live = new Stripe(liveKey)
const test = new Stripe(testKey)

const PRICE_ENV_KEYS = [
  'STRIPE_PRICE_LIGHT_MONTHLY_TRIAL',
  'STRIPE_PRICE_LIGHT_MONTHLY_FULL',
  'STRIPE_PRICE_LIGHT_YEARLY_TRIAL',
  'STRIPE_PRICE_LIGHT_YEARLY_FULL',
  'STRIPE_PRICE_STANDARD_MONTHLY_TRIAL',
  'STRIPE_PRICE_STANDARD_MONTHLY_FULL',
  'STRIPE_PRICE_STANDARD_YEARLY_TRIAL',
  'STRIPE_PRICE_STANDARD_YEARLY_FULL',
]

async function main() {
  console.log('📦 Fetching live products and prices...\n')

  const liveProducts = await live.products.list({ active: true, limit: 100 })
  console.log(`   Found ${liveProducts.data.length} live products`)

  const livePrices = await live.prices.list({ active: true, limit: 100, expand: ['data.product'] })
  console.log(`   Found ${livePrices.data.length} live prices\n`)

  // Create products in test mode
  const productMap = {} // live product ID → test product ID

  for (const prod of liveProducts.data) {
    console.log(`🔄 Creating test product: ${prod.name}`)
    const testProd = await test.products.create({
      name: prod.name,
      description: prod.description || undefined,
      metadata: prod.metadata,
    })
    productMap[prod.id] = testProd.id
    console.log(`   ✅ ${prod.id} → ${testProd.id}`)
  }

  console.log('')

  // Create prices in test mode
  const priceMap = {} // live price ID → test price ID

  for (const price of livePrices.data) {
    const liveProdId = typeof price.product === 'string' ? price.product : price.product.id
    const testProdId = productMap[liveProdId]

    if (!testProdId) {
      console.log(`⚠️  Skipping price ${price.id} — product ${liveProdId} not found in test`)
      continue
    }

    const prodName = typeof price.product === 'string' ? liveProdId : price.product.name
    const interval = price.recurring?.interval || 'one-time'
    console.log(`🔄 Creating test price: ${prodName} — ¥${price.unit_amount} / ${interval}`)

    const createParams = {
      product: testProdId,
      currency: price.currency,
      unit_amount: price.unit_amount,
      metadata: price.metadata,
    }

    if (price.recurring) {
      createParams.recurring = {
        interval: price.recurring.interval,
        interval_count: price.recurring.interval_count,
      }
    }

    const testPrice = await test.prices.create(createParams)
    priceMap[price.id] = testPrice.id
    console.log(`   ✅ ${price.id} → ${testPrice.id}`)
  }

  // Print the env block
  console.log('\n' + '='.repeat(60))
  console.log('📋 TEST MODE ENV VARS — paste these into .env.local:')
  console.log('='.repeat(60) + '\n')

  for (const key of PRICE_ENV_KEYS) {
    const liveId = env[key]
    const testId = liveId ? priceMap[liveId] : undefined
    if (testId) {
      console.log(`${key}=${testId}`)
    } else {
      console.log(`# ${key}= (no matching test price found for ${liveId || 'MISSING'})`)
    }
  }

  console.log('\n✅ Done! Now do these steps:')
  console.log('   1. Copy the price IDs above into .env.local (replacing the live ones)')
  console.log('   2. Swap STRIPE_SECRET_KEY to your sk_test_ key')
  console.log('   3. Swap STRIPE_PUBLISHABLE_KEY to your pk_test_ key')
  console.log('   4. Update STRIPE_WEBHOOK_SECRET for your test webhook')
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
