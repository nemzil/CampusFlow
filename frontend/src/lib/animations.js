/**
 * Global Animation Variants for Framer Motion
 * Optimized for performance with GPU acceleration and reduced complexity
 */

// Page transition animations - optimized with will-change
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1] // Custom easing for smoother performance
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

// Card animations - GPU accelerated with transform
export const cardVariants = {
  initial: {
    opacity: 0,
    scale: 0.96
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  tap: {
    scale: 0.98
  }
};

// List item animations (with stagger) - reduced stagger delay
export const listContainerVariants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Reduced from 0.1 for faster rendering
      delayChildren: 0
    }
  }
};

export const listItemVariants = {
  initial: {
    opacity: 0,
    x: -10 // Reduced from -20 for subtler effect
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

// Modal animations - optimized
export const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15
    }
  }
};

// Overlay animations - faster fade
export const overlayVariants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.15
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15
    }
  }
};

// Button animations - snappy and responsive
export const buttonVariants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
};

// Fade in animation - faster
export const fadeInVariants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3
    }
  }
};

// Slide in from right - optimized
export const slideInRightVariants = {
  initial: {
    x: 50, // Reduced from 100 for subtler effect
    opacity: 0
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    x: 50,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Slide in from left - optimized
export const slideInLeftVariants = {
  initial: {
    x: -50, // Reduced from -100
    opacity: 0
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    x: -50,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Bounce animation - optimized with transform
export const bounceVariants = {
  animate: {
    y: [0, -8, 0], // Reduced from -10
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 1,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

// Pulse animation - subtle and performant
export const pulseVariants = {
  animate: {
    scale: [1, 1.03, 1], // Reduced from 1.05
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

// Spin animation (for loading) - smooth rotation
export const spinVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// Performance optimization: Spring configurations
export const springConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 30
};

export const smoothSpring = {
  type: 'spring',
  stiffness: 200,
  damping: 25
};

// Layout animation config for smooth transitions
export const layoutTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 0.8
};

// Tab animation config (matches sidebar navigation)
export const tabLayoutTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
  mass: 0.8
};
