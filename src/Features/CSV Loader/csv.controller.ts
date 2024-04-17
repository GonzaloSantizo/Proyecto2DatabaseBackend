import { Request, Response } from "express";
import db from "../../Config/db";

export async function loadProductsFromCSV(req: Request, res: Response) {
    try {
        const session = db.session();

        const result = await session.run(
            `
            LOAD CSV WITH HEADERS FROM "https://raw.githubusercontent.com/GonzaloSantizo/Proyecto2DatabaseBackend/main/src/CSV%20Loader/Test.csv" AS row
            MERGE (p:Product {sku: row.sku})
            SET p.name = row.name, p.image_url = row.image_url, p.price = toFloat(row.price)
            RETURN p
            `
        );

        const formattedProducts = result.records.map(record => {
            return record.get("p").properties;
        });

        console.log(formattedProducts);

        res.json(formattedProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}