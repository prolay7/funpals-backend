export interface IMeetInvitePayLoad{
  user:{
      name:string,
      profilephoto:string
    },
    creatorId:number,
    isAccepted:boolean,
    meetDesc:string,
    meetTitle:string,
    isCussWordOn:boolean,
    isSpecialCategory:boolean,
    meetCategory:number
}
export type IMeetInviteHandlerPayLoad = {
   user:{
      name:string,
      profilephoto:string
    },
    creatorId:number,
    isAccepted:boolean,
    meetDesc:string,
    meetTitle:string,
    isCussWordOn:boolean,
    isSpecialCategory:boolean,
    meetCategory:number,
    targetUserId:number
  }

  export interface IUser{
  id: number;
  name: string;
  email: string;
  googlerefreshtoken?: string | null;
  agerange?: number | null;
  numberOfUsersMarkedasVerified: number;
  profilephoto?: string | null;
  lastJoinedMeet?: number | null;
  isCussWordOn: boolean;
  isSpecialCategoryOptIn: boolean;
  zipcode?: number | null;
  fcmToken?: string | null;
  isAccountActive: boolean;
  lastUpdatedBy?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface IMeetLinkAndNotifyPayload {
  creatorId:number,
  targetId:number,
  meetTitle:string,
  meetDesc:string,
  meetCategory:number,
  isSpecialCategory:boolean,
  isCussWordOn:boolean
}



export interface IIssue {
  id: number,
  title: string,
  description: string,
  status: number,
  createdAt: string,
  updatedAt: string,
  category:number,
  user:{
    id: number,
    name: string,
    profilephoto: string,
    status: string 
  }
}


export interface ILiveMeeting {
  id: number;
  meetLink: string | null;
  streamCallId: string | null;
  numberOfUsers: number;
  isActive: boolean | null;
  meetTitle: string;
  meetDescription: string;
  meetCategory: number;
  isSpecialCategory: boolean;
  isCussWordOn: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}


export type MeetingRow = {
  id: number;
  meet_link: string | null;
  stream_call_id: string | null;
  number_of_users: number;
  is_active: boolean | null;
  meet_title: string;
  meet_description: string;
  meet_category: number;
  is_special_category: boolean;
  is_cuss_word_on: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
};


export type IssueRow = {
  id: number;
  title: string;
  description: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  category: number;
  userId: number;
  userName: string;
  userProfilePhoto: string;
};

export type CategoryRow = {
  id: number;
  name: string;
  isSpecial: boolean | null;
  details: string | null;
};


export type User = {
  id: number;
  name: string;
  email?: string;
  status: string;
  profilephoto?: string;
};


export type Skill = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  createdBy: number;
  user: {
    id: number;
    name: string;
    profilePhoto?: string | null;
    status: string;
  };
};


export interface IGroup{
  id: number;
  groupName: string;
  description: string | null;
  groupImage: string | null;
  createdBy: number[];
  createdAt: Date | null;
  updatedAt: Date | null;
  groupRules: string | null;
  lastMessage: Date | null;
}