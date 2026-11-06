show() { echo; echo "######## $1 ########"; head -n "${2:-120}" "$1"; }
show src/App.jsx 120
show src/components/Sidebar.jsx 120
show src/lib/xrpc.js 80
show src/lib/api.js 60
show src/context/AdminContext.jsx 80
show src/components/CrudPage.jsx 150
show src/components/Modal.jsx 50
show src/components/Btn.jsx 40
show src/components/Card.jsx 40
show src/components/Toast.jsx 40
show src/pages/Xcards.jsx 120
echo; echo "######## RPC / code usage ########"
grep -rnE "admin_wallet_adjust|admin_xwallet|_admin_ok|p_code" src | cut -c1-160 | head -30
