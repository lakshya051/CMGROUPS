# TWA (Trusted Web Activity) Build Guide

## Prerequisites

1. **Node.js** (v18+)
2. **JDK 11+** (e.g., `brew install openjdk@11`)
3. **Android SDK** (via Android Studio or standalone CLI tools)
4. **Bubblewrap CLI**: `npm install -g @nicolo-ribaudo/bubblewrap` (or `@nicolo-nicolo/nicolo`)

## Step 1: Generate Signing Keystore

```bash
keytool -genkeypair -v \
  -keystore cmgroups-upload-key.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias cmgroups-upload \
  -dname "CN=CMGROUPS, O=CMGROUPS, L=NewDelhi, ST=Delhi, C=IN"
```

**IMPORTANT:** Store the keystore and passwords securely. Never commit to git.

## Step 2: Get SHA-256 Fingerprint

```bash
keytool -list -v -keystore cmgroups-upload-key.jks -alias cmgroups-upload | grep SHA256
```

Copy the fingerprint and update `frontend/public/.well-known/assetlinks.json`.

## Step 3: Initialize Bubblewrap

```bash
bubblewrap init --manifest=https://cmgroups.vercel.app/manifest.webmanifest
```

When prompted, use values from `twa-manifest.json`.

## Step 4: Build the AAB

```bash
bubblewrap build
```

This produces `app-release-bundle.aab` — upload this to Google Play Console.

## Step 5: Update assetlinks.json with Play App Signing

After first upload, Google Play Console shows the "App signing key certificate" SHA-256.
Add this to the `sha256_cert_fingerprints` array in `assetlinks.json` and redeploy.

## Step 6: Verify Digital Asset Links

Visit: https://developers.google.com/digital-asset-links/tools/generator
- Hosting site domain: `cmgroups.vercel.app`
- App package name: `com.cmgroups.shopnow`

Both fingerprints (upload key + Play App Signing) must validate.

## Keystore Security

- Add `*.jks` and `*.keystore` to `.gitignore`
- Use Google Play App Signing (enabled on first upload)
- Back up keystore to 2+ secure locations
- If lost with Play App Signing: request upload key reset via Play Console
- If lost without Play App Signing: app becomes permanently unupdatable
