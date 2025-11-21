import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoPerson,
    IoAt,
    IoLockClosed,
    IoEye,
    IoEyeOff,
    IoArrowBack,
    IoCheckmarkCircle,
    IoKey,
    IoShieldCheckmark
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { AuthAPI } from '../services/AuthService';
import EncryptionService from '../services/EncryptionService';
import { useToast } from '../contexts/ToastContext';

export default function SignupScreen() {
    const navigate = useNavigate();
    const toast = useToast();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Success popup states
    const [showCongratulations, setShowCongratulations] = useState(false);
    const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [privateKeyError, setPrivateKeyError] = useState('');
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [creatingKey, setCreatingKey] = useState(false);

    // Animation for congratulations
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (showCongratulations) {
            setTimeout(() => setAnimateIn(true), 10);
        } else {
            setAnimateIn(false);
        }
    }, [showCongratulations]);

    // Validation functions matching backend
    const validateUsername = (username) => {
        if (!username.trim()) {
            return 'Username is required';
        }
        const usernameRegex = /^[a-z0-9._]{3,15}$/;
        if (!usernameRegex.test(username)) {
            return 'Username can contain only lowercase letters, numbers, dot, underscore, and must be 3-15 characters long';
        }
        return '';
    };

    const validatePassword = (password) => {
        if (!password) {
            return 'Password is required';
        }
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{6,20}$/;
        if (!passwordRegex.test(password)) {
            return 'Password must be 6-20 characters long, and include at least one uppercase letter, one lowercase letter, one digit, and one special character';
        }
        return '';
    };

    const validateFirstName = (name) => {
        if (!name.trim()) {
            return 'First name is required';
        }
        if (name.length > 15) {
            return 'First name must not exceed 15 characters';
        }
        return '';
    };

    const validateLastName = (name) => {
        if (!name.trim()) {
            return 'Last name is required';
        }
        if (name.length > 15) {
            return 'Last name must not exceed 15 characters';
        }
        return '';
    };

    const validatePrivateKey = (key) => {
        if (!key.trim()) {
            return 'Private key is required';
        }
        if (key.length < 6) {
            return 'Private key must be at least 6 characters';
        }
        return '';
    };

    const handlePrivateKeySubmit = async () => {
        const error = validatePrivateKey(privateKey);
        if (error) {
            setPrivateKeyError(error);
            return;
        }

        setCreatingKey(true);
        try {
            const storedUserId = localStorage.getItem('userId');
            if (!storedUserId) {
                setPrivateKeyError('User ID not found. Please register again.');
                return;
            }
            // Encrypt the private key before sending to backend
            const EncryptionService = (await import('../services/EncryptionService')).default;
            const encryptedPrivateKey = EncryptionService.encrypt(privateKey);
            // Call the backend API to register the private key
            const result = await AuthAPI.registerPrivateKey(storedUserId, encryptedPrivateKey);

            if (result.success) {
                try {
                    const encryptedResponseData = result.data.data;
                    const decryptedData = EncryptionService.decrypt(encryptedResponseData);
                    let extractedPrivateKey = null;
                    try {
                        const privateKeyMatch = decryptedData.match(/privateKey=([^,}]+)/);
                        if (privateKeyMatch && privateKeyMatch[1]) {
                            extractedPrivateKey = privateKeyMatch[1].trim();
                        } else {
                            console.warn('Could not extract private key from decrypted data');
                            extractedPrivateKey = decryptedData;
                        }
                    } catch (parseError) {
                        console.error('Error parsing decrypted data:', parseError);
                        extractedPrivateKey = decryptedData;
                    }

                    localStorage.setItem('userPrivateKey', encryptedPrivateKey);
                    localStorage.setItem('decryptedBackendData', extractedPrivateKey);
                } catch (decryptionError) {
                    console.error('Error processing backend response:', decryptionError);
                    try {
                        localStorage.setItem('userPrivateKey', encryptedPrivateKey);
                    } catch (storageError) {
                        console.error('Error saving encrypted private key locally:', storageError);
                    }
                }

                setShowPrivateKeyModal(false);

                toast.success('Registration Complete! Please log in to access your chats.');
                navigate('/login');
            } else {
                setPrivateKeyError(result.error || 'Failed to register private key on server');
            }
        } catch (error) {
            console.error('Private key creation error:', error);
            setPrivateKeyError('Failed to create private key. Please try again.');
        } finally {
            setCreatingKey(false);
        }
    };

    const handlePrivateKeyChange = (text) => {
        setPrivateKey(text);
        if (privateKeyError) {
            setPrivateKeyError('');
        }
    };

    const handleSignup = async () => {
        // Validate all fields
        const validationErrors = {};

        const firstNameError = validateFirstName(firstName);
        if (firstNameError) validationErrors.firstName = firstNameError;

        const lastNameError = validateLastName(lastName);
        if (lastNameError) validationErrors.lastName = lastNameError;

        const usernameError = validateUsername(username);
        if (usernameError) validationErrors.username = usernameError;

        const passwordError = validatePassword(password);
        if (passwordError) validationErrors.password = passwordError;

        // If there are validation errors, show them and return
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix the validation errors');
            return;
        }

        setLoading(true);
        try {
            const userData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim().toLowerCase(), // Ensure lowercase
                password: password,
            };

            const result = await AuthAPI.register(userData);
            if (result.success) {
                const userData = result.data.data;

                try {
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('userId', userData.userId.toString());
                    localStorage.setItem('username', userData.username);
                    localStorage.setItem('firstName', userData.firstName);
                    localStorage.setItem('lastName', userData.lastName);
                } catch (storageError) {
                    console.error('Error saving user data to storage:', storageError);
                }

                // Show congratulations popup first
                setShowCongratulations(true);

                // Auto-hide congratulations after 3 seconds and show private key modal
                setTimeout(() => {
                    setShowCongratulations(false);
                    setTimeout(() => {
                        setShowPrivateKeyModal(true);
                    }, 300);
                }, 3000);
            } else {
                toast.error(result.error || 'Registration Failed');
            }
        } catch (error) {
            toast.error('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        navigate('/login');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            handleSignup();
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10 relative">
                    <button
                        onClick={handleLogin}
                        className="absolute left-0 top-2 w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                        <IoArrowBack className="text-white text-xl" />
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2 mt-5">Create Account</h1>
                    <p className="text-gray-400">Join SlinkChat today!</p>
                </div>

                {/* Signup Form */}
                <div className="space-y-5">
                    {/* First Name Input */}
                    <div>
                        <div
                            className={`flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border ${errors.firstName ? 'border-red-500' : 'border-gray-800'
                                }`}
                        >
                            <IoPerson className="text-gray-400 text-xl mr-4" />
                            <input
                                type="text"
                                placeholder="First Name"
                                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                value={firstName}
                                onChange={(e) => {
                                    setFirstName(e.target.value);
                                    if (errors.firstName) {
                                        setErrors((prev) => ({ ...prev, firstName: null }));
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                        </div>
                        {errors.firstName && (
                            <p className="text-red-500 text-sm mt-1 ml-5">{errors.firstName}</p>
                        )}
                    </div>

                    {/* Last Name Input */}
                    <div>
                        <div
                            className={`flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border ${errors.lastName ? 'border-red-500' : 'border-gray-800'
                                }`}
                        >
                            <IoPerson className="text-gray-400 text-xl mr-4" />
                            <input
                                type="text"
                                placeholder="Last Name"
                                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                value={lastName}
                                onChange={(e) => {
                                    setLastName(e.target.value);
                                    if (errors.lastName) {
                                        setErrors((prev) => ({ ...prev, lastName: null }));
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                            />
                        </div>
                        {errors.lastName && (
                            <p className="text-red-500 text-sm mt-1 ml-5">{errors.lastName}</p>
                        )}
                    </div>

                    {/* Username Input */}
                    <div>
                        <div
                            className={`flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border ${errors.username ? 'border-red-500' : 'border-gray-800'
                                }`}
                        >
                            <IoAt className="text-gray-400 text-xl mr-4" />
                            <input
                                type="text"
                                placeholder="Username"
                                className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (errors.username) {
                                        setErrors((prev) => ({ ...prev, username: null }));
                                    }
                                }}
                                onKeyPress={handleKeyPress}
                                disabled={loading}
                                autoCapitalize="none"
                                autoCorrect="off"
                            />
                        </div>
                        {errors.username && (
                            <p className="text-red-500 text-sm mt-1 ml-5">{errors.username}</p>
                        )}
                        {!errors.username && username.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1 ml-5">
                                Lowercase letters, numbers, dot, underscore only (3-15 chars)
                            </p>
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
                        {!errors.password && password.length > 0 && (
                            <div className="mt-2 ml-5 text-xs space-y-1">
                                <p className={password.length >= 6 && password.length <= 20 ? 'text-green-400' : 'text-gray-500'}>
                                    • 6-20 characters
                                </p>
                                <p className={/[A-Z]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                                    • One uppercase letter
                                </p>
                                <p className={/[a-z]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                                    • One lowercase letter
                                </p>
                                <p className={/\d/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                                    • One digit
                                </p>
                                <p className={/[@$!%*?&._-]/.test(password) ? 'text-green-400' : 'text-gray-500'}>
                                    • One special character (@$!%*?&._-)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Signup Button */}
                    <button
                        onClick={handleSignup}
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
                            'Create Account'
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <span className="text-gray-400">Already have an account? </span>
                    <button
                        onClick={handleLogin}
                        className="text-orange-500 font-bold hover:text-orange-400 transition-colors"
                    >
                        Login
                    </button>
                </div>
            </div>

            {/* Congratulations Popup */}
            {showCongratulations && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center px-4 z-50">
                    <div
                        className={`w-full max-w-sm bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 shadow-2xl transition-all duration-500 ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                            }`}
                    >
                        <div className="text-center">
                            <div className="flex justify-center mb-5">
                                <IoCheckmarkCircle className="text-green-400 text-8xl" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Congratulations!
                            </h2>
                            <p className="text-gray-400 leading-relaxed">
                                You have successfully registered with SlinkChat!
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Private Key Creation Modal */}
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
                            Create Private Key
                        </h2>

                        {/* Description */}
                        <p className="text-gray-400 text-center text-sm leading-relaxed mb-6">
                            Create a private key for encryption and decryption of your messages.
                            This key must be at least 6 characters long.
                        </p>

                        {/* Private Key Input */}
                        <div className="mb-6">
                            <div
                                className={`flex items-center bg-[#1a1a1a] rounded-2xl px-4 py-3 shadow-inner border ${privateKeyError ? 'border-red-500' : 'border-gray-800'
                                    }`}
                            >
                                <IoLockClosed className="text-gray-400 text-xl mr-3" />
                                <input
                                    type={showPrivateKey ? 'text' : 'password'}
                                    placeholder="Enter your private key"
                                    className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                                    value={privateKey}
                                    onChange={(e) => handlePrivateKeyChange(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !creatingKey) {
                                            handlePrivateKeySubmit();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                                    className="p-1"
                                >
                                    {showPrivateKey ? (
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

                        {/* Create Key Button */}
                        <button
                            onClick={handlePrivateKeySubmit}
                            disabled={creatingKey}
                            className={`w-full rounded-2xl py-4 font-bold shadow-lg transition-all mb-5 ${creatingKey
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }`}
                        >
                            {creatingKey ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating Key...</span>
                                </div>
                            ) : (
                                'Create Key'
                            )}
                        </button>

                        {/* Security Note */}
                        <div className="flex items-center bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-xl px-4 py-3">
                            <IoShieldCheckmark className="text-green-400 text-lg mr-2 flex-shrink-0" />
                            <p className="text-green-400 text-xs">
                                Your private key will be stored securely on your device
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
