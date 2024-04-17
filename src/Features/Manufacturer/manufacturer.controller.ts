import { Request, Response } from "express";
import db from "../../Config/db";

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();
        const { manufacturerId } = req.params;

        const products = await session.run(
            `
            MATCH (manufacturer:Manufacturer {id: $manufacturerId})-[:PRODUCES]->(product)
            RETURN product
            `,
            { manufacturerId }
        );

        const formattedProducts = products.records.map(record => {
            return record.get("product").properties;
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

export async function updateProductSku(req: Request, res: Response) {
    try {
        const session = db.session();
        const { id, newSku } = req.body;

        const result = await session.run(
            `
            MATCH (p:Product {id: $id})
            SET p.sku = $newSku
            RETURN p
            `,
            { id, newSku }
        );

        const updatedProduct = result.records[0].get("p").properties;

        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getSupplier(req: Request, res: Response) {
    try {
        const session = db.session();
        const { manufacturerId } = req.params;

        const result = await session.run(
            `
            MATCH (manufacturer:Manufacturer)-[:USES]->(supplier:Supplier)
            WHERE manufacturer.id = $manufacturerId
            RETURN supplier
            `,
            { manufacturerId }
        );

        const formattedResult = result.records.map(record => {
            return record.get("supplier").properties;
        });

        console.log(formattedResult);

        res.json(formattedResult);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}