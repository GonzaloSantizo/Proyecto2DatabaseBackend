/* A business can view products from multiple warehouses, add products to cart, and place orders. */
import { Router } from "express";
import * as RetailController from "./retail.controller";

const router = Router();

router.get("/", RetailController.getRetailers);

router.get("/products", RetailController.getProducts);

router.get("/products/:productId", RetailController.getProductById);

router.get("/orders/:orderId", RetailController.getOrderById);

router.get("/:retailerId/orders", RetailController.getOrders);

router.post("/orders", RetailController.placeOrder);

router.post("/orders/:orderId/receive", RetailController.receiveOrder);

export default router;
