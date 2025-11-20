import { IoWarning, IoClose } from 'react-icons/io5';

export default function ConfirmDialog({
    title = 'Confirm Action',
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'warning' // 'warning', 'danger', 'info'
}) {
    const colors = {
        warning: 'from-yellow-600 to-yellow-700',
        danger: 'from-red-600 to-red-700',
        info: 'from-blue-600 to-blue-700',
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-b from-[#252525] to-[#101010] border border-white/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-w-sm w-full animate-scale-in">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${colors[type]} flex items-center justify-center`}>
                            <IoWarning className="text-white text-2xl" />
                        </div>
                        <h3 className="text-white text-xl font-bold flex-1">{title}</h3>
                        <button
                            onClick={onCancel}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <IoClose className="text-white text-xl" />
                        </button>
                    </div>
                    <p className="text-gray-300 text-base leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] text-white font-medium border border-white/10 hover:border-white/20 transition-all shadow-lg"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-full bg-gradient-to-r ${colors[type]} text-white font-medium shadow-lg hover:shadow-xl transition-all`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
