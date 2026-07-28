import { StateCreator } from "zustand";
import { AppStoreState } from "./index";

export type UXTemplateId = 'minimalist-focus' | 'dashboard-heavy' | 'cinematic-dark' | 'high-density-compact' | 'deep-work-matrix';

export type PanelPlacement = 'sidebar' | 'bottom-deck';

export type VectorFlowProfile = 'neon-glow' | 'sharp-monochrome' | 'classic-indigo' | 'dotted-minimal';

export interface UXTemplateConfig {
  panelPlacement: PanelPlacement;
  gridSpacingMultiplier: number;
  typographyScale: 'small' | 'medium' | 'large';
  animationSpeedModifier: number;
  vectorFlowStyle: VectorFlowProfile;
  cardDensity: 'standard' | 'simplified' | 'very_simplified' | 'report';
  showMiniMap: boolean;
  showActivityLog: boolean;
  themeAccent: string;
  blurLevel: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export interface UXTemplateSlice {
  activeTemplateId: UXTemplateId;
  templateConfigs: Record<UXTemplateId, UXTemplateConfig>;
  activeConfig: UXTemplateConfig;

  // Actions
  setTemplate: (templateId: UXTemplateId) => void;
  updateActiveConfig: (configUpdates: Partial<UXTemplateConfig>) => void;
  resetToTemplateDefault: () => void;
}

export const defaultTemplateConfigs: Record<UXTemplateId, UXTemplateConfig> = {
  'minimalist-focus': {
    panelPlacement: 'bottom-deck',
    gridSpacingMultiplier: 1.2,
    typographyScale: 'medium',
    animationSpeedModifier: 0.2,
    vectorFlowStyle: 'dotted-minimal',
    cardDensity: 'very_simplified',
    showMiniMap: false,
    showActivityLog: false,
    themeAccent: 'emerald',
    blurLevel: 'md',
  },
  'dashboard-heavy': {
    panelPlacement: 'sidebar',
    gridSpacingMultiplier: 1.0,
    typographyScale: 'medium',
    animationSpeedModifier: 0.5,
    vectorFlowStyle: 'classic-indigo',
    cardDensity: 'standard',
    showMiniMap: true,
    showActivityLog: true,
    themeAccent: 'indigo',
    blurLevel: 'lg',
  },
  'cinematic-dark': {
    panelPlacement: 'bottom-deck',
    gridSpacingMultiplier: 1.1,
    typographyScale: 'large',
    animationSpeedModifier: 0.8,
    vectorFlowStyle: 'neon-glow',
    cardDensity: 'simplified',
    showMiniMap: false,
    showActivityLog: true,
    themeAccent: 'rose',
    blurLevel: 'xl',
  },
  'high-density-compact': {
    panelPlacement: 'sidebar',
    gridSpacingMultiplier: 0.8,
    typographyScale: 'small',
    animationSpeedModifier: 0.3,
    vectorFlowStyle: 'sharp-monochrome',
    cardDensity: 'report',
    showMiniMap: true,
    showActivityLog: false,
    themeAccent: 'amber',
    blurLevel: 'none',
  },
  'deep-work-matrix': {
    panelPlacement: 'sidebar',
    gridSpacingMultiplier: 0.85,
    typographyScale: 'small',
    animationSpeedModifier: 0.1,
    vectorFlowStyle: 'sharp-monochrome',
    cardDensity: 'simplified',
    showMiniMap: false,
    showActivityLog: false,
    themeAccent: 'slate',
    blurLevel: 'none',
  }
};

export const createUXTemplateSlice: StateCreator<
  AppStoreState,
  [],
  [],
  UXTemplateSlice
> = (set) => ({
  activeTemplateId: (() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("active_template_id");
      return (saved as UXTemplateId) || 'dashboard-heavy';
    }
    return 'dashboard-heavy';
  })(),
  templateConfigs: defaultTemplateConfigs,
  activeConfig: (() => {
    if (typeof localStorage !== "undefined") {
      const savedId = localStorage.getItem("active_template_id") as UXTemplateId || 'dashboard-heavy';
      const savedConfig = localStorage.getItem(`template_config_${savedId}`);
      if (savedConfig) {
        try {
          return JSON.parse(savedConfig);
        } catch {
          return defaultTemplateConfigs[savedId];
        }
      }
      return defaultTemplateConfigs[savedId];
    }
    return defaultTemplateConfigs['dashboard-heavy'];
  })(),

  setTemplate: (templateId) => set((state) => {
    const nextConfig = state.templateConfigs[templateId];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("active_template_id", templateId);
    }
    return {
      activeTemplateId: templateId,
      activeConfig: nextConfig
    };
  }),

  updateActiveConfig: (configUpdates) => set((state) => {
    const nextConfig = {
      ...state.activeConfig,
      ...configUpdates
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`template_config_${state.activeTemplateId}`, JSON.stringify(nextConfig));
    }
    return {
      activeConfig: nextConfig
    };
  }),

  resetToTemplateDefault: () => set((state) => {
    const defaultConfig = state.templateConfigs[state.activeTemplateId];
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`template_config_${state.activeTemplateId}`);
    }
    return {
      activeConfig: defaultConfig
    };
  })
});
