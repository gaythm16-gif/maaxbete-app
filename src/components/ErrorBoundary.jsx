import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <h1>Une erreur s’est produite</h1>
          <p className="error-boundary-message">{this.state.error.message}</p>
          <button
            type="button"
            className="error-boundary-retry"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
