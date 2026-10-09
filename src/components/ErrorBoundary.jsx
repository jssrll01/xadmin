import React from 'react';
export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <div className="neu-card" style={{ padding: 20 }}>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--danger)', marginBottom:8 }}>
              Page error
            </div>
            <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:12, wordBreak:'break-word' }}>
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button className="neu-btn neu-btn-primary"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
