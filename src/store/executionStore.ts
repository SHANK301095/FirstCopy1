import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExecutionState {
  riskDisclosureAccepted: boolean;
  riskDisclosureAcceptedAt: string | null;
  liveTradingEnabled: boolean;
  setRiskDisclosureAccepted: (accepted: boolean) => void;
  setLiveTradingEnabled: (enabled: boolean) => void;
  resetDisclosure: () => void;
}

export const useExecutionStore = create<ExecutionState>()(
  persist(
    (set) => ({
      riskDisclosureAccepted: false,
      riskDisclosureAcceptedAt: null,
      liveTradingEnabled: false,
      setRiskDisclosureAccepted: (accepted) => set({ 
        riskDisclosureAccepted: accepted,
        riskDisclosureAcceptedAt: accepted ? new Date().toISOString() : null,
      }),
      setLiveTradingEnabled: (enabled) => set({ liveTradingEnabled: enabled }),
      resetDisclosure: () => set({ 
        riskDisclosureAccepted: false, 
        riskDisclosureAcceptedAt: null,
        liveTradingEnabled: false,
      }),
    }),
    {
      name: 'execution-settings',
    }
  )
);
