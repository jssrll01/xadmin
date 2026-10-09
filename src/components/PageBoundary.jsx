import React from 'react';

export default class PageBoundary extends React.Component {
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
        <div className="neu-card" style={{ padding: 20, marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--danger)', marginBottom: 6 }}>
            This page hit an error
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, wordBreak: 'break-word' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button className="neu-btn neu-btn-primary" onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
