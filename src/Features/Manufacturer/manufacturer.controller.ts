import { Request, Response } from "express";
import db from "../../Config/db";

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();
        const { manufacturerId } = req.params;
        const { category, price, order } = req.query;

        let query = `
        MATCH (manufacturer:Manufacturer {id: $manufacturerId})-[:PRODUCES]->(product)
      `;

        // Apply category filter if provided
        if (category) {
            query += `
          WHERE product.category = $category
        `;
        }

        // Apply price and order filters if provided
        if (price === "low-to-high") {
            query += `
          ORDER BY product.price ASC
        `;
        } else if (price === "high-to-low") {
            query += `
          ORDER BY product.price DESC
        `;
        } else if (order) {
            query += `
          ORDER BY product.${order} ASC
        `;
        }

        query += `
        RETURN product
      `;

        const products = await session.run(query, { manufacturerId, category });
        const formattedProducts = products.records.map(record => {
            return record.get("p.name");
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
        const {
            id,
            name,
            price,
            sku,
            manufacturer,
            warehouseId,
            initialStock
        } = req.body;

        // Crear el producto y relacionarlo con el fabricante
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

        // Incrementar el stock en el almacén específico
        await session.run(
            `
            MATCH (w:Warehouse {id: $warehouseId})
            SET w.stock = w.stock + $initialStock
            RETURN w
            `,
            { warehouseId, initialStock }
        );

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

export async function getManufacturers(req: Request, res: Response) {
    try {
        const session = db.session();

        const manufacturers = await session.run(
            `
            MATCH (m:Manufacturer) 
            RETURN m
            `
        );

        const formattedManufacturers = manufacturers.records.map(record => {
            return record.get("m").properties;
        });

        res.json(formattedManufacturers);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}
