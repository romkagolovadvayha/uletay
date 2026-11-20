import { createContext, useContext } from 'react';

// DOM components have their own React root. A clock must also work there,
// without depending on the native application's data and settings providers.
const ClockContext = createContext<() => Date>(() => new Date());
export const ClockProvider = ClockContext.Provider;
export function useClock() { return useContext(ClockContext); }
