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
        const { retailerId, warehouseId, products } = req.body;

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
        const retailerId = req.params.retailerId;

        const orders = await session.run(
            `
            MATCH (r:Retailer {id: $retailerId})-[p:PLACES]-(o:Order)-[:FULFILLED_BY]-(w:Warehouse)
            RETURN o.id as id, o.status as status, 
            apoc.date.format(p.order_date.epochMillis, 'ms', 'yyyy-MM-dd HH:mm:ss') as placed_at, 
            o.total as total, w.name as warehouse
        `,
            { retailerId }
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

export async function getOrderById(req: Request, res: Response) {
    try {
        const session = db.session();
        const orderId = req.params.orderId;

        const result = await session.run(
            `
            MATCH (o:Order {id: $orderId})
            OPTIONAL MATCH (o)-[:CONTAINS]-(p:Product)
            OPTIONAL MATCH (o)-[:SHIPPED_VIA]->(s:Shipment)
            RETURN o.id as id, o.status as status, o.total as total, p, p.quantity as quantity,
                   s.shipment_id as shipmentId, apoc.date.format(s.date.epochMillis, 'ms', 'yyyy-MM-dd') as shipmentDate, s.tracking_number as trackingNumber
            `,
            { orderId }
        );

        if (result.records.length === 0) {
            res.status(404).json({ error: "Order not found" });
            return;
        }

        const formattedOrder = {
            id: result.records[0].get("id"),
            status: result.records[0].get("status"),
            total: result.records[0].get("total"),
            products: result.records.map(record => {
                return {
                    product: { ...record.get("p").properties },
                    quantity: record.get("quantity")
                };
            }),
            shipment: result.records[0].get("shipmentId")
                ? {
                      id: result.records[0].get("shipmentId"),
                      shippedAt: result.records[0].get("shipmentDate"),
                      trackingNumber: result.records[0].get("trackingNumber"),
                      status: result.records[0].get("status")
                  }
                : null
        };

        res.json(formattedOrder);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function receiveOrder(req: Request, res: Response) {
    try {
        const session = db.session();
        const orderId = req.params.orderId;

        const result = await session.run(
            `
        MATCH (o:Order {id: $orderId})-[:SHIPPED_VIA]->(s:Shipment)
        SET o.status = 'RECEIVED', s.status = 'DELIVERED'
        RETURN o.id as orderId, o.status as orderStatus, s.shipment_id as shipmentId, s.status as shipmentStatus
        `,
            { orderId }
        );

        if (result.records.length === 0) {
            res.status(404).json({ error: "Order or shipment not found" });
            return;
        }

        const updatedOrder = {
            id: result.records[0].get("orderId"),
            status: result.records[0].get("orderStatus"),
            shipment: {
                id: result.records[0].get("shipmentId"),
                status: result.records[0].get("shipmentStatus")
            }
        };

        res.json(updatedOrder);
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
