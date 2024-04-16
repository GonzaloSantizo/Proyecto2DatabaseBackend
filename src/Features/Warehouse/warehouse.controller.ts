import { Request, Response } from "express";
import db from "../../Config/db";

export async function getWarehouses(req: Request, res: Response) {
    try {
        const session = db.session();

        const warehouses = await session.run(
            `
            MATCH (w:Warehouse) 
            RETURN w
            `
        );

        const formattedWarehouses = warehouses.records.map(record => {
            return record.get("w").properties;
        });

        console.log(formattedWarehouses);

        res.json(formattedWarehouses);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();

        const products = await session.run(
            `
            MATCH (w:Warehouse)-[r:STORES]-(p:Product) 
            WHERE w.name = $warehouseName
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

export async function updateProductSku(req: Request, res: Response) {
    try {
        const session = db.session();

        const { name, newSku } = req.body;

        const result = await session.run(
            `
            MATCH (p:Product { name: $name }) 
            SET p.sku = $newSku
            RETURN p
            `,
            { name, newSku }
        );

        const updatedProduct = result.records[0].get("p").properties;

        console.log(updatedProduct);

        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function deleteProduct(req: Request, res: Response) {
    try {
        const session = db.session();

        const { name } = req.body;

        const result = await session.run(
            `
            MATCH (p:Product { name: $name }) 
            DELETE p
            `,
            { name }
        );

        console.log(`Product ${name} deleted.`);

        res.json({ message: `Product ${name} deleted.` });
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}
