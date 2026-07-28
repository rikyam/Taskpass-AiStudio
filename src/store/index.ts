import { create } from "zustand";
import { LayoutSlice, createLayoutSlice } from "./layoutSlice";
import { TaskSlice, createTaskSlice } from "./taskSlice";
import { WalletSlice, createWalletSlice } from "./walletSlice";
import { SettingsSlice, createSettingsSlice } from "./settingsSlice";
import { UXTemplateSlice, createUXTemplateSlice } from "./uxTemplateSlice";

// Unified state interface merging all slices
export interface AppStoreState extends LayoutSlice, TaskSlice, WalletSlice, SettingsSlice, UXTemplateSlice {}

// Core Zustand store combining layout, tasks, wallet, settings, and UX template domains
export const useAppStore = create<AppStoreState>()((...a) => ({
  ...createLayoutSlice(...a),
  ...createTaskSlice(...a),
  ...createWalletSlice(...a),
  ...createSettingsSlice(...a),
  ...createUXTemplateSlice(...a),
}));
