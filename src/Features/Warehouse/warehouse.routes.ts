import { Router } from "express";
import * as WarehouseController from "./warehouse.controller";
const router = Router();

router.get("/", WarehouseController.getWarehouses);

router.get("/products", WarehouseController.getProducts); // different from the products a retail business would see

router.post("/shipment", WarehouseController.createShipment);

router.get("/orders", WarehouseController.getOrdersByWarehouse); // get orders by warehouse

//router.put("/orders/:id", WarehouseController.updateOrder); // mark an order as shipped

export default router;