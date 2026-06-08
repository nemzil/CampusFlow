import { cva } from 'class-variance-authority';

/**
 * Component Size Variants
 * 
 * Size variant definitions for consistent component sizing across the application:
 * - compact: 20% reduction (most aggressive)
 * - default: 25% reduction (recommended standard)
 * - comfortable: Original dimensions (legacy support)
 */

// Glass Card Variants
export const glassCardVariants = cva(
  'glass-card border-white/5 rounded-2xl backdrop-blur-[24px]',
  {
    variants: {
      size: {
        compact: 'p-3',      // 12px (was 20px, 40% reduction)
        default: 'p-3.5',    // 14px (was 20px, 30% reduction)
        comfortable: 'p-5'   // 20px (original)
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
);

// Stat Card Variants
export const statCardVariants = cva(
  'glass-card border-white/5 bg-white/5 overflow-hidden group',
  {
    variants: {
      size: {
        compact: 'p-2',      // 8px (was 10px, 20% reduction)
        default: 'p-2',      // 8px (was 10px, 20% reduction)
        comfortable: 'p-2.5' // 10px (original)
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
);

// Button Size Variants
export const buttonSizeVariants = cva('', {
  variants: {
    size: {
      compact: 'h-8 px-3 text-xs',    // 32px height (was 40px, 20% reduction)
      default: 'h-9 px-4 text-sm',    // 36px height (was 40px, 10% reduction)
      comfortable: 'h-10 px-5 text-sm' // 40px height (original)
    }
  },
  defaultVariants: {
    size: 'default'
  }
});

// Filter Panel Variants
export const filterPanelVariants = cva('space-y-6 shrink-0', {
  variants: {
    size: {
      compact: 'w-full lg:w-52',   // 208px (was 288px, 28% reduction)
      default: 'w-full lg:w-56',   // 224px (was 288px, 22% reduction)
      comfortable: 'w-full lg:w-72' // 288px (original)
    }
  },
  defaultVariants: {
    size: 'default'
  }
});

// Spacing Variants (for gap, space-y, etc.)
export const spacingVariants = {
  compact: {
    cardGap: 'gap-2',      // 8px (was 16px, 50% reduction)
    sectionGap: 'gap-3',   // 12px (was 20px, 40% reduction)
    spaceY: 'space-y-3'    // 12px (was 16px, 25% reduction)
  },
  default: {
    cardGap: 'gap-2.5',    // 10px (was 16px, 37.5% reduction)
    sectionGap: 'gap-3',   // 12px (was 20px, 40% reduction)
    spaceY: 'space-y-3'    // 12px (was 16px, 25% reduction)
  },
  comfortable: {
    cardGap: 'gap-4',      // 16px (original)
    sectionGap: 'gap-5',   // 20px (original)
    spaceY: 'space-y-4'    // 16px (original)
  }
};

// Typography Variants
export const typographyVariants = {
  compact: {
    pageTitle: 'text-xl',      // 20px (was 24px, 17% reduction)
    cardTitle: 'text-base',    // 16px (was 18px, 11% reduction)
    sectionTitle: 'text-sm',   // 14px (was 16px, 12.5% reduction)
    body: 'text-xs'            // 12px (was 14px, 14% reduction)
  },
  default: {
    pageTitle: 'text-xl',      // 20px (was 24px, 17% reduction)
    cardTitle: 'text-base',    // 16px (was 18px, 11% reduction)
    sectionTitle: 'text-sm',   // 14px (was 16px, 12.5% reduction)
    body: 'text-sm'            // 14px (original)
  },
  comfortable: {
    pageTitle: 'text-2xl',     // 24px (original)
    cardTitle: 'text-lg',      // 18px (original)
    sectionTitle: 'text-base', // 16px (original)
    body: 'text-sm'            // 14px (original)
  }
};
