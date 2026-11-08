echo "== stack =="; grep -E '"(vite|react|typescript|tailwindcss|@vitejs[^"]*)"' package.json; ls vite.config.* tsconfig.json 2>/dev/null
echo; echo "== env names only =="; sed 's/=.*//' .env .env.production | sort -u
echo; echo "== gitignore =="; grep -n "env" .gitignore
echo; echo "== supabase client =="; cut -c1-160 src/supabase.js
echo; echo "== routes =="; grep -n "<Route" src/App.jsx | cut -c1-120
echo; echo "== biggest files =="; wc -l src/pages/*.jsx src/components/*.jsx | sort -n | tail -20
echo; echo "== PinLock =="; head -n 60 src/components/PinLock.jsx | cut -c1-150
echo; echo "== api.js rest =="; sed -n 60,140p src/lib/api.js | cut -c1-150
echo; echo "== Layout =="; head -n 50 src/components/Layout.jsx | cut -c1-150
echo; echo "== css =="; wc -l src/styles/*.css; head -n 60 src/styles/neu.css
