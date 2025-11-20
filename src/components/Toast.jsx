import { useEffect } from 'react';
import { IoCheckmarkCircle, IoCloseCircle, IoInformationCircle, IoWarning, IoClose } from 'react-icons/io5';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <IoCheckmarkCircle className="text-2xl" />,
        error: <IoCloseCircle className="text-2xl" />,
        warning: <IoWarning className="text-2xl" />,
        info: <IoInformationCircle className="text-2xl" />,
    };

    const colors = {
        success: 'from-green-600 to-green-700',
        error: 'from-red-600 to-red-700',
        warning: 'from-yellow-600 to-yellow-700',
        info: 'from-blue-600 to-blue-700',
    };

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
            <div className={`min-w-[300px] max-w-md bg-gradient-to-r ${colors[type]} rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.9)] border border-white/20 p-4 flex items-center gap-3`}>
                <div className="text-white flex-shrink-0">
                    {icons[type]}
                </div>
                <p className="text-white text-sm font-medium flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white flex-shrink-0 transition-colors"
                >
                    <IoClose className="text-xl" />
                </button>
            </div>
        </div>
    );
}
