/* A business can view products from multiple warehouses, add products to cart, and place orders. */
import { Router } from "express";
import * as RetailController from "./retail.controller";

const router = Router();

router.get("/products", RetailController.getProducts);

router.get("/:retailerId/orders/:orderId", RetailController.getOrderById);

router.get("/:retailerId/orders", RetailController.getOrders);

router.post("/orders", RetailController.placeOrder);

router.patch("/orders/:orderId/receive", RetailController.receiveOrder);

export default router;
