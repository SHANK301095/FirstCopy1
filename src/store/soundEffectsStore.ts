/**
 * Sound Effects Store
 * Controls app-wide sound effects with toggle in settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundEffectsState {
  enabled: boolean;
  volume: number;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playClick: () => void;
  playSuccess: () => void;
  playError: () => void;
  playNotification: () => void;
  playHover: () => void;
  playChatSend: () => void;
  playChatReceive: () => void;
  playChatOpen: () => void;
  playDropdownOpen: () => void;
  playDropdownClose: () => void;
}

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

// Generate a cyber-style beep sound
const playTone = (frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
};

// Cyber click sound - short high beep
const playClickSound = (volume: number) => {
  playTone(1200, 0.05, volume, 'square');
  setTimeout(() => playTone(800, 0.03, volume * 0.5, 'sine'), 20);
};

// Success sound - ascending tones
const playSuccessSound = (volume: number) => {
  playTone(523, 0.1, volume, 'sine'); // C5
  setTimeout(() => playTone(659, 0.1, volume, 'sine'), 80); // E5
  setTimeout(() => playTone(784, 0.15, volume, 'sine'), 160); // G5
};

// Error sound - descending harsh tones
const playErrorSound = (volume: number) => {
  playTone(400, 0.15, volume, 'sawtooth');
  setTimeout(() => playTone(300, 0.2, volume, 'sawtooth'), 100);
};

// Notification sound - gentle chime
const playNotificationSound = (volume: number) => {
  playTone(880, 0.1, volume * 0.8, 'sine'); // A5
  setTimeout(() => playTone(1100, 0.15, volume * 0.6, 'sine'), 100);
  setTimeout(() => playTone(880, 0.1, volume * 0.4, 'sine'), 200);
};

// Hover sound - subtle tick
const playHoverSound = (volume: number) => {
  playTone(2000, 0.02, volume * 0.2, 'sine');
};

// Chat message sent - soft whoosh up
const playChatSendSound = (volume: number) => {
  playTone(600, 0.06, volume * 0.4, 'sine');
  setTimeout(() => playTone(900, 0.08, volume * 0.5, 'sine'), 40);
  setTimeout(() => playTone(1200, 0.04, volume * 0.3, 'sine'), 80);
};

// Chat message received - gentle pop
const playChatReceiveSound = (volume: number) => {
  playTone(800, 0.05, volume * 0.5, 'sine');
  setTimeout(() => playTone(1000, 0.1, volume * 0.6, 'triangle'), 30);
};

// Chat open - warm welcome chime
const playChatOpenSound = (volume: number) => {
  playTone(523, 0.08, volume * 0.4, 'sine'); // C5
  setTimeout(() => playTone(659, 0.08, volume * 0.5, 'sine'), 60); // E5
  setTimeout(() => playTone(784, 0.12, volume * 0.6, 'sine'), 120); // G5
  setTimeout(() => playTone(1047, 0.15, volume * 0.4, 'sine'), 200); // C6
};

// Dropdown open - futuristic whoosh up with sparkle
const playDropdownOpenSound = (volume: number) => {
  // Base sweep up
  playTone(300, 0.08, volume * 0.3, 'sine');
  setTimeout(() => playTone(500, 0.06, volume * 0.4, 'sine'), 30);
  setTimeout(() => playTone(800, 0.05, volume * 0.35, 'triangle'), 60);
  // Sparkle accent
  setTimeout(() => playTone(1400, 0.03, volume * 0.2, 'sine'), 90);
  setTimeout(() => playTone(1800, 0.02, volume * 0.15, 'sine'), 110);
};

// Dropdown close - soft settle down
const playDropdownCloseSound = (volume: number) => {
  playTone(600, 0.05, volume * 0.25, 'sine');
  setTimeout(() => playTone(400, 0.06, volume * 0.2, 'sine'), 40);
  setTimeout(() => playTone(250, 0.08, volume * 0.15, 'triangle'), 80);
};

export const useSoundEffectsStore = create<SoundEffectsState>()(
  persist(
    (set, get) => ({
      enabled: false,
      volume: 0.5,
      
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      
      playClick: () => {
        const { enabled, volume } = get();
        if (enabled) playClickSound(volume);
      },
      
      playSuccess: () => {
        const { enabled, volume } = get();
        if (enabled) playSuccessSound(volume);
      },
      
      playError: () => {
        const { enabled, volume } = get();
        if (enabled) playErrorSound(volume);
      },
      
      playNotification: () => {
        const { enabled, volume } = get();
        if (enabled) playNotificationSound(volume);
      },
      
      playHover: () => {
        const { enabled, volume } = get();
        if (enabled) playHoverSound(volume);
      },
      
      playChatSend: () => {
        const { enabled, volume } = get();
        if (enabled) playChatSendSound(volume);
      },
      
      playChatReceive: () => {
        const { enabled, volume } = get();
        if (enabled) playChatReceiveSound(volume);
      },
      
      playChatOpen: () => {
        const { enabled, volume } = get();
        if (enabled) playChatOpenSound(volume);
      },
      
      playDropdownOpen: () => {
        const { enabled, volume } = get();
        if (enabled) playDropdownOpenSound(volume);
      },
      
      playDropdownClose: () => {
        const { enabled, volume } = get();
        if (enabled) playDropdownCloseSound(volume);
      },
    }),
    {
      name: 'mmc-sound-effects',
    }
  )
);
