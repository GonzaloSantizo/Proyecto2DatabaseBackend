import { Router } from "express";
import * as WarehouseController from "./warehouse.controller";
const router = Router();

router.get("/products", WarehouseController.getProducts); // different from the products a retail business would see

router.get("/orders", WarehouseController.getOrders);

router.put("/orders/:id", WarehouseController.updateOrder); // mark an order as shipped

export default router;
