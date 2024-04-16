import { Request, Response } from "express";
import db from "../../Config/db";

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();

        const products = await session.run(
            `
            MATCH (w:Warehouse)-[r:STORES]-(p:Product) 
            WHERE w.name = "Warehouse X" 
            RETURN p, r.quantity as quantity, w.name as warehouse
            `
        );

        const formattedProducts = products.records.map(record => {
            return {
                product: { ...record.get("p").properties },
                quantity: record.get("quantity"),
                warehouse: record.get("warehouse")
            };
        });

        console.log(formattedProducts);

        res.json(formattedProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function createProduct(req: Request, res: Response) {
    try {
        const session = db.session();
        const { id, name, price, sku, manufacturer } = req.body;

        const result = await session.run(
            `
            CREATE (p:Product {id: $id, name: $name, price: $price, sku: $sku})
            WITH p
            MATCH (m:Manufacturer {name: $manufacturer})
            CREATE (m)-[:MANUFACTURES]->(p)
            RETURN p
            `,
            { id, name, price, sku, manufacturer }
        );

        const createdProduct = result.records[0].get("p").properties;

        res.json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}
