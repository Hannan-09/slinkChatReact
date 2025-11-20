import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCall, IoVideocam, IoTrash, IoCheckmark, IoClose, IoPhonePortrait } from 'react-icons/io5';
import { CallHistoryAPI } from '../services/CallHistoryService';
import { ApiUtils } from '../services/AuthService';

export default function CallHistoryScreen() {
    const navigate = useNavigate();
    const [callHistory, setCallHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const containerRef = useRef(null);

    useEffect(() => {
        const getUserId = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
        };
        getUserId();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            setCallHistory([]); // Clear existing history
            setPageNumber(1); // Reset page number
            loadCallHistory(true);
        }
    }, [currentUserId, filter]);

    const loadCallHistory = async (isFirstPage = false) => {
        if (!currentUserId) return;

        try {
            setLoading(true);
            const page = isFirstPage ? 1 : pageNumber;
            const callTypeFilter = filter === 'ALL' ? null : filter;

            console.log('📞 Loading call history:', { page, filter, callTypeFilter, isFirstPage });

            const result = await CallHistoryAPI.getAllCallHistory(
                currentUserId,
                page,
                20,
                'createdAt',
                callTypeFilter,
                'desc'
            );

            if (result.success) {
                const newCalls = result.data.data || [];
                console.log('✅ Loaded calls:', newCalls.length, 'calls');

                if (isFirstPage) {
                    setCallHistory(newCalls);
                    setPageNumber(2);
                } else {
                    setCallHistory(prev => [...prev, ...newCalls]);
                    setPageNumber(prev => prev + 1);
                }

                setHasMore(newCalls.length === 20);
            }
        } catch (error) {
            console.error('❌ Error loading call history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (callHistoryId) => {
        if (!confirm('Delete this call from history?')) return;

        try {
            const result = await CallHistoryAPI.deleteCallHistory(callHistoryId, currentUserId);
            if (result.success) {
                setCallHistory(prev => prev.filter(call => call.callHistoryId !== callHistoryId));
            }
        } catch (error) {
            console.error('Error deleting call:', error);
        }
    };

    const formatCallTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    const formatDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return '0:00';
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.floor((end - start) / 1000);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCallStatus = (call) => {
        if (call.isRejected) return { text: 'Rejected', icon: IoClose, color: 'text-red-500' };
        if (call.isNotAnswered) return { text: 'Missed', icon: IoPhonePortrait, color: 'text-red-500' };
        if (call.pickedUp) return { text: formatDuration(call.callStartTime, call.callEndTime), icon: IoCheckmark, color: 'text-green-500' };
        return { text: 'Cancelled', icon: IoClose, color: 'text-gray-500' };
    };

    const handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        if (bottom && !loading && hasMore) {
            loadCallHistory(false);
        }
    };

    return (
        <div className="h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-b border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]"
                    >
                        <IoArrowBack className="text-white text-xl" />
                    </button>
                    <h1 className="text-white text-xl font-bold">Call History</h1>
                    <div className="w-10" />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 px-4 pb-4">
                    {['ALL', 'AUDIO', 'VIDEO'].map((type) => (
                        <button
                            key={type}
                            onClick={() => {
                                setFilter(type);
                                setPageNumber(1);
                            }}
                            className={`flex-1 py-2.5 rounded-full font-medium transition-all ${filter === type
                                ? 'bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] text-white border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)]'
                                : 'bg-gradient-to-b from-[#252525] to-[#101010] text-gray-400 border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Call History List */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto"
            >
                {loading && callHistory.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500">Loading...</div>
                    </div>
                ) : callHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <IoCall className="text-6xl mb-4 opacity-30" />
                        <p>No call history</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {callHistory.map((call) => {
                            const isOutgoing = call.senderId === currentUserId;
                            const otherUser = isOutgoing
                                ? { name: call.receiverName, avatar: call.receiverProfileURL, id: call.receiverId }
                                : { name: call.senderName, avatar: call.senderProfileURL, id: call.senderId };
                            const status = getCallStatus(call);

                            return (
                                <div
                                    key={call.callHistoryId}
                                    className="bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 rounded-2xl p-4 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#2e2e2e] via-[#151515] to-[#050505] border border-white/25 shadow-[0_18px_32px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_6px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
                                            <img
                                                src={otherUser.avatar || 'https://via.placeholder.com/150'}
                                                alt={otherUser.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Call Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-semibold truncate">
                                                    {otherUser.name}
                                                </h3>
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#111111] border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)] flex items-center justify-center">
                                                    {call.callType === 'VIDEO' ? (
                                                        <IoVideocam className="text-gray-300 text-xs" />
                                                    ) : (
                                                        <IoCall className="text-gray-300 text-xs" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <status.icon className={status.color} />
                                                <span className={status.color}>{status.text}</span>
                                                <span className="text-gray-500">•</span>
                                                <span className="text-gray-500">
                                                    {formatCallTime(call.callInitiatedTime)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(call.callHistoryId)}
                                            className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:border-red-500/50 transition-colors"
                                        >
                                            <IoTrash className="text-red-500 text-lg" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {loading && (
                            <div className="text-center py-4 text-gray-500">
                                Loading more...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
