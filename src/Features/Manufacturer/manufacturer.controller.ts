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

export async function getManufacturers(req: Request, res: Response) {
    try {
        const session = db.session();

        const manufacturers = await session.run(
            `
            MATCH (manufacturer:Manufacturer)
            RETURN manufacturer
            `
        );

        const formattedManufacturers = manufacturers.records.map(record => {
            return record.get("manufacturer").properties;
        });

        return res.json(formattedManufacturers);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getFilteredProducts(req: Request, res: Response) {
    try {
        const session = db.session();
        const { manufacturerId, price, order } = req.query;
        let query = "";
        let params = {};

        query += ` MATCH (product:Product) `;

        if (manufacturerId) {
            query += ` WHERE (product)<-[:PRODUCES]-(:Manufacturer {id: $manufacturerId}) `;
            params["manufacturerId"] = manufacturerId;
        }

        // Apply price and order filters if provided
        if (price === "low-to-high") {
            query += ` WITH product ORDER BY product.price ASC `;
        } else if (price === "high-to-low") {
            query += ` WITH product ORDER BY product.price DESC `;
        } else if (order === "orderValue1") {
            query += ` WITH product ORDER BY product.orderValue1 ASC `;
        } else if (order === "orderValue2") {
            query += ` WITH product ORDER BY product.orderValue2 ASC `;
        }

        query += ` RETURN product `;

        console.log(query);

        const products = await session.run(query, params);
        const formattedProducts = products.records.map(record => {
            return record.get("product").properties;
        });

        res.json(formattedProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function createProduct(req: Request, res: Response) {
    try {
        const session = db.session();
        const { name, price, sku, manufacturerId, ...additionalFields } =
            req.body;

        let productProperties = `{name: $name, price: $price, sku: $sku`;
        for (const [key, value] of Object.entries(additionalFields)) {
            productProperties += `, ${key}: "${value}"`;
        }
        productProperties += `}`;

        const result = await session.run(
            `
        CREATE (p:Product ${productProperties})
        SET p.id = apoc.create.uuid()
        WITH p
        MATCH (m:Manufacturer {id: $manufacturerId})
        CREATE (m)-[:PRODUCES]->(p)
        RETURN p
        `,
            { name, price, sku, manufacturerId }
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

export async function deleteProduct(req: Request, res: Response) {
    try {
        const session = db.session();
        const { productId } = req.params;

        const result = await session.run(
            `
        MATCH (p:Product {id: $productId})
        DETACH DELETE p
        `,
            { productId }
        );

        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getProductById(req: Request, res: Response) {
    try {
        const session = db.session();
        const { productId } = req.params;

        const result = await session.run(
            `
            MATCH (p:Product {id: $productId})
            RETURN p
            `,
            { productId }
        );

        const product = result.records[0].get("p").properties;
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function updateProduct(req: Request, res: Response) {
    try {
        const session = db.session();
        const { id, name, price, sku, ...additionalFields } = req.body;

        let updateProperties = ``;
        if (name) updateProperties += `p.name = $name, `;
        if (price) updateProperties += `p.price = $price, `;
        if (sku) updateProperties += `p.sku = $sku, `;

        for (const [key, value] of Object.entries(additionalFields)) {
            updateProperties += `p.${key} = "${value}", `;
        }

        // Remove the trailing comma and space
        updateProperties = updateProperties.slice(0, -2);

        const result = await session.run(
            `
        MATCH (p:Product {id: $id})
        SET ${updateProperties}
        RETURN p
        `,
            { id, name, price, sku }
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
