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
        }
    }

    play() {
        if (!this.audio) return;

        const now = Date.now();
        if (now - this.lastPlayed < this.COOLDOWN) return;

        // Reset and play
        this.audio.currentTime = 0;
        this.audio.play().catch(error => {
            // Browser policy usually blocks autoplay until first user interaction
            console.warn("Sound play failed:", error.message);
        });

        this.lastPlayed = now;
    }
}

export const notificationSound = new NotificationService();
