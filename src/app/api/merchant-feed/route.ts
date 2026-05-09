import { NextResponse } from 'next/server';

export async function GET() {
    const baseUrl = 'https://www.otracker.net';
    
    // This is a standard Google Merchant Center RSS Feed format
    const xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>OTracker Platform Plans</title>
    <link>${baseUrl}</link>
    <description>Professional management tools for Tailoring, Retail, and Logistics.</description>
    <item>
      <g:id>otracker_starter</g:id>
      <g:title>OTracker Starter Plan</g:title>
      <g:description>Basic business tracking and order management for small vendors.</g:description>
      <g:link>${baseUrl}/sign-up</g:link>
      <g:image_link>${baseUrl}/og-image.png</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>0.00 GHS</g:price>
      <g:brand>OTracker</g:brand>
      <g:google_product_category>Business &amp; Industrial &gt; Business Operations</g:google_product_category>
    </item>
    <item>
      <g:id>otracker_premium</g:id>
      <g:title>OTracker Premium Dashboard</g:title>
      <g:description>Advanced analytics, team management, and global tracking for scaling brands.</g:description>
      <g:link>${baseUrl}/sign-up</g:link>
      <g:image_link>${baseUrl}/og-image.png</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>0.00 GHS</g:price>
      <g:brand>OTracker</g:brand>
      <g:google_product_category>Business &amp; Industrial &gt; Business Operations</g:google_product_category>
    </item>
  </channel>
</rss>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
