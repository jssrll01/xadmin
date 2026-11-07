echo "== files =="; ls; ls src src/pages 2>/dev/null | head -n 60
echo; echo "== routes =="; grep -nE "Route|path=" src/App.js | head -n 40 | cut -c1-150
echo; echo "== menu/nav =="; grep -rlE "Airdrop|Notes|Moderator" src | head -n 10
echo; echo "== how it calls admin rpcs =="; grep -rnE "rpc\('admin_|_code|adminCode|admin_db" src | head -n 12 | cut -c1-170
echo; echo "== one existing page (head) =="; f=$(ls src/pages/*.js 2>/dev/null | head -n 1); echo "$f"; head -n 60 "$f" | cut -c1-170
