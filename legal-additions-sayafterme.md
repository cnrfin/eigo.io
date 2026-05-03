# Say After Me — additions for eigo.io legal pages

Two sections to fold into the existing eigo.io pages. The Apple-mandated
auto-renewal language under Terms is required *verbatim* — Apple App Review
will reject submissions that omit or paraphrase it.

**Disclaimer:** these are starting drafts for review, not final legal copy.
Have a UK consumer-protection / GDPR-aware solicitor (or comparable) sign off
before publishing.

---

## Add to `/privacy` — new section

> ### Say After Me (iOS app)
>
> Say After Me is an iOS language-practice app published under the eigo.io
> umbrella. It is anonymous: there is no account, no signup, and no email
> address required to use it. The app collects only what is strictly needed
> to deliver the service, as described below.
>
> **Subscriptions.** When you subscribe to Pro through the App Store, payment
> is handled entirely by Apple. We never see your card details or Apple ID.
> Subscription state (whether you are on Free, Standard, or Pro and when the
> subscription expires) is managed by RevenueCat, a third-party service.
> RevenueCat assigns each device an anonymous identifier and exchanges
> entitlement information with Apple's StoreKit. We use this identifier
> server-side to verify that you are entitled to use the AI generation
> feature. RevenueCat's privacy policy: https://www.revenuecat.com/privacy
>
> **AI phrase generation.** When you use the AI generation feature (Pro only):
>
>   - The text you type is sent to OpenAI for translation. OpenAI receives
>     only the phrase itself; no identifiers are attached. OpenAI's policy:
>     https://openai.com/policies/privacy-policy
>   - The translated phrase is sent to ElevenLabs for text-to-speech audio
>     generation. ElevenLabs receives only the translated text and a voice
>     selection. ElevenLabs' policy: https://elevenlabs.io/privacy
>   - A monthly usage counter is stored in our Supabase database, keyed to
>     your anonymous RevenueCat identifier, so we can enforce the
>     100-generations-per-month Pro cap fairly.
>
> **On-device data.** All phrases you save to your library, all generated
> audio files, and all app preferences (theme, voices, languages, queues)
> live on your device only. They are not uploaded to any server. Deleting
> the app removes them.
>
> **No analytics, no tracking.** Say After Me does not collect usage analytics,
> behavioural data, or device fingerprints. There is no advertising SDK.
>
> **Your rights.** Because we do not link any data to a real-world identity,
> there is generally no personal data tied to you to access, correct, or
> delete. If you would like us to clear the usage counter associated with
> your anonymous RevenueCat identifier, contact connor@eigo.io with the
> identifier (visible in the app's Settings if needed) and we will do so.
>
> **Data location.** Supabase data is stored in the EU. RevenueCat, OpenAI,
> and ElevenLabs operate from the United States; your phrase text is
> transmitted to them solely for the immediate purpose of generating a
> translation and audio.
>
> **Children.** Say After Me is a general-audience app and does not knowingly
> collect data from children under 13.
>
> **Contact.** Privacy questions: connor@eigo.io.

---

## Add to `/terms` — new section

> ### Say After Me Subscriptions (iOS app)
>
> Say After Me offers two paid tiers, sold as in-app subscriptions through
> the App Store:
>
>   - **Standard** — £2.99 / month or £19.99 one-time lifetime. Unlocks the
>     full prebuilt phrase deck, full pronunciation drills, unlimited saved
>     queues, unlimited stored sessions, and unlimited favourites.
>   - **Pro** — £9.99 / month or £69.99 / year. Includes everything in
>     Standard, plus AI-powered phrase generation (limited to 100 generations
>     per calendar month).
>
> **Apple's required auto-renewal disclosure:** Payment will be charged to
> your Apple ID account at confirmation of purchase. Subscriptions
> automatically renew unless auto-renew is turned off at least 24 hours
> before the end of the current period. Your account will be charged for
> renewal within 24 hours prior to the end of the current period at the
> same price unless changed. Subscriptions may be managed and auto-renewal
> turned off in your Apple ID Account Settings after purchase. No
> cancellation of the current subscription is allowed during the active
> subscription period.
>
> **How to cancel.** Open the iOS Settings app → tap your name at the top →
> Subscriptions → Say After Me → Cancel Subscription. Cancellation takes
> effect at the end of the current billing period; you keep access until
> then. The "Manage Subscription" row in the app's Settings deep-links to
> the same place.
>
> **Refunds.** Refund requests for App Store purchases are handled by Apple,
> not by us, at https://reportaproblem.apple.com.
>
> **Generation cap.** The Pro tier provides 100 AI generations per UTC
> calendar month. Unused generations do not roll over. The counter resets
> at 00:00 UTC on the first day of each calendar month. Failed generations
> (translation or audio synthesis errors) are automatically refunded back
> into the counter.
>
> **Acceptable use.** Generated audio is provided for personal language
> learning and shadowing practice only. You agree not to use the service
> to generate hateful, deceptive, or sexually explicit content, or content
> intended to impersonate real individuals.
>
> **Service availability.** AI generation depends on third-party providers
> (OpenAI, ElevenLabs) and is provided on a best-effort basis. Brief
> outages may occur. Prebuilt deck audio works fully offline and is not
> affected.
>
> **Changes.** We may update the AI generation cap, supported voices, or
> supported languages over time. Material changes will be communicated in
> the app's release notes on the App Store.
>
> **Contact.** Subscription questions: connor@eigo.io.
