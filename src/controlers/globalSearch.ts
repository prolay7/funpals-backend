import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { Request, Response } from "express";
import { configDotenv } from "dotenv";
import RedisClient from "../redis";
import { getUserKey } from "../redis/keys";
import { userStatus } from "../lib/constants";
import { CategoryRow, IGroup, IIssue, ILiveMeeting, IssueRow, MeetingRow, Skill, User } from "../types";
configDotenv();

interface GlobalSearchParams {
  searchQuery: string;
  isUserSearch: boolean;
  isCategorySearch: boolean;
  isIssuesSearch: boolean;
  isGroupSearch: boolean;
  isSkillSearch: boolean;
  isMeetingSearch: boolean;
  isActivitySearch: boolean;
  isMaterialSearch: boolean;
}

export const searchCategories = async (
  q: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  data: CategoryRow[];
  hasMore: boolean;
  nextPage: number;
}> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<CategoryRow>(sql`
    SELECT 
      id, 
      name, 
      is_special AS "isSpecial", 
      details
    FROM categories
    WHERE depth = 1
      AND (
        name ILIKE ${"%" + q + "%"}
        OR details ILIKE ${"%" + q + "%"}
        OR similarity(name || ' ' || coalesce(details,''), ${q}) > 0.3
      )
    ORDER BY similarity(name || ' ' || coalesce(details,''), ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  // pagination check
  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();

  return {
    data: result.rows,
    hasMore,
    nextPage: page + 1
  };
};

export const searchUsers = async (
  q: string,
  page: number = 1,
  limit: number = 10,
  userId: number
): Promise<{
  data: User[];
  hasMore: boolean;
  nextPage: number;
}> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<Omit<User, "status">>(sql`
    SELECT 
      id, 
      name, 
      email, 
      profile_photo AS "profilephoto"
    FROM users
    WHERE is_account_active = true
      AND id <> ${userId}
      AND (
        name ILIKE ${"%" + q + "%"}
        OR similarity(name, ${q}) > 0.3
      )
    ORDER BY similarity(name, ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();

  const keys = result.rows.map((u) => getUserKey(u.id));
  let statuses: (string | null)[] = [];
  if (keys.length > 0) {
    statuses = (await RedisClient.getInstance()?.multiGet(keys)) || [];
  }

  const users: User[] = result.rows.map((u, idx) => ({
    ...u,
    status: statuses[idx] || userStatus.OFFLINE,
  }));

  return {
    data: users,
    hasMore,
    nextPage: page + 1,
  };
};

export const searchGroups = async (
  q: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: IGroup[]; hasMore: boolean; nextPage: number }> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<{
    id: number;
    groupName: string;
    description: string | null;
    groupImage: string | null;
    createdBy: number[];
    createdAt: Date;
    updatedAt: Date;
    groupRules: string | null;
    lastMessage: Date | null;
  }>(sql`
    SELECT 
      g.id,
      g.group_name AS "groupName",
      g.description,
      g.group_image AS "groupImage",
      g.created_by AS "createdBy",
      g.created_at AS "createdAt",
      g.updated_at AS "updatedAt",
      g.group_rules AS "groupRules",
      g.last_message AS "lastMessage"
    FROM groups g
    WHERE g.group_name ILIKE ${"%" + q + "%"}
      OR g.description ILIKE ${"%" + q + "%"}
      OR similarity(g.group_name || ' ' || coalesce(g.description, ''), ${q}) > 0.3
    ORDER BY similarity(g.group_name || ' ' || coalesce(g.description, ''), ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();

  const groups: IGroup[] = result.rows.map((row) => ({
    id: row.id,
    groupName: row.groupName,
    description: row.description,
    groupImage: row.groupImage,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    groupRules: row.groupRules,
    lastMessage: row.lastMessage,
  }));

  return {
    data: groups,
    hasMore,
    nextPage: page + 1,
  };
};

export const searchIssues = async (
  q: string,
  page: number = 1,
  limit: number = 10,
  userId: number,
): Promise<{
  data: IIssue[];
  hasMore: boolean;
  nextPage: number;
}> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<IssueRow>(sql`
    SELECT 
      i.id, 
      i.title, 
      i.description, 
      i.status,
      TO_CHAR(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
      TO_CHAR(i.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt",
      i.category,
      u.id AS "userId",
      u.name AS "userName",
      u.profile_photo AS "userProfilePhoto"
    FROM issues i
    JOIN users u ON u.id = i.user_id
    WHERE i.is_public = true
      AND i.user_id <> ${userId}
      AND (
        i.title ILIKE ${"%" + q + "%"}
        OR i.description ILIKE ${"%" + q + "%"}
        OR similarity(i.title || ' ' || i.description, ${q}) > 0.3
      )
    ORDER BY similarity(i.title || ' ' || i.description, ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);
  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();
  const issues: IIssue[] = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.category,
    user: {
      id: row.userId,
      name: row.userName,
      profilephoto: row.userProfilePhoto,
      status: userStatus.OFFLINE
    }
  }));

  const keys = issues.map((issue) => getUserKey(issue.user.id));
  if (keys.length > 0) {
    const statuses = await RedisClient.getInstance()?.multiGet(keys);
    issues.forEach((issue, index) => {
      issue.user.status = statuses?.[index] || userStatus.OFFLINE;
    });
  }
  return {
    data: issues,
    hasMore,
    nextPage: page + 1
  };
};

