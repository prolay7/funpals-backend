export const userStatus = {
    ONLINE:'online',
    OFFLINE:'offline',
    BUSY:'busy'
} as const

export type userStatusType = 'online'|'offline'|'busy';
export type verificationStatusType = 'approved' | 'rejected'

export const DEFAULT_GROUP_IMAGE = 'https://www.pngfind.com/pngs/m/676-6764065_default-profile-picture-transparent-hd-png-download.png';
export const DEFAULT_PROFILE_PHOTO = 'https://www.pngfind.com/pngs/m/676-6764065_default-profile-picture-transparent-hd-png-download.png';


export enum ISSUE_STATUS {
    OPEN = 0,
    IN_PROGRESS = 1,
    RESOLVED = 2,
    CLOSED = 3
}