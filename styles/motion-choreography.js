/**
 * Kinematic Motion Choreography Helper — Agentway v1.7.0
 * Analytical Harmonic Oscillator Physics Solver
 */

export const SPRING_PRESETS = {
  snappy:  { mass: 0.8, stiffness: 280, damping: 18, bezier: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  bouncy:  { mass: 1.0, stiffness: 180, damping: 12, bezier: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  natural: { mass: 1.0, stiffness: 220, damping: 25, bezier: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  smooth:  { mass: 1.2, stiffness: 140, damping: 26, bezier: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  subtle:  { mass: 1.5, stiffness: 100, damping: 28, bezier: 'cubic-bezier(0.25, 1, 0.5, 1)' },
};

/**
 * Computes exact position x(t) of a damped spring oscillator
 */
export function calculateSpringPosition(t, { mass = 1, stiffness = 100, damping = 10, initialVelocity = 0 }) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * w0 * t);
    return 1 - envelope * (Math.cos(wd * t) + ((zeta * w0 - initialVelocity) / wd) * Math.sin(wd * t));
  } else {
    return 1 - Math.exp(-w0 * t) * (1 + (w0 - initialVelocity) * t);
  }
}

/**
 * Calculates cascading stagger delay for list elements
 */
export function getStaggerDelay(index, stepMs = 35, maxCapMs = 350) {
  return Math.min(index * stepMs, maxCapMs);
}
