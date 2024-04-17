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

export async function createShipment(req: Request, res: Response) {
    try {
        const session = db.session();

        const { warehouseId, productName, orderId, shipmentId } = req.body;

        const result = await session.run(
            `
            MATCH (warehouse:Warehouse { id: $warehouseId })-[:STORES]->(product:Product { name: $productName })
            WITH warehouse, product
            MATCH (order:Order { order_id: $orderId })
            WHERE product.quantity >= order.total_amount
            WITH warehouse, product, order
            CREATE (shipment:Shipment)
            SET shipment.id = apoc.create.uuid(),
                shipment.shipment_id = $shipmentId,
                shipment.date = datetime(),
                shipment.tracking_number = apoc.create.uuid()
            CREATE (warehouse)-[:SHIPPED_VIA]->(shipment)-[:FULFILLS]->(order)
            SET order.status = "SHIPPED",
                product.quantity = product.quantity - order.total_amount
            RETURN warehouse, product, shipment, order;
            `,
            { warehouseId, productName, orderId, shipmentId }
        );

        const formattedResult = result.records.map(record => {
            return {
                warehouse: record.get("warehouse").properties,
                product: record.get("product").properties,
                shipment: record.get("shipment").properties,
                order: record.get("order").properties
            };
        });

        console.log(formattedResult);

        res.json(formattedResult);
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