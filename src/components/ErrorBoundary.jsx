import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console
        console.error('❌ ErrorBoundary caught an error:', error);
        console.error('❌ Error info:', errorInfo);

        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // You can also log to an error reporting service here
    }

    handleReset = () => {
        // Clear error state and try to recover
        this.setState({ hasError: false, error: null, errorInfo: null });

        // Optionally reload the page
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    backgroundColor: '#1a1a1a',
                    color: 'white',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
                        Oops! Something went wrong
                    </h1>
                    <p style={{ color: '#999', marginBottom: '24px' }}>
                        The app encountered an unexpected error.
                    </p>
                    <button
                        onClick={this.handleReset}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#252525',
                            color: 'white',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Restart App
                    </button>
                    {this.props.showDetails && this.state.error && (
                        <details style={{ marginTop: '24px', color: '#666', fontSize: '12px' }}>
                            <summary>Error Details</summary>
                            <pre style={{ textAlign: 'left', overflow: 'auto', maxWidth: '100%' }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
