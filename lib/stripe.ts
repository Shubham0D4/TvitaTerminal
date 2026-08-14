import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key_for_build', {
  apiVersion: '2026-01-28' as any,
  appInfo: {
    name: 'Tvita Agency Management Platform',
    version: '1.0.0',
  },
})
