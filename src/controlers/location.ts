import { Request, Response } from "express";
import { getLocationSuggestions, reverseLocation } from "../lib/utils/location";
import { db } from "../lib/db";
import { userLikedCategoriesTable, usersTable } from "../schema";
import { eq, sql } from "drizzle-orm";
import { getUserKey } from "../redis/keys";
import RedisClient from "../redis";
import { userStatus } from "../lib/constants";
import { configDotenv } from "dotenv";
configDotenv();
const MAX_LOCATION_DIAMETER_IN_KM = Number(process.env.MAX_LOCATION_DIAMETER_IN_KM) || 200;

export const getSuggestions:any = async (req:Request,res:Response)=>{
    try {
        const {searchQuery} = req.query;
        if(!searchQuery) return res.status(400).json({
            success:false,
            message:"Please provide a querrry"
        })
        const suggestions = await getLocationSuggestions(String(searchQuery));
        return res.status(200).json({
            success:true,
            suggestions
        });
    } catch (error) {
        console.log("Error while fetching location suggestions",error);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        })
    }
}

export const updateUserLocation:any = async(req:Request,res:Response)=>{
    try {
        const {lat,lon,user} = req.body;
        const userId = user.id;
        const locationDisplayName = await reverseLocation(lat,lon);
        await db.update(usersTable).set({
            location: sql`ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`,
            locationDisplayName,
        }).where(eq(usersTable.id, userId));
        return res.status(200).json({
            success:true,
            message:"User location updated successfully",
            locationDisplayName
        });
    } catch (error) {
        console.log("Error while updating user location",error);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}



export async function findNearbyUsers(lat: number, lon: number, radiusKm: number, userId: number) {
  const result = await db.execute(sql`
    SELECT id, name, profile_photo AS profilephoto, location_display_name AS locationDisplayName,
           ST_Distance(
             location,
             ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
           ) AS distance_meters
    FROM ${usersTable}
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
      ${radiusKm * 1000}
    )
    AND id != ${userId}
    ORDER BY distance_meters ASC
  `);
  return result.rows;
}


export async function findNearbyUsersByCategory(
  lat: number,
  lon: number,
  radiusKm: number,
  categoryId: number,
  userId: number
) {
  const result = await db.execute(sql`
    SELECT 
      u.id, 
      u.name, 
      u.profile_photo AS profilephoto, 
      u.location_display_name AS locationDisplayName,
      ST_Distance(
        u.location,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      ) AS distance_meters
    FROM ${usersTable} u
    JOIN ${userLikedCategoriesTable} ulc ON ulc.user_id = u.id
    WHERE ulc.category_id = ${categoryId}
      AND ST_DWithin(
        u.location,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusKm * 1000}
      )
      AND u.id != ${userId}
    ORDER BY distance_meters ASC
  `);

  return result.rows;
}


export const getNearByUsers:any = async (req: Request, res: Response) => {
  try {
    const userId = req.body.user.id;
    const { lat, lon, radiusKm, categoryId } = req.query;
    let users = categoryId?
    await findNearbyUsersByCategory(Number(lat), Number(lon), 
    Math.min(Number(radiusKm), MAX_LOCATION_DIAMETER_IN_KM), Number(categoryId), userId)
    :await findNearbyUsers(Number(lat), Number(lon), Math.min(Number(radiusKm), MAX_LOCATION_DIAMETER_IN_KM), userId);
    if(users.length === 0) return res.status(200).json({
      success: true,
      message: 'No nearby users found',
      users: []
    });
    const keys = users.map((user: any) => getUserKey(user.id));
    const statuses = await RedisClient.getInstance()?.multiGet(keys);
    users = users.map((user, index) => {
      return {
        ...user,
        status: statuses[index] || userStatus.OFFLINE,
      };
    });
    return res.status(200).json({
      success: true,
      message: 'Nearby users fetched successfully',
      users
    });
  } catch (error) {
    console.log("Error while fetching nearby users", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}
