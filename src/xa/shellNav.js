import {
  LayoutDashboard, ClipboardList, Package, PackagePlus, ShoppingBag, Undo2, FileText, Star, Layers, Tag, HandCoins,
  Warehouse, Truck, Store, Building2, Eye, Coins, Smartphone, PlusCircle, Wallet, Banknote, ShieldCheck, CreditCard,
  Users, UserCog, Crown, Sparkles, BadgeCheck, LayoutGrid, Video, Gift, MessagesSquare, Globe, HelpCircle, Flag,
  Image as ImageIcon, Bell, Megaphone, TrendingDown, Download, Vote, Handshake, Rocket, Gamepad2, Dices,
  SlidersHorizontal, Radio, QrCode, Table, Database, Network, Terminal, ScrollText, Settings as Cog,
} from 'lucide-react';

export const XMARKET_GROUPS = [
  { id: 'overview', label: 'Overview', items: [
    ['/', 'Dashboard', LayoutDashboard], ['/daily', 'Daily Tasks & Notes', ClipboardList]] },
  { id: 'commerce', label: 'Commerce', items: [
    ['/products', 'Products', Package], ['/bulk-products', 'Bulk Product Manager', PackagePlus], ['/orders', 'Orders', ShoppingBag],
    ['/returns', 'Returns', Undo2], ['/quotations', 'Quotations', FileText], ['/reviews', 'Reviews', Star],
    ['/bundles', 'Bundles', Layers], ['/pricing', 'Pricing', Tag], ['/cashback', 'Cashback & Costs', HandCoins],
    ['/supplier', 'Supplier', Warehouse], ['/logistics', 'Logistics', Truck], ['/stores', 'Stores', Store],
    ['/shops', 'Shops', Building2], ['/product-views', 'Product Views', Eye]] },
  { id: 'money', label: 'Money', items: [
    ['/xcoin', 'XCOIN', Coins], ['/buy-load', 'Buy Load', Smartphone], ['/topups', 'Top-ups', PlusCircle],
    ['/wallet', 'Wallet', Wallet], ['/payouts', 'Withdrawals & Interest', Banknote],
    ['/wallet-security', 'Wallet Security', ShieldCheck], ['/xcards', 'Xcards', CreditCard]] },
  { id: 'people', label: 'People', items: [
    ['/users', 'Users', Users], ['/members-data', 'Members Data', UserCog], ['/xm-vip', 'VIP Members', Crown]] },
  { id: 'community', label: 'Community', items: [
    ['/creators', 'Creators', Sparkles], ['/creator-mgmt', 'Creator Management', BadgeCheck],
    ['/social-mod', 'Socials Management', LayoutGrid], ['/video-mod', 'Socials Videos', Video],
    ['/gifts', 'Creator Gifts', Gift], ['/dm-mod', 'DM Moderation', MessagesSquare], ['/xm-chat', 'Global Chat', Globe],
    ['/market-qa', 'Market & Q&A', HelpCircle], ['/reports', 'Reports', Flag]] },
  { id: 'marketing', label: 'Marketing and Games', items: [
    ['/banners', 'Banner', ImageIcon], ['/notifications', 'Notifications', Bell], ['/notify', 'Notify', Megaphone],
    ['/xf-price-drops', 'Price Drops', TrendingDown], ['/xf-digital', 'Digital Products', Download],
    ['/xf-polls', 'Demand Polls', Vote], ['/xf-sponsor', 'Sponsorships', Handshake],
    ['/xf-popups', 'Launch Popups', Rocket], ['/play-time', 'Play Time', Gamepad2],
    ['/airdrop', 'Airdrop 88', Dices], ['/airdrop-mod', 'Airdrop Mod', SlidersHorizontal]] },
  { id: 'tools', label: 'Tools', items: [['/nfc', 'NFC Studio', Radio], ['/qr-portal', 'QR Portal', QrCode]] },
  { id: 'system', label: 'Data and System', items: [
    ['/data', 'Data Manager', Table], ['/db', 'Database', Database], ['/schema', 'Schema', Network], ['/sql', 'SQL editor', Terminal],
    ['/audit', 'Audit log', ScrollText], ['/settings', 'Settings', Cog]] },
];

// finds the group and label for a path (longest matching link wins)
export function locate(pathname) {
  let best = null;
  XMARKET_GROUPS.forEach((g) => g.items.forEach(([to, label]) => {
    const hit = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/');
    if (hit && (!best || to.length > best.to.length)) best = { to, label, group: g.label, groupId: g.id };
  }));
  return best;
}
