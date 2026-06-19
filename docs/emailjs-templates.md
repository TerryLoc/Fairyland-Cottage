# EmailJS templates

These templates use the Fairyland Cottage site colours:

- Main: `#ded5cd`
- Secondary: `#f3eae2`
- Text: `#41462d`
- Accent: `#e9ead6`

## Owner notification template

Use this one EmailJS template for both contact messages and purchase
notifications sent to the site owner.

Recommended EmailJS settings:

- Public Key: `7tEy21nwxbWYwxw4E`
- Service ID: `service_dxn2qvd`
- Template ID: `template_dr5jblq`
- To Email: your working receiving email address
- Reply To: `{{email}}`
- Subject: `Fairyland Cottage {{request_type}} - {{title}}`

```html
<div style="margin:0;padding:0;background:#ded5cd;font-family:'Josefin Slab', Georgia, serif;color:#41462d;">
  <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
    <div style="background:#f3eae2;border:1px solid rgba(65,70,45,0.18);border-radius:8px;overflow:hidden;">
      <div style="background:#41462d;padding:20px 24px;text-align:center;">
        <a href="https://fairylandcottage.com/" target="_blank" style="color:#e9ead6;text-decoration:none;">
          <span style="display:block;font-size:28px;line-height:1.1;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
            Fairyland Cottage
          </span>
          <span style="display:block;margin-top:6px;font-size:14px;letter-spacing:0.16em;text-transform:uppercase;color:#e9ead6;">
            {{request_type}}
          </span>
        </a>
      </div>

      <div style="padding:26px 24px;">
        <p style="margin:0 0 18px;font-size:18px;line-height:1.5;">
          A new {{request_type}} has arrived from the website.
        </p>

        <div style="background:#e9ead6;border:1px solid rgba(65,70,45,0.16);border-radius:8px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Name:</strong> {{name}}</p>
          <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Email:</strong> {{email}}</p>
          <p style="margin:0;font-size:16px;line-height:1.5;"><strong>Subject:</strong> {{title}}</p>
        </div>

        <p style="margin:0 0 8px;font-size:15px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
          Message
        </p>
        <div style="background:#fffaf5;border-left:4px solid #41462d;border-radius:6px;padding:18px;margin-bottom:20px;">
          <p style="margin:0;font-size:17px;line-height:1.7;white-space:pre-line;">{{message}}</p>
        </div>

        <p style="margin:0;font-size:14px;line-height:1.6;color:#41462d;">
          Reply directly to this email to respond to the customer.
        </p>
      </div>

      <div style="background:#ded5cd;padding:16px 24px;text-align:center;border-top:1px solid rgba(65,70,45,0.16);">
        <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#41462d;">
          Simple living, slow days, sustainable choices
        </p>
      </div>
    </div>
  </div>
</div>
```

## Buyer confirmation template

Use this EmailJS template for the automatic buyer confirmation after a
successful PayPal purchase.

Recommended EmailJS settings:

- Public Key: `7tEy21nwxbWYwxw4E`
- Service ID: `service_dxn2qvd`
- Template ID: `template_1rjksfb`
- To Email: `{{email}}`
- Reply To: your working support email address
- Subject: `Your Fairyland Cottage order`

```html
<div style="margin:0;padding:0;background:#ded5cd;font-family:'Josefin Slab', Georgia, serif;color:#41462d;">
  <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
    <div style="background:#f3eae2;border:1px solid rgba(65,70,45,0.18);border-radius:8px;overflow:hidden;">
      <div style="background:#41462d;padding:20px 24px;text-align:center;">
        <a href="https://fairylandcottage.com/" target="_blank" style="color:#e9ead6;text-decoration:none;">
          <span style="display:block;font-size:28px;line-height:1.1;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;">
            Fairyland Cottage
          </span>
          <span style="display:block;margin-top:6px;font-size:14px;letter-spacing:0.16em;text-transform:uppercase;color:#e9ead6;">
            Order received
          </span>
        </a>
      </div>

      <div style="padding:26px 24px;">
        <p style="margin:0 0 18px;font-size:18px;line-height:1.6;">Hi {{name}},</p>

        <p style="margin:0 0 18px;font-size:17px;line-height:1.7;">
          Thank you for your Fairyland Cottage purchase. Your payment has been received, and your PDF ebook and audio file will be sent manually within the next 30 minutes.
        </p>

        <div style="background:#e9ead6;border:1px solid rgba(65,70,45,0.16);border-radius:8px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Order reference:</strong> {{order_id}}</p>
          <p style="margin:0 0 10px;font-size:16px;line-height:1.5;"><strong>Email:</strong> {{email}}</p>
          <p style="margin:0;font-size:16px;line-height:1.5;"><strong>Product:</strong> {{title}}</p>
        </div>

        <div style="background:#fffaf5;border-left:4px solid #41462d;border-radius:6px;padding:18px;margin-bottom:20px;">
          <p style="margin:0;font-size:17px;line-height:1.7;">
            The files will be shared through Smash so you can download them safely to your device. If you do not receive the link after 30 minutes, reply to this email and include your order reference.
          </p>
        </div>

        <p style="margin:0;font-size:17px;line-height:1.7;">
          Best regards,<br />
          Fairyland Cottage
        </p>
      </div>

      <div style="background:#ded5cd;padding:16px 24px;text-align:center;border-top:1px solid rgba(65,70,45,0.16);">
        <p style="margin:0;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#41462d;">
          Simple living, slow days, sustainable choices
        </p>
      </div>
    </div>
  </div>
</div>
```
