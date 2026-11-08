import {
  LayoutDashboard, ClipboardList, Package, Boxes, ShoppingBag, RotateCcw, FileText, Star, Percent, Truck, Store, Eye,
  Wallet, CreditCard, BarChart3, Smartphone, Users, Database, Crown, Image as ImageIcon, Gift, MessageSquare,
  AlertTriangle, Bell, Megaphone, Gamepad2, QrCode, Radio, ScrollText, Settings as Cog,
} from 'lucide-react';

export const XMARKET_GROUPS = [
  { id: 'overview', label: 'Overview', items: [
    ['/', 'Dashboard', LayoutDashboard], ['/daily', 'Daily Tasks & Notes', ClipboardList]] },
  { id: 'commerce', label: 'Commerce', items: [
    ['/products', 'Products', Package], ['/bulk-products', 'Bulk Product Manager', Boxes], ['/orders', 'Orders', ShoppingBag],
    ['/returns', 'Returns', RotateCcw], ['/quotations', 'Quotations', FileText], ['/reviews', 'Reviews', Star],
    ['/bundles', 'Bundles', Boxes], ['/pricing', 'Pricing', Percent], ['/cashback', 'Cashback & Costs', Percent],
    ['/supplier', 'Supplier', Boxes], ['/logistics', 'Logistics', Truck], ['/stores', 'Stores', Store],
    ['/shops', 'Shops', Store], ['/product-views', 'Product Views', Eye]] },
  { id: 'money', label: 'Money', items: [
    ['/xcoin', 'XCOIN', BarChart3], ['/buy-load', 'Buy Load', Smartphone], ['/topups', 'Top-ups', Wallet],
    ['/wallet', 'Wallet', Wallet], ['/payouts', 'Withdrawals & Interest', Wallet],
    ['/wallet-security', 'Wallet Security', Wallet], ['/xcards', 'Xcards', CreditCard]] },
  { id: 'people', label: 'People', items: [
    ['/users', 'Users', Users], ['/members-data', 'Members Data', Database], ['/xm-vip', 'VIP Members', Crown]] },
  { id: 'community', label: 'Community', items: [
    ['/creators', 'Creators', Crown], ['/creator-mgmt', 'Creator Management', Crown],
    ['/social-mod', 'Socials Management', ImageIcon], ['/video-mod', 'Socials Videos', ImageIcon],
    ['/gifts', 'Creator Gifts', Gift], ['/dm-mod', 'DM Moderation', MessageSquare], ['/xm-chat', 'Global Chat', MessageSquare],
    ['/market-qa', 'Market & Q&A', Gift], ['/reports', 'Reports', AlertTriangle]] },
  { id: 'marketing', label: 'Marketing and Games', items: [
    ['/banners', 'Banner', ImageIcon], ['/notifications', 'Notifications', Bell], ['/notify', 'Notify', Megaphone],
    ['/xf-price-drops', 'Price Drops', Gamepad2], ['/xf-digital', 'Digital Products', Gamepad2],
    ['/xf-polls', 'Demand Polls', Gamepad2], ['/xf-sponsor', 'Sponsorships', Gamepad2],
    ['/xf-popups', 'Launch Popups', Gamepad2], ['/points-shop', 'Points Shop', Gift], ['/play-time', 'Play Time', Gamepad2],
    ['/airdrop', 'Airdrop 88', Gamepad2], ['/airdrop-mod', 'Airdrop Mod', Gamepad2]] },
  { id: 'tools', label: 'Tools', items: [['/nfc', 'NFC Studio', Radio], ['/qr-portal', 'QR Portal', QrCode]] },
  { id: 'system', label: 'Data and System', items: [
    ['/db', 'Database', Database], ['/schema', 'Schema', Database], ['/sql', 'SQL editor', Database],
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
