import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWebRTCCall from '../hooks/useWebRTCCall';

export default function CallListener() {
    const navigate = useNavigate();
    const { currentCall, callStatus } = useWebRTCCall();

    useEffect(() => {
        console.log('CallListener - Status:', callStatus);
        console.log('CallListener - Current Call:', currentCall);

        // Navigate to incoming call screen when ringing
        if (callStatus === 'ringing' && currentCall) {
            console.log('📞 Navigating to incoming call screen');
            navigate(
                `/call/incoming?callerId=${currentCall.callerId}&callerName=${encodeURIComponent(
                    currentCall.callerName || 'Unknown'
                )}&callerAvatar=${encodeURIComponent(
                    currentCall.callerAvatar || ''
                )}&isVideoCall=${currentCall.isVideoCall ? 'true' : 'false'}`
            );
        }
    }, [callStatus, currentCall, navigate]);

    return null; // This component doesn't render anything
}
