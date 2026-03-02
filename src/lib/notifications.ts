"use client"

/**
 * Utility to play a notification sound
 * Handled with a singleton to prevent multiple overlapping sounds if called rapidly
 */
class NotificationService {
    private audio: HTMLAudioElement | null = null;
    private lastPlayed: number = 0;
    private readonly COOLDOWN = 1000; // 1 second cooldown

    constructor() {
        if (typeof window !== "undefined") {
            // Standard notification "ting" sound
            this.audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            this.audio.volume = 0.5;
            this.audio.load(); // Preload the audio
        }
    }

    /**
     * Initializes the audio context on first user interaction to bypass browser restrictions
     */
    init() {
        if (this.audio && this.audio.paused) {
            // Silent play to unlock audio
            const playPromise = this.audio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.audio?.pause();
                    if (this.audio) this.audio.currentTime = 0;
                    console.log("Audio notification service initialized");
                }).catch(() => {
                    // Still blocked, but we tried
                });
            }
        }
    }

    play() {
        if (!this.audio) return;

        const now = Date.now();
        if (now - this.lastPlayed < this.COOLDOWN) return;

        // Reset and play
        this.audio.currentTime = 0;
        const playPromise = this.audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Sound play failed. User interaction might be required:", error.message);
            });
        }

        this.lastPlayed = now;
    }
}

const service = new NotificationService();
export const notificationSound = service;

