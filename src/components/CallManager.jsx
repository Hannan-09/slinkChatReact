import { useCall } from '../contexts/CallContext';
import IncomingCallScreen from './IncomingCallScreen';
import OutgoingCallScreen from './OutgoingCallScreen';
import ActiveCallScreen from './ActiveCallScreen';

export default function CallManager() {
    const { callState } = useCall();

    if (callState === 'idle') return null;

    return (
        <>
            {callState === 'incoming' && <IncomingCallScreen />}
            {callState === 'outgoing' && <OutgoingCallScreen />}
            {callState === 'active' && <ActiveCallScreen />}
        </>
    );
}
