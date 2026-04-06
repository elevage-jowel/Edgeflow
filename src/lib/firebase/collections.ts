export const col = {
  user: (uid: string) => `users/${uid}`,
  trades: (uid: string) => `users/${uid}/trades`,
  trade: (uid: string, id: string) => `users/${uid}/trades/${id}`,
  goals: (uid: string) => `users/${uid}/goals`,
  goal: (uid: string, id: string) => `users/${uid}/goals/${id}`,
  playbooks: (uid: string) => `users/${uid}/playbooks`,
  playbook: (uid: string, id: string) => `users/${uid}/playbooks/${id}`,
  reviews: (uid: string) => `users/${uid}/reviews`,
  review: (uid: string, id: string) => `users/${uid}/reviews/${id}`,
  backtests: (uid: string) => `users/${uid}/backtests`,
  backtest: (uid: string, id: string) => `users/${uid}/backtests/${id}`,
  // Scoring
  setupPlans: (uid: string) => `users/${uid}/setupPlans`,
  setupPlan: (uid: string, id: string) => `users/${uid}/setupPlans/${id}`,
  verifications: (uid: string) => `users/${uid}/verifications`,
  verification: (uid: string, id: string) => `users/${uid}/verifications/${id}`,
}
