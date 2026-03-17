import express,{Request,Response} from 'express';
import { insertCategories } from '../scripts/category';
import { db } from '../lib/db';
import { categoriesTable } from '../schema';

const scriptRouter = express.Router();
scriptRouter.get('/insertCategories', async (req:Request, res:Response):Promise<any> => {
     try {
        const previousLength = (await db.select().from(categoriesTable)).length;
        const result = await insertCategories();
        const currentLength = (await db.select().from(categoriesTable)).length;
        return res.status(200).json({
            success:true,
            message:`${currentLength-previousLength} categories inserted`,
            result,
            previousLength,
            currentLength
        })
     } catch (error) {
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
     }
});

export default scriptRouter;