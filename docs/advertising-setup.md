# AdSense activation

Advertising support is implemented but disabled by default. It does not create
an AdSense account, constitute Google approval, or earn money while disabled.

1. The operator creates AdSense using the intended Google account, accepts
   Google's terms personally, and supplies the requested payee/identity details.
2. Add `resumebuilder.shop` to AdSense. Copy the actual publisher identifier
   into Railway `ADSENSE_CLIENT` (`ca-pub-` followed by 16 digits). Deploy.
   Public content pages now carry Google's verification meta tag; `/ads.txt`
   publishes that publisher's authorized seller entry. No ad requests run yet.
3. Verify ownership in AdSense using the meta-tag or ads.txt method and request
   Google's site review. Search Console verification is separate.
4. Configure and publish Google's Privacy & messaging consent/opt-out messages,
   including a certified CMP for covered traffic. Review the privacy notice
   against the actual ad and consent settings. Do not enable ads before this.
5. Once Google approves the site, create a responsive display ad unit. Set
   `ADSENSE_SLOT` to its 10-digit ID, `ADS_CONSENT_READY=true`, and
   `ADS_ENABLED=true`. Keep Auto ads disabled to preserve placement control.
6. Verify in the browser that Google's consent message works, preferences can
   be reopened/withdrawn, the single labeled placement renders on public
   content pages, and no advertising script loads on private routes. Check
   Google's console for policy, authorization or unfilled-ad warnings.

The single placement follows public main content. No ad scripts are included
on the editor, portal, admin, sample, contact, legal or API pages, or requests
containing query parameters. The browser loader also skips URLs with fragments
and browsers exposing Global Privacy Control. This exclusion is additional
defense and does not replace the certified CMP. `ADS_CONSENT_READY` records
operator completion; it is not an automatic consent compliance check.

Set `ADS_ENABLED=false` to stop new ad loads immediately on the next deployment.
Revenue and payout statuses must be checked in AdSense; the existing sales
analytics report does not include AdSense income. Never click your own ads or
encourage visitors to click ads to support the business.
