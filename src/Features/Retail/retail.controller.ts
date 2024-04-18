import { Request, Response } from "express";
import db from "../../Config/db";

export async function getRetailers(req: Request, res: Response) {
    try {
        const session = db.session();

        const retailers = await session.run(
            `
            MATCH (r:Retailer) 
            RETURN r
            `
        );

        const formattedRetailers = retailers.records.map(record => {
            return record.get("r").properties;
        });

        res.json(formattedRetailers);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getProducts(req: Request, res: Response) {
    try {
        const session = db.session();
        const warehouseId = req.query.warehouseId as string;

        let products;
        if (warehouseId) {
            products = await session.run(
                `
          MATCH (w:Warehouse {id: $warehouseId})-[r:STORES]-(p:Product)
          RETURN p, r.quantity as quantity
          `,
                { warehouseId }
            );
        } else {
            products = await session.run(
                `
          MATCH (p:Product)
          RETURN p
          LIMIT 25
          `
            );
        }

        const formattedProducts = products.records.map(record => {
            const product = record.get("p").properties;
            const quantity = record.get("quantity") || null;

            return {
                ...product,
                quantity,
                warehouse: {
                    id: warehouseId
                }
            };
        });

        res.json(formattedProducts);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getProductById(req: Request, res: Response) {
    try {
        const session = db.session();
        const productId = req.params.productId;
        const warehouseId = req.query.warehouseId as string;

        console.log("hereeee", productId, warehouseId);

        const product = await session.run(
            `
        MATCH (p:Product {id: $productId})<-[r:STORES]-(w:Warehouse {id: $warehouseId})
        RETURN p, r.quantity as quantity, w
        `,
            { productId, warehouseId }
        );

        if (product.records.length === 0) {
            res.status(404).json({
                error: "Product not found in the specified warehouse"
            });
            return;
        }

        console.log(product);

        const productProperties = product.records[0].get("p").properties;
        const quantity = product.records[0].get("quantity").toInt();
        const warehouseProperties = product.records[0].get("w").properties;
        const capacity = warehouseProperties.capacity.toInt();

        const formattedProperties = {
            ...productProperties,
            quantity,
            warehouse: {
                ...warehouseProperties
            }
        };

        //replace wwarehouse capacity with formatted capacity
        formattedProperties.warehouse.capacity = capacity;

        formattedProperties.sku = formattedProperties.sku.toString();

        console.log(formattedProperties);

        res.json(formattedProperties);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function placeOrder(req: Request, res: Response) {
    try {
        const session = db.session();
        const { retailerId, products } = req.body.data;

        console.log(req.body);

        const order = await session.writeTransaction(async tx => {
            const orderResult = await tx.run(
                `
          MATCH (r:Retailer {id: $retailerId})
          CREATE (o:Order {
            id: randomUUID(),
            status: "PENDING",
            createdAt: datetime(),
            total: 0
          })
          CREATE (r)-[:PLACES {
            order_date: datetime(),
            payment_method: "CREDIT_CARD",
            payment_status: "PAID"
          }]->(o)
          RETURN o
          `,
                { retailerId }
            );

            const orderId = orderResult.records[0].get("o").properties.id;
            let totalPrice = 0;

            for (const product of products) {
                const warehouseId = product.warehouseId;
                const productId = product.id;
                const quantity = product.quantity;

                const productRecord = await tx.run(
                    `
            MATCH (p:Product {id: $productId})
            RETURN p.price as price
            `,
                    { productId }
                );

                const unitPrice = productRecord.records[0].get("price");
                const subtotal = unitPrice * quantity;
                totalPrice += subtotal;
                //DECREMENTAR
                await tx.run(
                    `
                    MATCH (p:Product {id: $productId})-[:STORED_IN]->(w:Warehouse {id: $warehouseId})
                    SET w.stock = w.stock - $quantity
                    `,
                    { warehouseId, productId, quantity }
                );

                await tx.run(
                    `
            MATCH (o:Order {id: $orderId})
            MATCH (w:Warehouse {id: $warehouseId})
            MATCH (p:Product {id: $productId})
            CREATE (o)-[:FULFILLED_BY {
              status: "PENDING",
              assignedDate: datetime(),
              estimatedShippingDate: datetime() + duration({days: 3})
            }]->(w)
            CREATE (o)-[:CONTAINS {
              quantity: $quantity,
              unit_price: $unitPrice,
              subtotal: $subtotal
            }]->(p)
            `,
                    {
                        orderId,
                        warehouseId,
                        productId,
                        quantity,
                        unitPrice,
                        subtotal
                    }
                );
            }

            await tx.run(
                `
          MATCH (o:Order {id: $orderId})
          SET o.total = $totalPrice
          `,
                { orderId, totalPrice }
            );

            return orderId;
        });

        res.json({ orderId: order });
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
        RETURN o.id as id, o.status as status, apoc.date.format(p.order_date.epochMillis, 'ms', 'yyyy-MM-dd HH:mm:ss') as placed_at,
               o.total as total, COLLECT(DISTINCT w.name) as warehouses
        `,
            { retailerId }
        );

        const formattedOrders = orders.records.map(record => {
            return {
                id: record.get("id"),
                status: record.get("status"),
                placed_at: record.get("placed_at"),
                total: record.get("total"),
                warehouses: record.get("warehouses")
            };
        });

        const summarizedOrders = formattedOrders.reduce((acc: any, order) => {
            const existingOrder = acc.find(o => o.id === order.id);

            if (existingOrder) {
                existingOrder.warehouses = [
                    ...new Set([
                        ...existingOrder.warehouses,
                        ...order.warehouses
                    ])
                ];
            } else {
                acc.push(order);
            }

            return acc;
        }, []);

        res.json(summarizedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).send();
    }
}

export async function getOrderById(req: Request, res: Response) {
    try {
        const session = db.session();
        const orderId = req.params.orderId;
        // apoc.date.format(p.order_date.epochMillis, 'ms', 'yyyy-MM-dd HH:mm:ss')
        const result = await session.run(
            `
        MATCH (o:Order {id: $orderId})
        OPTIONAL MATCH (o)-[:CONTAINS]->(p:Product)
        OPTIONAL MATCH (o)-[sc:SHIPPED_VIA]->(s:Shipment)
        OPTIONAL MATCH (o)-[:FULFILLED_BY]->(w:Warehouse)
        RETURN o.id as id, o.status as status, o.total as total, p, p.quantity as quantity, COLLECT(DISTINCT {
          shipmentId: s.shipment_id,
          shipmentDate:   s.date,
          trackingNumber: s.trackingNumber,
          carrier: sc.carrier,
          shippingCost: sc.shippingCost,
          estimatedDelivery: sc.estimatedDelivery,
          status: s.status
        }) as shipments, COLLECT(DISTINCT w.name) as warehouses
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
            warehouses: result.records[0].get("warehouses"),
            products: result.records.map(record => {
                return {
                    product: { ...record.get("p").properties },
                    quantity: record.get("quantity")
                };
            }),
            shipments: result.records[0].get("shipments")
        };

        /// replace each sku property from each product by converting it to a string
        formattedOrder.products.forEach((product: any) => {
            product.product.sku = product.product.sku.toString();
        });

        console.log("FINAL ORDER", formattedOrder);
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
        RETURN o.id as orderId, o.status as orderStatus, s.shipmentId as shipmentId, s.status as shipmentStatus
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
