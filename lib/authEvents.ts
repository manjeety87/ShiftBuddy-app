type Listener = () => void;
let listeners: Listener[] = [];

export const onSessionExpired = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const emitSessionExpired = () => {
  listeners.forEach((l) => l());
};