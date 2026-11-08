echo "== Reviews.jsx =="; head -n 60 src/pages/Reviews.jsx | cut -c1-170
echo; echo "== Wallet.jsx rpcs =="; grep -nE "rpc|adminCall" src/pages/Wallet.jsx | head -n 10 | cut -c1-150
echo; echo "== sidebar =="; sed -n 1,50p src/components/Sidebar.jsx | cut -c1-120
