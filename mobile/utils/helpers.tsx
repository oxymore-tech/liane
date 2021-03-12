  
export const stateConditionString = (state: any) => {
    let navigateTo = '';
    if (state.isLoading) {
        console.log('LOAD_APP');
        navigateTo = 'LOAD_APP';
    }
    if (state.isSignedIn && state.userToken && state.isSignedUp) {
        console.log('LOAD HOME');
        navigateTo = 'LOAD_HOME';
    }
    if (!state.isSignedUp && state.noAccount) {
        navigateTo = 'LOAD_SIGNUP';
    }
    if (!state.isSignedIn && !state.noAccount) {
        console.log('LOAD_SIGNIN');
        navigateTo = 'LOAD_SIGNIN';
    }
    return navigateTo;
};