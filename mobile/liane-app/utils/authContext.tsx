import { createContext } from 'react';

export const AuthContext = createContext({
    setDefault: 'set auth properties here',
    getPushToken: () => { return "" },
    signIn: async (data : any) => { },
    signOut: async () => { },
    signUp: async () => { }
});