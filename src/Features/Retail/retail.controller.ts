import { Request, Response } from "express";
import db from "../../Config/db";

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();

        const products = await session.run(
            `
            MATCH (w:Warehouse)-[r:STORES]-(p:Product) 
            return p, r.quantity as quantity, w.name as warehouse
            LIMIT 25
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

export async function placeOrder(req: Request, res: Response) {
    try {
        const session = db.session();
        // const { retailerId, warehouseId, products } = req.body;

        // mock data
        const retailerId = "a1b91205-48f3-47af-8e9a-713e7fb734a7";
        const warehouseId = "91b11e9b-239d-49c4-aa23-ef01d4961984";
        const products = [
            { id: "9ed22c44-9bf1-4cc3-aaee-37faef9cc6fb", quantity: 2 },
            { id: "cd8e999c-38a0-455b-92a6-7e036f1aaddc", quantity: 1 }
        ];

        // Calculate total price
        let totalPrice = 0;
        for (const product of products) {
            const productRecord = await session.run(
                `
          MATCH (p:Product {id: $productId})
          RETURN p.price as price
          `,
                { productId: product.id }
            );
            totalPrice +=
                productRecord.records[0].get("price") * product.quantity;
        }

        const order = await session.run(
            `
        MATCH (r:Retailer {id: $retailerId})
        MATCH (w:Warehouse {id: $warehouseId})
        CREATE (o:Order {id: randomUUID(), status: "PENDING", createdAt: datetime(), total: $totalPrice})
        CREATE (r)-[:PLACES  {
            order_date: datetime(),
            payment_method: "CREDIT_CARD",
            payment_status: "PAID"
        }]->(o)
        CREATE (o)-[:FULFILLED_BY {
            status: "PENDING",
            assignedDate: datetime(),
            estimatedShippingDate: datetime() + duration({days: 3})
        }]->(w)
        WITH o
        UNWIND $products as product
        MATCH (p:Product {id: product.id})
        CREATE (o)-[:CONTAINS {
            quantity: product.quantity, 
            unit_price: p.price, 
            subtotal: p.price * product.quantity
        }]->(p)
        RETURN o
        `,
            { retailerId, warehouseId, products, totalPrice }
        );

        res.json(order.records[0].get("o").properties);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getOrders(req: Request, res: Response) {
    try {
        const session = db.session();
        const orders = await session.run(
            `
            MATCH (r:Retailer)-[p:PLACES]-(o:Order)-[:FULFILLED_BY]-(w:Warehouse)
            return o.id as id, o.status as status, p.order_date as placed_at, 
            o.total as total, w.name as warehouse
        `
        );

        const formattedOrders = orders.records.map(record => {
            return {
                id: record.get("id"),
                status: record.get("status"),
                placed_at: record.get("placed_at"),
                total: record.get("total"),
                warehouse: record.get("warehouse")
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

function generateOrderId(): string {
    const timestamp = Date.now().toString();
    const randomString = Math.random().toString(36).substring(7);
    return `ORD-${timestamp}-${randomString}`;
}
