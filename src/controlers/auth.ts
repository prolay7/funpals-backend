import { client } from "../lib/google";
import {NextFunction, Request,Response} from 'express';
import { createOrupdateuser } from "./user";
import { createJwt, getTokenFromHeader, verifyJwt } from "../lib/helper";

export const exchangeToken:any = async(req:Request,res:Response)=>{
        const {serverAuthCode,email,name,profilephoto} = req.body;
        try{
          const { tokens } = await client.getToken(serverAuthCode);
          const googlerefreshtoken = tokens.refresh_token;
          if(!googlerefreshtoken) throw new Error('Unable to get refresh token');
          const {user,userLikedCategories} = await createOrupdateuser({name,email,profilephoto,googlerefreshtoken});
          const token = createJwt({id:user.id,email});
          
          return res.status(200).json({
            success:true,
            message:'Sign-Up/Sign-In successfull',
            token,
            user,
            userLikedCategories
          })
        }catch(error:any){
          console.log(error)
          res.status(500).json({
            success: false,
            message: "authentication faild"
          })
    }
}

export const signInWithoutToken:any = async(req:Request,res:Response)=>{
    const {email,name,profilephoto} = req.body;
    console.log('req.body',email,name,profilephoto);
    try{
      const {user,userLikedCategories} = await createOrupdateuser({name,email,profilephoto});
      const token = createJwt({id:user.id,email});
      return res.status(200).json({
        success:true,
        message:'Sign-Up/Sign-In successfull',
        token,
        user,
        userLikedCategories
      })
    }catch(error:any){
      console.log(error)
      res.status(500).json({
        success: false,
        message: "authentication failed"
      })
  }
}

export const authenticate:any = (req:Request,res:Response,next:NextFunction)=>{   
    try {
        const token = getTokenFromHeader(req) || req?.body?.token;
        if(!token) return res.status(404).json({
            success:'false',
            message:'unauthorised access'
        })
        const payload = verifyJwt(token);
        if(!payload?.id) return res.status(404).json({
            success:'false',
            message:'unauthorised access'
        }) 
        req.body = req.body || {};
        req.body.user = payload;
        next();
    } catch (error) {
      console.log('Authentication error =>',error);
        return res.status(500).json({
            success:false,
            message:'something went wrong 48'
        })
    }
}