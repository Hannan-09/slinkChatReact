import { useRef, useState } from 'react';
import { IoCall, IoClose, IoVideocam } from 'react-icons/io5';
import { useCall } from '../contexts/CallContext';

export default function IncomingCallScreen() {
    const { callerInfo, isVideoCall, acceptCall, rejectCall } = useCall();

    // Slider state for "slide to answer" and "slide to decline"
    const [activeSlider, setActiveSlider] = useState(null); // 'accept' | 'decline' | null
    const [answerProgress, setAnswerProgress] = useState(0); // 0 → at start, 1 → fully slid
    const [declineProgress, setDeclineProgress] = useState(0);
    const answerTrackRef = useRef(null);
    const declineTrackRef = useRef(null);

    const SLIDE_THRESHOLD = 0.75; // % of track needed to trigger

    const handleSliderPointerDown = (type) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveSlider(type);
    };

    const handleSliderPointerMove = (type) => (e) => {
        if (activeSlider !== type) return;

        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0]?.clientX : e.clientX;
        if (clientX == null) return;

        const trackEl = type === 'accept' ? answerTrackRef.current : declineTrackRef.current;
        if (!trackEl) return;

        const rect = trackEl.getBoundingClientRect();
        let rawProgress;

        if (type === 'accept') {
            // Slide from left → right
            rawProgress = (clientX - rect.left) / rect.width;
        } else {
            // Slide from right → left
            rawProgress = (rect.right - clientX) / rect.width;
        }

        const clamped = Math.min(1, Math.max(0, rawProgress));
        if (type === 'accept') {
            setAnswerProgress(clamped);
        } else {
            setDeclineProgress(clamped);
        }
    };

    const handleSliderPointerEnd = (type) => () => {
        if (activeSlider !== type) return;

        const progress = type === 'accept' ? answerProgress : declineProgress;
        setActiveSlider(null);

        if (progress >= SLIDE_THRESHOLD) {
            if (type === 'accept') {
                acceptCall();
            } else {
                rejectCall();
            }
        } else {
            // Snap back if not fully slid
            if (type === 'accept') {
                setAnswerProgress(0);
            } else {
                setDeclineProgress(0);
            }
        }
    };

    if (!callerInfo) return null;

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col items-center justify-center p-6">
            {/* Caller Info */}
                <div className="flex flex-col items-center mb-12">
                <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_18px_32px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.16),inset_0_3px_5px_rgba(255,255,255,0.24),inset_0_-5px_10px_rgba(0,0,0,0.95),inset_4px_0_5px_rgba(255,255,255,0.16),inset_-4px_0_5px_rgba(0,0,0,0.8)] border border-black/70 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_3px_4px_rgba(255,255,255,0.5),inset_0_-4px_7px_rgba(0,0,0,0.98)] flex items-center justify-center">
                        <img
                            src={callerInfo.avatar || 'https://via.placeholder.com/150'}
                            alt={callerInfo.name}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                    </div>
                </div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping"></div>
                </div>

                <h2 className="text-white text-3xl font-bold mb-2">{callerInfo.name}</h2>
                <p className="text-gray-300 text-lg flex items-center gap-2">
                    {isVideoCall ? (
                        <>
                            <IoVideocam className="text-2xl" />
                            Incoming Video Call
                        </>
                    ) : (
                        <>
                            <IoCall className="text-2xl" />
                            Incoming Voice Call
                        </>
                    )}
                </p>
            </div>

            {/* Ringing Animation */}
            <div className="mb-12">
                <div className="flex gap-2">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-3 h-12 bg-green-500 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Sliders */}
            <div className="w-full max-w-md space-y-5 mt-4">
                {/* Slide to answer (right) */}
                <div
                    ref={answerTrackRef}
                    className="relative h-14 rounded-full incoming-slide-track shadow-[0_18px_32px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.18),inset_0_2px_4px_rgba(255,255,255,0.24),inset_0_-4px_7px_rgba(0,0,0,0.95)] border border-black/70 overflow-hidden"
                    onMouseDown={handleSliderPointerDown('accept')}
                    onMouseMove={handleSliderPointerMove('accept')}
                    onMouseUp={handleSliderPointerEnd('accept')}
                    onMouseLeave={handleSliderPointerEnd('accept')}
                    onTouchStart={handleSliderPointerDown('accept')}
                    onTouchMove={handleSliderPointerMove('accept')}
                    onTouchEnd={handleSliderPointerEnd('accept')}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs sm:text-sm tracking-wide text-white/85">
                            Slide to answer
                        </span>
                    </div>

                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                        style={{
                            // Center of knob starts closer to left edge (~7%) and moves to right
                            left: `${7 + answerProgress * 86}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            {isVideoCall ? (
                                <IoVideocam className="text-[#34c759] text-2xl" />
                            ) : (
                                <IoCall className="text-[#34c759] text-2xl" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Slide to decline (left) */}
                <div
                    ref={declineTrackRef}
                    className="relative h-14 rounded-full incoming-slide-track shadow-[0_18px_32px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.18),inset_0_2px_4px_rgba(255,255,255,0.24),inset_0_-4px_7px_rgba(0,0,0,0.95)] border border-black/70 overflow-hidden"
                    onMouseDown={handleSliderPointerDown('decline')}
                    onMouseMove={handleSliderPointerMove('decline')}
                    onMouseUp={handleSliderPointerEnd('decline')}
                    onMouseLeave={handleSliderPointerEnd('decline')}
                    onTouchStart={handleSliderPointerDown('decline')}
                    onTouchMove={handleSliderPointerMove('decline')}
                    onTouchEnd={handleSliderPointerEnd('decline')}
                >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs sm:text-sm tracking-wide text-white/85">
                            Slide to decline
                        </span>
                    </div>

                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                        style={{
                            // Center of knob starts closer to right edge (~93%) and moves to left
                            left: `${93 - declineProgress * 86}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoClose className="text-[#ff3b30] text-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