export const searchSkills = async (
  q: string,
  page: number = 1,
  limit: number = 10,
  userId: number
): Promise<{ data: Skill[]; hasMore: boolean; nextPage: number }> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    createdBy: number;
    userId: number;
    userName: string;
    userProfilePhoto?: string | null;
  }>(sql`
    SELECT 
      s.id, 
      s.title, 
      s.description, 
      s.status,
      s.user_id AS "createdBy",
      u.id AS "userId",
      u.name AS "userName",
      u.profile_photo AS "userProfilePhoto"
    FROM skills s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id <> ${userId}
      AND (
        s.title ILIKE ${"%" + q + "%"}
        OR s.description ILIKE ${"%" + q + "%"}
        OR similarity(s.title || ' ' || coalesce(s.description,''), ${q}) > 0.3
      )
    ORDER BY similarity(s.title || ' ' || coalesce(s.description,''), ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();

  const keys = result.rows.map((row) => getUserKey(row.userId));
  let statuses: (string | null)[] = [];
  if (keys.length > 0) {
    statuses = (await RedisClient.getInstance()?.multiGet(keys)) || [];
  }
  const skills: Skill[] = result.rows.map((row, idx) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    createdBy: row.createdBy,
    user: {
      id: row.userId,
      name: row.userName,
      profilePhoto: row.userProfilePhoto,
      status: statuses[idx] || userStatus.OFFLINE,
    },
  }));

  return {
    data: skills,
    hasMore,
    nextPage: page + 1,
  };
};


export const searchMeetings = async (
  q: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  data: ILiveMeeting[];
  hasMore: boolean;
  nextPage: number;
}> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<MeetingRow>(sql`
    SELECT 
      id,
      meet_link,
      stream_call_id,
      number_of_users,
      is_active,
      meet_title,
      meet_description,
      meet_category,
      is_special_category,
      is_cuss_word_on,
      created_by,
      created_at,
      updated_at
    FROM meetings
    WHERE is_active = true
      AND (
        meet_title ILIKE ${"%" + q + "%"}
        OR meet_description ILIKE ${"%" + q + "%"}
        OR similarity(meet_title || ' ' || meet_description, ${q}) > 0.3
      )
    ORDER BY similarity(meet_title || ' ' || meet_description, ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();
  const meetings: ILiveMeeting[] = result.rows.map((row) => ({
    id: row.id,
    meetLink: row.meet_link,
    streamCallId: row.stream_call_id,
    numberOfUsers: row.number_of_users,
    isActive: row.is_active,
    meetTitle: row.meet_title,
    meetDescription: row.meet_description,
    meetCategory: row.meet_category,
    isSpecialCategory: row.is_special_category,
    isCussWordOn: row.is_cuss_word_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return {
    data: meetings,
    hasMore,
    nextPage: page + 1
  };
};



export const searchActivities = async (
  q: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: any[]; hasMore: boolean; nextPage: number }> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<{
    id: number;
    title: string;
    description: string | null;
    imageUrl: string | null;
    address: string | null;
    externalUrl: string | null;
    categoryId: number | null;
    categoryName: string | null;
  }>(sql`
    SELECT
      a.id,
      a.title,
      a.description,
      a.image_url   AS "imageUrl",
      a.address,
      a.external_url AS "externalUrl",
      a.category_id  AS "categoryId",
      ac.name        AS "categoryName"
    FROM activities a
    LEFT JOIN activity_categories ac ON ac.id = a.category_id
    WHERE a.is_active = true
      AND (
        a.title ILIKE ${"%" + q + "%"}
        OR a.description ILIKE ${"%" + q + "%"}
        OR similarity(a.title || ' ' || coalesce(a.description, ''), ${q}) > 0.3
      )
    ORDER BY similarity(a.title || ' ' || coalesce(a.description, ''), ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();
  return { data: result.rows, hasMore, nextPage: page + 1 };
};

export const searchMaterials = async (
  q: string,
  page: number = 1,
  limit: number = 10
): Promise<{ data: any[]; hasMore: boolean; nextPage: number }> => {
  const offset = (page - 1) * limit;

  const result = await db.execute<{
    id: number;
    title: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    externalUrl: string | null;
    address: string | null;
  }>(sql`
    SELECT
      id,
      title,
      description,
      category,
      image_url    AS "imageUrl",
      external_url AS "externalUrl",
      address
    FROM materials
    WHERE is_active = true
      AND (
        title ILIKE ${"%" + q + "%"}
        OR description ILIKE ${"%" + q + "%"}
        OR similarity(title || ' ' || coalesce(description, ''), ${q}) > 0.3
      )
    ORDER BY similarity(title || ' ' || coalesce(description, ''), ${q}) DESC
    LIMIT ${limit + 1} OFFSET ${offset}
  `);

  const hasMore = result.rows.length > limit;
  if (hasMore) result.rows.pop();
  return { data: result.rows, hasMore, nextPage: page + 1 };
};

export const globalSearch:any = async (req: Request, res: Response) => {
  try {
    const {
      searchQuery,
      isUserSearch,
      isCategorySearch,
      isIssuesSearch,
      isGroupSearch,
      isSkillSearch,
      isMeetingSearch,
      isActivitySearch,
      isMaterialSearch,
    } = req.query as any;

    const q = String(searchQuery || "").trim();
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const searchParams: GlobalSearchParams = {
      searchQuery: q,
      isUserSearch: isUserSearch === "true",
      isCategorySearch: isCategorySearch === "true",
      isIssuesSearch: isIssuesSearch === "true",
      isGroupSearch: isGroupSearch === "true",
      isSkillSearch: isSkillSearch === "true",
      isMeetingSearch: isMeetingSearch === "true",
      isActivitySearch: isActivitySearch === "true",
      isMaterialSearch: isMaterialSearch === "true",
    };

    const GLOBAL_SEARCH_LIMIT = parseInt(process.env.GLOBAL_SEARCH_LIMIT!) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const userId = req.body.user.id;

    let data: any = {
      data: {},
      hasMore: false,
      nextPage: page + 1
    };


    switch (true) {
      case searchParams.isUserSearch:
        data = await searchUsers(q, page, GLOBAL_SEARCH_LIMIT, userId);
        break;
      case searchParams.isCategorySearch:
        data = await searchCategories(q, page, GLOBAL_SEARCH_LIMIT);
        break;
      case searchParams.isIssuesSearch:
        data = await searchIssues(q, page, GLOBAL_SEARCH_LIMIT, userId);
        break;
      case searchParams.isGroupSearch:
        data = await searchGroups(q, page, GLOBAL_SEARCH_LIMIT);
        break;
      case searchParams.isSkillSearch:
        data = await searchSkills(q, page, GLOBAL_SEARCH_LIMIT, userId);
        break;
      case searchParams.isMeetingSearch:
        data = await searchMeetings(q, page, GLOBAL_SEARCH_LIMIT);
        break;
      case searchParams.isActivitySearch:
        data = await searchActivities(q, page, GLOBAL_SEARCH_LIMIT);
        break;
      case searchParams.isMaterialSearch:
        data = await searchMaterials(q, page, GLOBAL_SEARCH_LIMIT);
        break;
      default:
        break;
    }

    return res.status(200).json({
      success: true,
      query: q,
      ...data,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
