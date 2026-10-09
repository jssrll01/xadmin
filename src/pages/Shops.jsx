import React from 'react';
import DataPage from '../components/DataPage.jsx';
import { fetchShopsFromProducts } from '../lib/api.js';

export default function Shops() {
  return (
    <DataPage
      title="Shops"
      subtitle="Stores with products"
      fetcher={fetchShopsFromProducts}
      columns={[
        { key: 'store', label: 'Store', render: (r) => <b>{r.store}</b> },
        { key: 'product_count', label: 'Products', render: (r) => r.product_count },
        { key: 'total_stock', label: 'Total stock', render: (r) => r.total_stock },
        { key: 'categories', label: 'Categories', wrap: true, render: (r) => r.categories || '—' },
        { key: 'price_range', label: 'Price range', render: (r) => r.price_range },
        { key: 'seller_count', label: 'Sellers', render: (r) => r.seller_count || 1 },
      ]}
    />
  );
}
