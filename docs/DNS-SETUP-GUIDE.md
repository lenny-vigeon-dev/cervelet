# DNS Configuration Guide for pixelhub.now

## Step 1: Domain Verification in Google Search Console

Before configuring Cloud Run, you must prove that you own the domain.

### 1.1 Go to Google Search Console
- URL: https://search.google.com/search-console
- Sign in with your Google account linked to the GCP project

### 1.2 Add a Property
- Click "Add a property"
- Select "Domain" (not "URL prefix")
- Enter: `pixelhub.now`

### 1.3 Verify via DNS
Google will provide you with a TXT record to add. For example:
```
Type: TXT
Name: @ (or pixelhub.now)
Value: google-site-verification=xxxxxxxxxxxxxxxxx
```

**Where to add this record?**
- At your registrar (where you purchased pixelhub.now)
- Common registrar examples:
  - **Google Domains**: domains.google.com → DNS → Custom records
  - **Cloudflare**: cloudflare.com → DNS → Add record
  - **OVH**: ovh.com → DNS Zone
  - **Namecheap**: namecheap.com → Advanced DNS

## Step 2: DNS Configuration for Cloud Run

Once the domain is verified, run the script:
```bash
./setup-domain.sh
```

The script will display the necessary DNS records. You will have **2 options**:

### Option A: A and AAAA Records (Root Domain)

To use `pixelhub.now` directly (without www or subdomain):

**⚠️ WARNING: The IPs below are EXAMPLES!**

IP addresses are **dynamically generated** by Google Cloud when creating the domain mapping. You MUST first run `./setup-domain.sh` which will display the exact IPs to use for your configuration.

Record format (with example IPs):

```
Type: A
Name: @ (or pixelhub.now or leave empty depending on registrar)
Value: [IP provided by setup-domain.sh - example: 216.239.32.21]
TTL: 3600

Type: A
Name: @
Value: [IP provided by setup-domain.sh - example: 216.239.34.21]
TTL: 3600

Type: A
Name: @
Value: [IP provided by setup-domain.sh - example: 216.239.36.21]
TTL: 3600

Type: A
Name: @
Value: [IP provided by setup-domain.sh - example: 216.239.38.21]
TTL: 3600

Type: AAAA
Name: @
Value: [IPv6 provided by setup-domain.sh - example: 2001:4860:4802:32::15]
TTL: 3600

Type: AAAA
Name: @
Value: [IPv6 provided by setup-domain.sh - example: 2001:4860:4802:34::15]
TTL: 3600

Type: AAAA
Name: @
Value: [IPv6 provided by setup-domain.sh - example: 2001:4860:4802:36::15]
TTL: 3600

Type: AAAA
Name: @
Value: [IPv6 provided by setup-domain.sh - example: 2001:4860:4802:38::15]
TTL: 3600
```

**Total: 4 A records + 4 AAAA records = 8 records**

### Option B: CNAME Record (Subdomain - SIMPLER)

To use `www.pixelhub.now` or `app.pixelhub.now`:

```
Type: CNAME
Name: www (or app, or api, etc.)
Value: ghs.googlehosted.com
TTL: 3600
```

**⚠️ RECOMMENDATION: Use Option B with a subdomain**
- Simpler (1 record instead of 8)
- More flexible
- Faster configuration

## Step 3: Verification

### 3.1 Check DNS Propagation
```bash
# For root domain
dig pixelhub.now A
dig pixelhub.now AAAA

# For subdomain
dig www.pixelhub.now CNAME
```

Or use an online tool: https://dnschecker.org

### 3.2 Check Cloud Run Status
```bash
gcloud run domain-mappings describe \
  --domain pixelhub.now \
  --region europe-west1
```

Look for `certificateMode: AUTOMATIC` and `routeReady: true`

## Step 4: Wait for SSL Certificate

Once DNS is configured correctly:
- Google will automatically provision an SSL certificate
- This typically takes 15-60 minutes
- Your site will be accessible via HTTPS

## Practical Examples by Registrar

### If you use Cloudflare:
1. Go to cloudflare.com
2. Select your domain `pixelhub.now`
3. "DNS" tab
4. Click "Add record"
5. Add the A/AAAA or CNAME records
6. **IMPORTANT**: Disable Cloudflare proxy (gray cloud, not orange) so Google can manage SSL

### If you use Google Domains:
1. Go to domains.google.com
2. Click on your domain
3. "DNS" menu on the left
4. "Custom records" section
5. Add the records

### If you use Namecheap:
1. Namecheap Dashboard
2. Manage domain → Advanced DNS
3. Add New Record
4. Add the records

## Troubleshooting

### Domain doesn't resolve
- Wait 5-60 minutes for DNS propagation
- Check with `dig` or dnschecker.org
- Make sure you added ALL the records

### "Domain verification failed" error
- Verify that the domain is validated in Google Search Console
- The Google account must be linked to the GCP project

### SSL certificate error
- The certificate is automatic but takes time
- Wait up to 24 hours in rare cases
- Verify that DNS points correctly to Google

## Useful Commands

```bash
# List all domain mappings
gcloud run domain-mappings list --region=europe-west1

# Delete a mapping
gcloud run domain-mappings delete --domain=pixelhub.now --region=europe-west1

# View mapping details
gcloud run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```

