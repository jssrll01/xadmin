echo "== TOP =="; ls
echo; echo "== PKG =="; grep -A15 '"dependencies"' package.json 2>/dev/null
echo; echo "== FILES =="
find . -type f -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./build/*" -not -path "./dist/*" | sort | head -120
echo; echo "== ADMIN CODE / RPC USAGE =="
grep -rnE "admin_wallet_adjust|p_code|_admin_ok|admin_xwallet" . --include=*.js --include=*.jsx --include=*.html --include=*.ts -l --exclude-dir=node_modules | head -20
