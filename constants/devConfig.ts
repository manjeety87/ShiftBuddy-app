// Development ke liye — jab tumhe sirf UI test karni ho, backend/login se guzre bina.
// PRODUCTION build me ye automatically OFF ho jata hai (__DEV__ check ki wajah se) —
// isliye ye kabhi galti se live app me active nahi hoga.
export const DEV_BYPASS_AUTH = __DEV__ && false; // ← false karke normal login flow pe wapas aa jaoge

export const MOCK_USER = {
    id: 'dev-mock-user-id',
    name: 'Dev User',
    email: 'dev@shiftbuddy.test',
    avatarUrl: null,
    isEmailVerified: true,
    hasPassword: true,
    taxDeductionPercent: 13,
};