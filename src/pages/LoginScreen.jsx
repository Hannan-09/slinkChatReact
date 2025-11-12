import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMail, IoLockClosed, IoEye, IoEyeOff, IoKey, IoShieldCheckmark } from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { AuthAPI } from '../services/AuthService';
import EncryptionService from '../services/EncryptionService';

export default function LoginScreen() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Private key verification states
    const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [privateKeyError, setPrivateKeyError] = useState('');
    const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
    const [verifyingKey, setVerifyingKey] = useState(false);

    // Clear login state when component mounts (user is on login page)
    useEffect(() => {
        console.log('🔐 LoginScreen mounted - clearing login state');
        localStorage.removeItem('isLoggedIn');
        // Dispatch logout event to disconnect WebSocket
        window.dispatchEvent(new Event('userLoggedOut'));
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        try {
            console.log(email, password);
            const result = await AuthAPI.login(email, password);
            console.log('result', result);

            if (result.success) {
                console.log('Login successful, showing private key verification');
                setShowPrivateKeyModal(true);
            } else {
                alert(result.error || 'Login Failed');
            }
        } catch (error) {
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = () => {
        navigate('/signup');
    };

    const validatePrivateKey = (key) => {
        if (!key.trim()) {
            return "Private key is required";
        }
        if (key.length < 6) {
            return "Private key must be at least 6 characters";
        }
        return "";
    };

    const handlePrivateKeyVerification = async () => {
        const error = validatePrivateKey(privateKey);
        if (error) {
            setPrivateKeyError(error);
            return;
        }

        setVerifyingKey(true);

        try {
            // Get the stored encrypted private key
            const storedEncryptedKey = localStorage.getItem("userPrivateKey");

            if (!storedEncryptedKey) {
                setPrivateKeyError("No private key found. Please contact support.");
                setVerifyingKey(false);
                return;
            }

            console.log('Verifying private key...');
            console.log('User entered key:', privateKey);

            // Decrypt the stored private key
            const storedPlainKey = EncryptionService.decrypt(storedEncryptedKey);
            console.log("Decrypted stored key:", storedPlainKey);

            // Compare the entered key with the decrypted stored key
            if (privateKey === storedPlainKey) {
                console.log('Private key verification successful!');

                try {
                    localStorage.setItem('isLoggedIn', 'true');
                    console.log('User session confirmed after private key verification');

                    // Dispatch custom event to trigger WebSocket connection
                    window.dispatchEvent(new Event('userLoggedIn'));
                } catch (sessionError) {
                    console.error('Error setting login session:', sessionError);
                }

                setShowPrivateKeyModal(false);
                navigate('/chats');
            } else {
                console.log('Private key verification failed!');
                setPrivateKeyError('Invalid private key. Please try again.');
            }
        } catch (error) {
            console.error('Private key verification error:', error);
            setPrivateKeyError('Failed to verify private key. Please try again.');
        } finally {
            setVerifyingKey(false);
        }
    };

    const handlePrivateKeyChange = (text) => {
        setPrivateKey(text);
        if (privateKeyError) {
            setPrivateKeyError('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleLogin();
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-2">SlinkChat</h1>
                    <p className="text-gray-400 text-lg">Welcome back!</p>
                </div>

                {/* Login Form */}
                <div className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <div
                            className={`flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border ${errors.email ? 'border-red-500' : 'border-gray-800'
                                }`}
                        >
                            <IoMail className="text-gray-400 text-xl mr-4" />
                            <input
                                type="email"
                                placeholder="Email"
                                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) {
                                        setErrors((prev) => ({ ...prev, email: null }));
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1 ml-5">{errors.email}</p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div>
                        <div
                            className={`flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border ${errors.password ? 'border-red-500' : 'border-gray-800'
                                }`}
                        >
                            <IoLockClosed className="text-gray-400 text-xl mr-4" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) {
                                        setErrors((prev) => ({ ...prev, password: null }));
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1"
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <IoEyeOff className="text-gray-400 text-xl" />
                                ) : (
                                    <IoEye className="text-gray-400 text-xl" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1 ml-5">{errors.password}</p>
                        )}
                    </div>

                    {/* Forgot Password */}
                    <div className="text-right">
                        <button className="text-orange-500 text-sm hover:text-orange-400 transition-colors">
                            Forgot Password?
                        </button>
                    </div>

                    {/* Login Button */}
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className={`w-full rounded-full py-4 font-bold text-lg shadow-lg transition-all ${loading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            'Login'
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <span className="text-gray-400">Don't have an account? </span>
                    <button
                        onClick={handleSignup}
                        className="text-orange-500 font-bold hover:text-orange-400 transition-colors"
                    >
                        Sign Up
                    </button>
                </div>
            </div>

            {/* Private Key Verification Modal */}
            {showPrivateKeyModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center px-4 z-50">
                    <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800 shadow-2xl">
                        {/* Key Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800">
                                <IoKey className="text-orange-500 text-6xl" />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white text-center mb-4">
                            Verify Private Key
                        </h2>

                        {/* Description */}
                        <p className="text-gray-400 text-center text-sm leading-relaxed mb-6">
                            Please enter your private key to access your encrypted messages.
                        </p>

                        {/* Private Key Input */}
                        <div className="mb-6">
                            <div
                                className={`flex items-center bg-[#1a1a1a] rounded-2xl px-4 py-3 shadow-inner border ${privateKeyError ? 'border-red-500' : 'border-gray-800'
                                    }`}
                            >
                                <IoLockClosed className="text-gray-400 text-xl mr-3" />
                                <input
                                    type={showPrivateKeyInput ? 'text' : 'password'}
                                    placeholder="Enter your private key"
                                    className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                    value={privateKey}
                                    onChange={(e) => handlePrivateKeyChange(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !verifyingKey) {
                                            handlePrivateKeyVerification();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                                    className="p-1"
                                >
                                    {showPrivateKeyInput ? (
                                        <IoEyeOff className="text-gray-400 text-xl" />
                                    ) : (
                                        <IoEye className="text-gray-400 text-xl" />
                                    )}
                                </button>
                            </div>
                            {privateKeyError && (
                                <p className="text-red-500 text-sm mt-2 ml-4">{privateKeyError}</p>
                            )}
                        </div>

                        {/* Verify Button */}
                        <button
                            onClick={handlePrivateKeyVerification}
                            disabled={verifyingKey}
                            className={`w-full rounded-2xl py-4 font-bold shadow-lg transition-all mb-5 ${verifyingKey
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }`}
                        >
                            {verifyingKey ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </div>
                            ) : (
                                'Verify & Continue'
                            )}
                        </button>

                        {/* Security Note */}
                        <div className="flex items-center bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-xl px-4 py-3">
                            <IoShieldCheckmark className="text-green-400 text-lg mr-2 flex-shrink-0" />
                            <p className="text-green-400 text-xs">
                                Your private key is verified locally and securely
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
