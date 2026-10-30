#!/usr/bin/env bash
# Signed-out smoke test of a running Stub: pages, guards, API answers, sign-in redirects
# and security headers. It prints no secrets and stays well inside the rate limits.
#
#   npm run smoke                                  the production build (npm run preview)
#   npm run smoke -- http://localhost:4545         the dev server
#   npm run smoke -- https://stub.vedantagrw.com   the live site, after a deploy
#
# Exits non-zero if any check fails.
B=${1:-http://localhost:8787}
B=${B%/}
pass=0; fail=0
check() { # name expected actual
  if [ "$2" == "$3" ]; then pass=$((pass+1)); printf "ok    %-58s %s\n" "$1" "$3"; else fail=$((fail+1)); printf "FAIL  %-58s want %s got %s\n" "$1" "$2" "$3"; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
hdr() { curl -s -D - -o /dev/null "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
J='Content-Type: application/json'
FAKE="stub_$(head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=')"

check "GET /api/health" 200 "$(code $B/api/health)"
check "health says accounts on" '{"ok":true,"accounts":true}' "$(curl -s $B/api/health)"
check "health no-store" "private, no-store" "$(hdr cache-control $B/api/health)"
check "GET / page" 200 "$(code $B/)"
check "page no-transform" "no-transform" "$(hdr cache-control $B/)"
check "page X-Frame-Options" "DENY" "$(hdr x-frame-options $B/)"
check "page nosniff" "nosniff" "$(hdr x-content-type-options $B/)"
csp=$(hdr content-security-policy $B/)
check "CSP connect-src self only" yes "$(echo "$csp" | grep -q "connect-src 'self';" && echo yes || echo no)"
check "CSP no unsafe-inline scripts" yes "$(echo "$csp" | grep -o "script-src[^;]*" | grep -qv unsafe-inline && echo yes || echo no)"
check "CSP frame-ancestors none" yes "$(echo "$csp" | grep -q "frame-ancestors 'none'" && echo yes || echo no)"
check "__data.json no-store" "private, no-store" "$(hdr cache-control "$B/app/__data.json?x-sveltekit-invalidated=01")"
check "__data.json signed out" yes "$(curl -s "$B/app/__data.json?x-sveltekit-invalidated=01" | grep -q '"user":null\|null,true' && echo yes || echo no)"

check "GET example receipt" 200 "$(code "$B/api/v1/receipt?template=ticket")"
check "example is HTML" "text/html; charset=utf-8" "$(hdr content-type "$B/api/v1/receipt?template=ticket")"
check "example CORS *" "*" "$(hdr access-control-allow-origin "$B/api/v1/receipt")"
check "GET templates" 200 "$(code $B/api/v1/templates)"
check "GET example as png refused" 400 "$(code "$B/api/v1/receipt?output=png")"
check "OPTIONS preflight" 204 "$(code -X OPTIONS -H 'Origin: https://elsewhere.example' -H 'Access-Control-Request-Method: POST' $B/api/v1/receipt)"
check "POST without key" 401 "$(code -X POST -H "$J" -d '{"template":"default"}' $B/api/v1/receipt)"
check "POST with unknown key" 401 "$(code -X POST -H "$J" -H "Authorization: Bearer $FAKE" -d '{"template":"default"}' $B/api/v1/receipt)"
check "POST with junk X-AUTH-TOKEN" 401 "$(code -X POST -H "$J" -H 'X-AUTH-TOKEN: hello' -d '{"template":"default"}' $B/api/v1/receipt)"
check "POST format png refused" 400 "$(code -X POST -H "$J" -H "Authorization: Bearer $FAKE" -d '{"format":"png"}' $B/api/v1/receipt)"
check "POST not JSON" 400 "$(code -X POST -H "$J" -H "Authorization: Bearer $FAKE" -d 'nope' $B/api/v1/receipt)"

check "receipts list signed out" 401 "$(code $B/api/receipts)"
check "receipt create signed out" 401 "$(code -X POST -H "$J" -H "Origin: $B" -d '{"receipt":{}}' $B/api/receipts)"
check "receipt get signed out" 401 "$(code $B/api/receipts/00000000-0000-4000-8000-000000000000)"
check "keys list signed out" 401 "$(code $B/api/keys)"
check "key create signed out" 401 "$(code -X POST -H "$J" -H "Origin: $B" -d '{"label":"x"}' $B/api/keys)"
check "receipt create cross-site" 403 "$(code -X POST -H "$J" -H 'Origin: https://evil.example' -d '{"receipt":{}}' $B/api/receipts)"
check "key create without Origin" 403 "$(code -X POST -H "$J" -d '{"label":"x"}' $B/api/keys)"
check "key delete cross-site" 403 "$(code -X DELETE -H 'Origin: https://evil.example' $B/api/keys/00000000-0000-4000-8000-000000000000)"
check "logout cross-site" 403 "$(code -X POST -H 'Origin: https://evil.example' $B/auth/logout)"
check "logout same-origin" 204 "$(code -X POST -H "Origin: $B" $B/auth/logout)"

loc=$(hdr location $B/auth/login)
check "login redirects to Supabase authorize" yes "$(echo "$loc" | grep -q '^https://[a-z0-9]*\.supabase\.co/auth/v1/authorize?provider=google' && echo yes || echo no)"
check "login uses PKCE S256" yes "$(echo "$loc" | grep -qi 'code_challenge_method=s256' && echo yes || echo no)"
check "login returns to this origin" yes "$(echo "$loc" | grep -q "redirect_to=$(node -p "encodeURIComponent('$B/auth/callback')")" && echo yes || echo no)"
check "login sets verifier cookie HttpOnly" yes "$(curl -s -D - -o /dev/null $B/auth/login | grep -i '^set-cookie' | grep -i 'code-verifier' | grep -qi httponly && echo yes || echo no)"
check "callback with junk code" "/app?signin=failed" "$(hdr location "$B/auth/callback?code=junk")"
check "callback cancelled" "/app?signin=cancelled" "$(hdr location "$B/auth/callback?error=access_denied")"
check "callback ignores next=" "/app?signin=failed" "$(hdr location "$B/auth/callback?code=junk&next=https://evil.example")"

check "GET /app editor" 200 "$(code $B/app)"
check "home has no app script" 0 "$(curl -s $B/ | grep -c 'type="module"')"
check "home title" "<title>Stub: free online receipt maker and receipt API</title>" "$(curl -s $B/ | grep -o '<title>[^<]*</title>')"
check "home canonical" "<link rel=\"canonical\" href=\"$B/\"/>" "$(curl -s $B/ | grep -o '<link rel="canonical"[^>]*>')"
check "home og:image" yes "$(curl -s $B/ | grep -q "og:image\" content=\"$B/og.png" && echo yes || echo no)"
check "home JSON-LD" yes "$(curl -s $B/ | grep -q 'application/ld+json' && echo yes || echo no)"
check "og.png" 200 "$(code $B/og.png)"
for page in faq privacy terms; do check "GET /$page" 200 "$(code $B/$page)"; done
check "robots.txt" yes "$(curl -s $B/robots.txt | grep -q "Sitemap: $B/sitemap.xml" && echo yes || echo no)"
check "sitemap lists 4 pages" 4 "$(curl -s $B/sitemap.xml | grep -c '<loc>')"
check "account delete signed out" 401 "$(code -X DELETE -H "Origin: $B" $B/api/account)"
check "account delete cross-site" 403 "$(code -X DELETE -H 'Origin: https://evil.example' $B/api/account)"

echo "== $pass passed, $fail failed"
[ "$fail" -eq 0 ]
