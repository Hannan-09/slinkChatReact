import { useCall } from '../contexts/CallContext';
import IncomingCallScreen from './IncomingCallScreen';
import OutgoingCallScreen from './OutgoingCallScreen';
import ActiveCallScreen from './ActiveCallScreen';

export default function CallManager() {
    const { callState, busyMessage, clearBusyMessage } = useCall();

    return (
        <>
            {/* Call screens */}
            {callState !== 'idle' && (
                <>
                    {callState === 'incoming' && <IncomingCallScreen />}
                    {callState === 'outgoing' && <OutgoingCallScreen />}
                    {(callState === 'active' || callState === 'connected') && <ActiveCallScreen />}
                </>
            )}

            {/* Busy popup (user is on another call) */}
            {busyMessage && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
                    <div className="bg-gray-900 rounded-2xl px-6 py-5 shadow-2xl max-w-sm w-[90%] border border-gray-700">
                        <h2 className="text-white text-lg font-semibold mb-2">User is busy</h2>
                        <p className="text-gray-300 text-sm mb-4">{busyMessage}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={clearBusyMessage}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
