# Legacy payment and download flow

The files in `archive/legacy-payment-download/` belong to the older automatic
download setup and are not connected to the active Netlify sales flow.

The old private file folder, `private_downloads/`, is ignored and is not part of
the Netlify build.

The active Netlify sales flow is:

1. `/create_order.php` rewrites to `/.netlify/functions/create-paypal-order`.
2. PayPal redirects to `/success.php`.
3. `/success.php` rewrites to `/.netlify/functions/paypal-success`.
4. The success function captures the PayPal order.
5. The success function sends:
   - the seller notification through EmailJS template `template_dr5jblq`
   - the buyer confirmation through EmailJS template `template_1rjksfb`
6. Files are sent manually through Smash.

No live Netlify route streams or generates automatic download links.
