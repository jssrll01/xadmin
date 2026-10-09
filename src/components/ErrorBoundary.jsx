import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('Page crash:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <div className="neu-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: 'var(--danger)' }}>
              Page crashed
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button className="neu-btn neu-btn-primary" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
