echo "== SocialMod.jsx (head) =="; head -n 70 src/pages/SocialMod.jsx | cut -c1-170
echo; echo "== Stores.jsx imports and CODE =="; head -n 16 src/pages/Stores.jsx | cut -c1-170
echo; echo "== App.jsx routes =="; grep -nE "SocialMod|Route" src/App.jsx | head -n 20 | cut -c1-150
echo; echo "== Sidebar entries =="; grep -nE "Social|Creator" src/components/Sidebar.jsx | cut -c1-150
