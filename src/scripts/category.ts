import { categories } from "../data/categories"
import { db } from "../lib/db"
import { categoriesTable } from "../schema"

export const insertCategories = async()=>{
    let count = 0;
    try {
        for(let category of categories){
            const [insertedcategory] = await db.insert(categoriesTable).values({
                name:category.category.trim(),
                depth:category.depth,
                level:1
            }).returning();
            count++;
            for(let subcategory of category.subcategories){
                const [insertedsubcategory] = await db.insert(categoriesTable).values({
                    name:subcategory.name.trim(),
                    details:subcategory?.details?.trim(),
                    isSpecial:subcategory?.special==='Y',
                    parentId:insertedcategory.id,
                    depth:category.depth-1,
                    level:2
                }).returning();
                count++;
                for(let subsubcategory of subcategory.subsubcategories){
                    await db.insert(categoriesTable).values({
                        name:subsubcategory.name.trim(),
                        details:subsubcategory?.details.trim(),
                        isSpecial:subsubcategory?.special==='Y',
                        parentId:insertedsubcategory.id,
                        depth:category.depth-2,
                        level:3
                    })
                    count++;
                }
            }
        }
        console.log('Categories inserted to db',count);
        return count;
    } catch (error) {
        console.log(error);
    }
}