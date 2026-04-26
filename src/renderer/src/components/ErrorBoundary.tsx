import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('Renderer error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="page"
          style={{
            margin: 24,
            padding: 16,
            background: 'var(--bg-surface)',
            border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--fg-primary)'
          }}
        >
          <h3 style={{ margin: 0, color: 'var(--status-error)' }}>
            Something went wrong.
          </h3>
          <p
            style={{
              marginTop: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg-secondary)'
            }}
          >
            {this.state.error.message}
          </p>
          <button
            className="btn sm"
            style={{ marginTop: 12 }}
            onClick={() => this.setState({ error: null })}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
