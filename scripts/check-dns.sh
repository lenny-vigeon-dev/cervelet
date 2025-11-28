#!/bin/bash

# Script to check DNS configuration for pixelhub.now
# Usage: ./check-dns.sh [domain]

DOMAIN="${1:-pixelhub.now}"

echo "🔍 DNS Check for: $DOMAIN"
echo "=================================================="
echo "" 

# Check A records
echo "📍 A Records (IPv4):"
dig +short $DOMAIN A | while read ip; do
    echo "  ✓ $ip"
done

if [ -z "$(dig +short $DOMAIN A)" ]; then
    echo "  ❌ No A record found"
fi

echo ""

# Check AAAA records
echo "📍 AAAA Records (IPv6):"
dig +short $DOMAIN AAAA | while read ip; do
    echo "  ✓ $ip"
done

if [ -z "$(dig +short $DOMAIN AAAA)" ]; then
    echo "  ❌ No AAAA record found"
fi

echo ""

# Check CNAME records (for subdomain)
if [[ $DOMAIN == *"."*"."* ]]; then
    echo "📍 CNAME Record:"
    cname=$(dig +short $DOMAIN CNAME)
    if [ -n "$cname" ]; then
        echo "  ✓ $cname"
    else
        echo "  ❌ No CNAME record found"
    fi
    echo ""
fi

# Check if domain points to Google
echo "🎯 Google Cloud Run IP Check:"
google_ips=("216.239.32.21" "216.239.34.21" "216.239.36.21" "216.239.38.21")
current_ips=$(dig +short $DOMAIN A)

match=false
for gip in "${google_ips[@]}"; do
    if echo "$current_ips" | grep -q "$gip"; then
        match=true
        echo "  ✓ Google IP detected: $gip"
    fi
done

if [ "$match" = false ]; then
    echo "  ⚠️  IPs are not pointing to Google Cloud Run"
    echo "     Expected IPs: ${google_ips[*]}"
fi

echo ""

# Test HTTPS resolution
echo "🔒 HTTPS Connection Test:"
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$DOMAIN 2>/dev/null | grep -q "200\|301\|302"; then
    echo "  ✓ Site is accessible via HTTPS"
    echo "  URL: https://$DOMAIN"
else
    echo "  ⚠️  Site not yet accessible (normal if DNS recently configured)"
    echo "     Wait for DNS propagation (5-60 minutes)"
fi

echo ""
echo "=================================================="
echo "💡 To check worldwide propagation:"
echo "   https://dnschecker.org/#A/$DOMAIN"
echo ""
echo "📋 To view Cloud Run status:"
echo "   gcloud run domain-mappings describe --domain=$DOMAIN --region=europe-west1"
echo "=================================================="

