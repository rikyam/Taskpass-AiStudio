import { StateCreator } from "zustand";
import { Wallet, Transfer } from "../types";
import { AppStoreState } from "./index";

export interface WalletSlice {
  wallet: Wallet;
  transfers: Transfer[];
  
  // Setters
  setWallet: (wallet: Wallet | ((prev: Wallet) => Wallet)) => void;
  setTransfers: (transfers: Transfer[] | ((prev: Transfer[]) => Transfer[])) => void;
  
  // Wallet Actions
  updateWalletPoints: (amount: number) => void;
  
  // Transfer CRUD & Status Updates
  addTransfer: (transfer: Transfer) => void;
  updateTransferStatus: (id: string, status: Transfer["status"], additional?: Partial<Transfer>) => void;
}

export const createWalletSlice: StateCreator<
  AppStoreState,
  [],
  [],
  WalletSlice
> = (set) => ({
  wallet: { favorPoints: 120 },
  transfers: [],

  setWallet: (walletOrFn) => {
    set((state) => {
      const nextWallet = typeof walletOrFn === "function" ? walletOrFn(state.wallet) : walletOrFn;
      return { wallet: nextWallet };
    });
  },

  setTransfers: (transfersOrFn) => {
    set((state) => {
      const nextTransfers = typeof transfersOrFn === "function" ? transfersOrFn(state.transfers) : transfersOrFn;
      return { transfers: nextTransfers };
    });
  },

  updateWalletPoints: (amount) => set((state) => ({
    wallet: {
      ...state.wallet,
      favorPoints: Math.max(0, state.wallet.favorPoints + amount)
    }
  })),

  addTransfer: (transfer) => set((state) => ({
    transfers: [transfer, ...state.transfers]
  })),

  updateTransferStatus: (id, status, additional = {}) => set((state) => ({
    transfers: state.transfers.map((t) => (t.id === id ? { ...t, status, ...additional } : t))
  })),
});
