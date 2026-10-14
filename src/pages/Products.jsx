import React from 'react';
import CrudPage from '../components/CrudPage.jsx';
import { fetchProductsSorted as fetchProducts, productCrud } from '../lib/api.js';
import { peso, dateOnly } from '../lib/format.js';
import { priceRange, totalStock } from '../lib/variants-admin.js';

export default function Products() {
  return (
    <CrudPage
      title="Products"
      subtitle="Catalog"
      fetcher={fetchProducts}
      searchKeys={['name', 'category', 'store']}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
        { key: 'category', label: 'Category', render: (r) => r.category || '—' },
        { key: 'store', label: 'Store', render: (r) => r.store || '—' },
        { key: 'price', label: 'Price', render: (r) => priceRange(r).display },
        { key: 'stock', label: 'Stock', render: (r) => {
          const n = totalStock(r);
          if (n === Infinity) return <span className="neu-badge badge-approved">∞</span>;
          if (n <= 0) return <span className="neu-badge badge-rejected">SOLD OUT</span>;
          if (n <= 5) return <span className="neu-badge badge-pending">{n} left</span>;
          return <span className="neu-badge badge-approved">{n}</span>;
        } },
        { key: 'sold', label: 'Sold', render: (r) => r.sold ?? 0 },
        { key: 'variants', label: 'Variants', render: (r) =>
          Array.isArray(r.variants) && r.variants.length
            ? <span style={{ fontSize: 12 }}>{r.variants.join(', ')}</span>
            : '—' },
        { key: 'images', label: 'Images', render: (r) =>
          Array.isArray(r.images) && r.images.length
            ? <span style={{ fontSize: 12 }}>{r.images.length} image{r.images.length > 1 ? 's' : ''}</span>
            : '—' },
        { key: 'verified', label: 'Verified', render: (r) => r.verified ? '✅' : '—' },
        { key: 'preorder', label: 'Preorder', render: (r) => r.preorder ? '✅' : '—' },
        { key: 'instant', label: 'Instant', render: (r) => r.instant ? '✅' : '—' },
        { key: 'created_at', label: 'Created', render: (r) => dateOnly(r.created_at) },
      ]}
      formFields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'category', label: 'Category' },
        { key: 'store', label: 'Store' },
        { key: 'sold', label: 'Sold', type: 'number', default: 0 },
        { key: 'variant_editor', label: 'Variants', type: 'variant-editor' },
        { key: 'images', label: 'Image URLs', type: 'array',
          placeholder: 'One URL per line' },
        { key: 'save_more', label: 'Show in Save More', type: 'boolean' },
        { key: 'flash_sale', label: 'Show in Flash Sale', type: 'boolean' },
        { key: 'verified', label: 'Verified', type: 'boolean' },
        { key: 'preorder', label: 'Preorder', type: 'boolean' },
        { key: 'instant', label: 'Instant', type: 'boolean' },
      ]}
      onCreate={productCrud.create}
      onUpdate={productCrud.update}
      onDelete={productCrud.remove}
    />
  );
}
