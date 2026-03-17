export const getUserKey = (id: number) => {
    return `user:${id}`;
};

export const getUserSocketKey = (id: number) => {
    return `user:${id}:sockets`;
};

export const getUserNotificationKey = (id: number) => {
    return `user:${id}:notification`;
};

export const MEETING_REQUEST_KEY = 'meeting_request';
export const VERIFICATION_REQUEST_KEY = 'verification_request';

export const getGoalTodayShownKey = (id: number) => `user:${id}:goal_today_shown`;