/* A business can view products from multiple warehouses, add products to cart, and place orders. */
import { Router } from "express";
import * as RetailController from "./retail.controller";

const router = Router();

router.get("/products", RetailController.getProducts);

router.get("/orders", RetailController.getOrders);

router.post("/orders", RetailController.placeOrder);

router.get("orders/:id", (req, res) => {
    res.send("View order");
});

router.put("orders/:id", (req, res) => {
    res.send("Update order"); // can be used to tell the warehouse the order has been received, or to cancel the order
});

export default router;
