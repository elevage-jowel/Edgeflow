export const col = {
  user:       (uid: string) => `users/${uid}`,
  trades:     (uid: string) => `users/${uid}/trades`,
  trade:      (uid: string, tid: string) => `users/${uid}/trades/${tid}`,
  goals:      (uid: string) => `users/${uid}/goals`,
  goal:       (uid: string, gid: string) => `users/${uid}/goals/${gid}`,
  playbooks:  (uid: string) => `users/${uid}/playbooks`,
  playbook:   (uid: string, pid: string) => `users/${uid}/playbooks/${pid}`,
  reviews:    (uid: string) => `users/${uid}/reviews`,
  review:     (uid: string, rid: string) => `users/${uid}/reviews/${rid}`,
  backtests:  (uid: string) => `users/${uid}/backtests`,
  backtest:   (uid: string, bid: string) => `users/${uid}/backtests/${bid}`,
}
