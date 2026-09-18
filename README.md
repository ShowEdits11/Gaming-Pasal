# Gaming Pasal Referral Website

A free GitHub Pages frontend using Supabase for accounts and referral tracking.

## Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. In Supabase Authentication, configure Email provider and your site URL.
4. Copy your Project URL and anon/public key.
5. Put them in `config.js`.
6. Upload all files to a public GitHub repository.
7. Enable GitHub Pages from Settings → Pages → Deploy from branch.
8. Open the published website and register a test account.

## Referral flow

`?ref=GPXXXXXXX` is saved in the browser.

When a new customer registers, the database records:
- referrer
- referred customer
- referral status = pending

After the new customer's qualifying purchase is verified by your trusted order/admin system, call the protected `complete_referral(referred_user_id)` function.

That changes the referral to completed and enables the referrer's 5% reward.

## Important

This repository does NOT contain payment verification. A static GitHub website cannot safely decide that a payment was made. Your order system/admin process must verify the purchase before completing a referral.

Do not put Supabase service-role/secret keys in `config.js`.
