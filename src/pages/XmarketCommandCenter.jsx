import React, { useEffect, useState } from 'react';
import {
  fetchOrders,
  fetchUsers
} from '../lib/api.js';

export default function XmarketCommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [ordersResult, usersResult] = await Promise.all([
        fetchOrders(),
        fetchUsers()
      ]);

      if (ordersResult.error) throw ordersResult.error;
      if (usersResult.error) throw usersResult.error;

      const orders = ordersResult.items || [];
      const users = usersResult.items || [];

      const today = new Date().toLocaleDateString('en-CA');

      const todayOrders = orders.filter(order =>
        order.created_at &&
        new Date(order.created_at).toLocaleDateString('en-CA') === today
      );

      const revenue = orders
        .filter(order => {
          const status = String(order.status || '').toLowerCase();
          return ![
            'cancelled',
            'canceled',
            'refunded',
            'failed',
            'unpaid'
          ].includes(status);
        })
        .reduce((sum, order) => {
          return sum + Number(order.total || 0);
        }, 0);

      setData({
        orders: orders.length,
        users: users.length,
        revenue,
        todayOrders: todayOrders.length
      });

    } catch (err) {
      console.error('XMARKET Command Center:', err);
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = [
    {
      label: 'TOTAL REVENUE',
      value: data
        ? '₱' + data.revenue.toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : '—',
      color: '#4f46e5'
    },
    {
      label: 'TOTAL ORDERS',
      value: data ? data.orders.toLocaleString() : '—',
      color: '#0ea5e9'
    },
    {
      label: 'TOTAL USERS',
      value: data ? data.users.toLocaleString() : '—',
      color: '#8b5cf6'
    },
    {
      label: 'ORDERS TODAY',
      value: data ? data.todayOrders.toLocaleString() : '—',
      color: '#10b981'
    }
  ];

  return (
    <section style={{
      background: '#fff',
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      border: '1px solid rgba(163,177,198,0.3)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.02)'
    }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h2 style={{
            margin: '0 0 6px',
            fontSize: 24,
            color: '#0f172a',
            fontWeight: 800,
            letterSpacing: '-0.5px'
          }}>
            XMARKET Command Center
          </h2>

          <div style={{
            fontSize: 13,
            color: '#64748b',
            fontWeight: 600
          }}>
            {loading ? 'Synchronizing data...' :
              error ? 'Connection issue' :
              'Dashboard overview'}
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '9px 18px',
            borderRadius: 10,
            fontWeight: 700,
            color: '#475569',
            cursor: loading ? 'wait' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: 14,
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: 12,
          color: '#be123c',
          fontSize: 13,
          marginBottom: 16
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 16
      }}>
        {cards.map(card => (
          <div
            key={card.label}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: 20,
              minWidth: 0
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: 0.5
            }}>
              {card.label}
            </div>

            <div style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#0f172a',
              marginTop: 12,
              overflowWrap: 'anywhere'
            }}>
              {loading ? '...' : card.value}
            </div>

            <div style={{
              height: 4,
              width: 42,
              borderRadius: 10,
              background: card.color,
              marginTop: 16
            }} />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 18,
        fontSize: 11,
        color: '#94a3b8'
      }}>
        Data retrieved from the XMARKET administration database.
        Revenue is an order-total estimate, not verified net profit.
      </div>
    </section>
  );
}
