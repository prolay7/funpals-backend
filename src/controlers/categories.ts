import {Request,Response} from 'express';
import { db } from '../lib/db';
import { categoriesTable, meetingTable, userLikedCategoriesTable, usersTable } from '../schema';
import { and, eq, inArray, not } from 'drizzle-orm';
import { getUserKey } from '../redis/keys';
import RedisClient from '../redis';
import { userStatus } from '../lib/constants';


export const getUserLikedCategories:any = async(req:Request,res:Response)=>{
    try {
        const {id} = req.body.user;
        const categories = await db
        .select({
          categoryId: userLikedCategoriesTable.categoryId,
          categoryDetails: categoriesTable,
          priority: categoriesTable.priority  
        })
        .from(userLikedCategoriesTable)
        .innerJoin(categoriesTable, eq(userLikedCategoriesTable.categoryId, categoriesTable.id))
        .where(eq(userLikedCategoriesTable.userId, id));
        return res.status(200).json({
            success:true,
            message:'user liked categories fetched',
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Internal server errro"
         })
    }
}


export const getTopLevelCategories:any = async(req:Request,res:Response)=>{
    try {
        const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.level,1));
        return res.status(200).json({
            success:true,
            message:'top level catgories',
            categories
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}


export const getChildCategories:any = async(req:Request,res:Response)=>{
   try {
    let {parentId} = req.query;
    if(!parentId || !Number(parentId)){
        return res.status(404).json({
            success:false,
            message:'Parent Id is required'
        })
    }
    const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.parentId,Number(parentId)));
    return res.status(200).json({
        success:true,
        message:'sub categories',
        categories
    })
   } catch (error) {
    return res.status(500).json({
        success:false,
        message:'Internal server error'
    })
   }
}


export const updateLikedCategories:any = async(req:Request,res:Response)=>{
    try {
        const {likeIds,unlikeIds} = req.body;
        const {id} = req.body?.user;
        if(!id || !likeIds || !unlikeIds || !Array.isArray(likeIds) || !Array.isArray(unlikeIds)) return res.status(404).json({
            success:false,
            message:'missing required fields'
        });
        const likedata = likeIds.map((cid)=>{
            return {
                userId:id,
                categoryId:cid
            }
        });
        await Promise.all([
            likedata.length>0 &&  await db
            .insert(userLikedCategoriesTable)
            .values(likedata)
            .onConflictDoNothing({
              target: [userLikedCategoriesTable.userId, userLikedCategoriesTable.categoryId]
            }),
            unlikeIds.length>0 && db.delete(userLikedCategoriesTable).where(
              and(
                eq(userLikedCategoriesTable.userId, id),
                inArray(userLikedCategoriesTable.categoryId, unlikeIds)
              )
            ),
          ]);
        const categories = await db.select({
            categoryId: categoriesTable.id,
            categoryName: categoriesTable.name,
            isSpecial: categoriesTable.isSpecial,
            priority: categoriesTable.priority  
          })
            .from(userLikedCategoriesTable)
            .leftJoin(categoriesTable, eq(userLikedCategoriesTable.categoryId, categoriesTable.id))
            .where(eq(userLikedCategoriesTable.userId, id))
        return res.status(200).json({
            success:true,
            message:'updated successfully',
            categories
        })          
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}

export const getOtherUsersOfCategory:any = async(req:Request,res:Response)=>{
   try {
    const {id} = req.body.user;
    const {categoryId} = req.query;
    const page = Number(req.query?.page) || 1;
    const limit = Number(req.query?.limit) || 10;
    const offset = (page-1)*10;
    if(!categoryId){
        return res.status(400).json({
            success:false,
            message:'Category id is required'
        })
    }
    const users = await db
      .select({
        name:usersTable.name,
        id:usersTable.id,
        email:usersTable.email,
        profilephoto:usersTable.profilephoto,
      })
      .from(usersTable)
      .leftJoin(userLikedCategoriesTable, eq(userLikedCategoriesTable.userId, usersTable.id))
      .where(
        and(
          eq(userLikedCategoriesTable.categoryId, Number(categoryId)),
          not(eq(usersTable.id, id)),
        )
      ).offset(offset).limit(limit+1);
      const hasMore = users.length>limit;
      if(hasMore) users.pop();
      const keys = users.map((user) => getUserKey(user.id));
      if(keys.length===0) return res.status(200).json({
        success:true,
        message:'Other users fetched',
        hasMore,
        users:[]
      })
      const statuses = await RedisClient.getInstance()?.multiGet(keys);
      const formattedUsers = users.map((user, index) => {
        return {
          ...user,
          status: statuses[index] || userStatus.OFFLINE,
        };
      })
      return res.status(200).json({
        success:true,
        message:'Other users fetched',
        hasMore,
        nextPage:page+1,
        users:formattedUsers
      })
   } catch (error) {
    console.log(error)
     return res.status(500).json({
        success:false,
        message:'Internal server error'
     })
   }
}



export const getMeetingsByCategoryId:any = async(req:Request,res:Response)=>{
  console.log('Fetching meetings for category:', req.params.id);
  try {
    const { id } = req.params;
    const {page,limit} = req.query;
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;
    const userId = req.body.user.id;
    const [user] = await db.select({
      userAllowsCussword: usersTable.isCussWordOn,
      userAllowsSpecial: usersTable.isSpecialCategoryOptIn
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    
    const meetings = await db
      .select().from(meetingTable).where(
        and(
           eq(meetingTable.meetCategory, Number(id)),
           eq(meetingTable.isActive, true),
           !user?.userAllowsCussword ? eq(meetingTable.isCussWordOn, false) : undefined,
           !user?.userAllowsSpecial ? eq(meetingTable.isSpecialCategory, false) : undefined
        )
      )
      .offset(offset)
      .limit(safeLimit+1);
      const hasMore = meetings.length > safeLimit;
      if (hasMore) meetings.pop();
      return res.status(200).json({
        success: true,
        message: 'Meetings fetched successfully',
        hasMore,
        meetings,
        nextPage: safePage + 1
      });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};