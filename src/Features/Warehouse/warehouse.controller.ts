import { Request, Response } from "express";
import db from "../../Config/db";

export async function getOrders(req: Request, res: Response) {
    try {
        const session = db.session();
        const warehouseId = req.params.warehouseId;

        const orders = await session.run(
            `
        MATCH (w:Warehouse {id: $warehouseId})<-[:FULFILLED_BY]-(o:Order)-[:PLACES]-(r:Retailer)
        RETURN o.id as id, o.status as status, apoc.date.format(o.order_date.epochMillis, 'ms', 'yyyy-MM-dd HH:mm:ss') as placed_at, o.total as total, r.name as retailer
        `,
            { warehouseId }
        );

        const formattedOrders = orders.records.map(record => {
            return {
                id: record.get("id"),
                status: record.get("status"),
                placed_at: record.get("placed_at"),
                total: record.get("total"),
                retailer: record.get("retailer")
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}
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

export async function createShipment(req: Request, res: Response) {
    try {
        const session = db.session();
        const { orderId } = req.params;
        const {
            shipmentDate,
            estimatedDelivery,
            trackingNumber,
            status,
            carrier,
            shippingCost
        } = req.body;

        const result = await session.run(
            `
        MATCH (o:Order {id: $orderId})
        CREATE (s:Shipment {
          shipmentId: apoc.create.uuid(),
          date: $shipmentDate,
          trackingNumber: $trackingNumber,
          status: $status
        })
        CREATE (o)-[:SHIPPED_VIA {
          carrier: $carrier,
          shippingCost: $shippingCost,
          estimatedDelivery: $estimatedDelivery
        }]->(s)
        RETURN s
        `,
            {
                orderId,
                shipmentDate,
                estimatedDelivery,
                trackingNumber,
                status,
                carrier,
                shippingCost
            }
        );

        const createdShipment = result.records[0].get("s").properties;
        res.status(201).json(createdShipment);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getOrdersByWarehouse(req: Request, res: Response) {
    try {
        const session = db.session();

        const orders = await session.run(
            `
            MATCH (w:Warehouse {name: "Radiance Repository"})-[:FULFILLED_BY]-(o:Order)-[:PLACES]-(r:Retailer)
            RETURN o.id as id, o.status as status, apoc.date.format(o.order_date.epochMillis, 'ms', 'yyyy-MM-dd HH:mm:ss') as placed_at,
                   o.total as total, COLLECT(DISTINCT r.name) as retailers
            `
        );

        const formattedOrders = orders.records.map(record => {
            return {
                id: record.get("id"),
                status: record.get("status"),
                placed_at: record.get("placed_at"),
                total: record.get("total"),
                retailers: record.get("retailers")
            };
        });

        console.log(formattedOrders);

        res.json(formattedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}
