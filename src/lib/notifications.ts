"use client"

/**
 * Notification sound service
 * Uses AudioContext for reliable mobile playback
 */
class NotificationService {
    private audio: HTMLAudioElement | null = null;
    private audioContext: AudioContext | null = null;
    private lastPlayed: number = 0;
    private readonly COOLDOWN = 1000;
    private initialized = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.audio = new Audio("/sounds/notification.mp3");
            this.audio.volume = 1.0; // Maximum volume
            this.audio.load();
        }
    }

    /**
     * Must be called on first user interaction (tap/click) to unlock audio on mobile
     */
    init() {
        if (this.initialized) return;

        // Create AudioContext to unlock mobile audio
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
            }
        } catch (e) {
            // Fallback — no AudioContext
        }

        // Silent play to unlock the audio element
        if (this.audio) {
            this.audio.volume = 0;
            const p = this.audio.play();
            if (p !== undefined) {
                p.then(() => {
                    this.audio?.pause();
                    if (this.audio) {
                        this.audio.currentTime = 0;
                        this.audio.volume = 1.0;
                    }
                    this.initialized = true;
                    console.log("Audio notification service initialized");
                }).catch(() => {
                    // Still blocked
                });
            }
        }
    }

    play() {
        if (!this.audio) return;

        const now = Date.now();
        if (now - this.lastPlayed < this.COOLDOWN) return;

        // Resume AudioContext if suspended (mobile Chrome)
        if (this.audioContext?.state === "suspended") {
            this.audioContext.resume();
        }

        // Reset and play at full volume
        this.audio.currentTime = 0;
        this.audio.volume = 1.0;
        const playPromise = this.audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Sound play failed:", error.message);
                // Try re-initializing on next user interaction
                this.initialized = false;
            });
        }

        this.lastPlayed = now;
    }
}

const service = new NotificationService();
export const notificationSound = service;
