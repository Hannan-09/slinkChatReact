import { useState } from 'react';
import { IoShareOutline, IoAddCircleOutline, IoCheckmarkCircle, IoPhonePortraitOutline } from 'react-icons/io5';

export default function IosInstallGuide() {
    const [currentStep, setCurrentStep] = useState(1);

    const isIOS = () => {
        try {
            const userAgent = window.navigator.userAgent.toLowerCase();
            return /iphone|ipad|ipod/.test(userAgent);
        } catch (e) {
            return false;
        }
    };

    const isInStandaloneMode = () => {
        try {
            return (
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator && window.navigator.standalone === true)
            );
        } catch (e) {
            return false;
        }
    };

    const steps = [
        {
            number: 1,
            title: 'Tap the Share Button',
            description: 'Look for the share icon at the bottom of Safari (it looks like a square with an arrow pointing up)',
            icon: <IoShareOutline className="text-6xl text-blue-500" />,
            tip: 'The share button is located in the bottom toolbar of Safari'
        },
        {
            number: 2,
            title: 'Find "Add to Home Screen"',
            description: 'Scroll down in the share menu and tap "Add to Home Screen"',
            icon: <IoAddCircleOutline className="text-6xl text-green-500" />,
            tip: 'You may need to scroll down to find this option'
        },
        {
            number: 3,
            title: 'Confirm Installation',
            description: 'Tap "Add" in the top right corner to install the app',
            icon: <IoCheckmarkCircle className="text-6xl text-purple-500" />,
            tip: 'You can customize the app name before adding it'
        }
    ];

    if (isInStandaloneMode()) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-3xl p-8 shadow-2xl border border-white/10">
                        <IoCheckmarkCircle className="text-8xl text-green-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-white mb-4">
                            App Already Installed! 🎉
                        </h1>
                        <p className="text-gray-300 text-lg mb-6">
                            You're using SlinkChat as an installed app. Enjoy the full experience!
                        </p>
                        <button
                            onClick={() => window.location.href = '/chats'}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                        >
                            Go to Chats
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isIOS()) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-3xl p-8 shadow-2xl border border-white/10">
                        <IoPhonePortraitOutline className="text-8xl text-orange-500 mx-auto mb-6" />
                        <h1 className="text-3xl font-bold text-white mb-4">
                            iOS Device Required
                        </h1>
                        <p className="text-gray-300 text-lg mb-6">
                            This installation guide is specifically for iPhone and iPad users.
                            If you're on Android, you can install the app directly from your browser.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-4xl font-bold text-white mb-3">
                        Install SlinkChat on iOS
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Follow these simple steps to add SlinkChat to your home screen
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center items-center mb-12 gap-4">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex items-center">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${currentStep >= step.number
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white scale-110'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {step.number}
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`w-16 h-1 transition-all ${currentStep > step.number ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-700'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Current Step Card */}
                <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-3xl p-8 shadow-2xl border border-white/10 mb-8">
                    <div className="text-center mb-6">
                        {steps[currentStep - 1].icon}
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4 text-center">
                        Step {currentStep}: {steps[currentStep - 1].title}
                    </h2>

                    <p className="text-gray-300 text-lg mb-6 text-center leading-relaxed">
                        {steps[currentStep - 1].description}
                    </p>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
                        <p className="text-blue-400 text-sm font-medium flex items-start gap-2">
                            <span className="text-xl">💡</span>
                            <span>{steps[currentStep - 1].tip}</span>
                        </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-4">
                        {currentStep > 1 && (
                            <button
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="flex-1 bg-gray-700 text-white py-4 rounded-2xl font-semibold text-lg hover:bg-gray-600 transition-colors"
                            >
                                Previous
                            </button>
                        )}
                        {currentStep < steps.length ? (
                            <button
                                onClick={() => setCurrentStep(currentStep + 1)}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity"
                            >
                                Done! Go to App
                            </button>
                        )}
                    </div>
                </div>

                {/* All Steps Overview */}
                <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-3xl p-6 shadow-2xl border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4">Quick Overview</h3>
                    <div className="space-y-3">
                        {steps.map((step) => (
                            <div
                                key={step.number}
                                className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${currentStep === step.number
                                    ? 'bg-blue-500/20 border border-blue-500/50'
                                    : 'bg-gray-800/50 hover:bg-gray-800'
                                    }`}
                                onClick={() => setCurrentStep(step.number)}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${currentStep >= step.number
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {step.number}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-white font-semibold mb-1">{step.title}</h4>
                                    <p className="text-gray-400 text-sm">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Help Section */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm mb-4">
                        Having trouble? Make sure you're using Safari browser on iOS.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                        Skip and use in browser →
                    </button>
                </div>
            </div>
        </div>
    );
}
