# Legacy payment and download flow

The files in `archive/legacy-payment-download/` belong to the older automatic
download setup and are not connected to the active Netlify sales flow.

The old private file folder, `private_downloads/`, is ignored and is not part of
the Netlify build.

The active Netlify sales flow is:

1. `shop.html` renders the PayPal Hosted Button.
2. PayPal processes the payment in the hosted checkout.
3. Files are sent manually through Smash.

No live Netlify route streams files, generates automatic download links, or
uses the archived PHP download flow. The custom Netlify checkout functions are
not linked from the live shop page.
