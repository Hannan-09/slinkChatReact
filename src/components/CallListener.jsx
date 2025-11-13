import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useWebRTCCall from '../hooks/useWebRTCCall';

export default function CallListener() {
    const navigate = useNavigate();
    const { currentCall, callStatus } = useWebRTCCall();

    useEffect(() => {

        // Navigate to incoming call screen when ringing
        if (callStatus === 'ringing' && currentCall) {
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
