import { useState, useEffect } from 'react';

export default function DebugScreen() {
    const [info, setInfo] = useState({});
    const [apiStatus, setApiStatus] = useState('Testing...');

    useEffect(() => {
        const debugInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
            isStandalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasNotification: 'Notification' in window,
            hasPushManager: 'PushManager' in window,
            fcmSupported: ('serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window),
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            port: window.location.port,
            apiBaseURL: import.meta.env.VITE_API_BASE_URL || 'Not configured',
        };
        setInfo(debugInfo);

        // Test API connectivity
        const testAPI = async () => {
            try {
                const apiURL = import.meta.env.VITE_API_BASE_URL || 'https://8hspqmjm-8008.inc1.devtunnels.ms/api/v1';
                const response = await fetch(`${apiURL}/users/register`, {
                    method: 'OPTIONS', // Preflight request
                    headers: {
                        'ngrok-skip-browser-warning': '1',
                    }
                });
                setApiStatus(`✅ Connected (${response.status})`);
            } catch (error) {
                setApiStatus(`❌ Failed: ${error.message}`);
            }
        };
        testAPI();
    }, []);

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#4ade80' }}>Debug Information</h1>
            <div style={{
                backgroundColor: '#2a2a2a',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '20px'
            }}>
                <div style={{
                    marginBottom: '15px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '8px',
                    borderLeft: '4px solid #3b82f6'
                }}>
                    <strong style={{ color: '#60a5fa' }}>API Status:</strong>{' '}
                    <span style={{ color: apiStatus.includes('✅') ? '#4ade80' : '#ef4444' }}>
                        {apiStatus}
                    </span>
                </div>

                {Object.entries(info).map(([key, value]) => (
                    <div key={key} style={{
                        marginBottom: '10px',
                        borderBottom: '1px solid #3a3a3a',
                        paddingBottom: '8px'
                    }}>
                        <strong style={{ color: '#60a5fa' }}>{key}:</strong>{' '}
                        <span style={{ color: '#fbbf24', wordBreak: 'break-all' }}>
                            {typeof value === 'boolean' ? value.toString() : value}
                        </span>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '20px' }}>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Go to Home
                </button>
            </div>

            <div style={{ marginTop: '30px', color: '#9ca3af' }}>
                <h2 style={{ color: '#4ade80' }}>Console Logs</h2>
                <p>Check browser console (Safari Developer Tools) for errors</p>
                <p>To enable: Settings → Safari → Advanced → Web Inspector</p>
            </div>
        </div>
    );
}
