import { Router } from "express";
import * as ManufacturerController from "./manufacturer.controller";
const router = Router();

router.get("/products", ManufacturerController.getProducts); // different from the products a retail business would see
router.post("/products", ManufacturerController.createProduct); //create product
router.get("/:manufacturerId/supplier", ManufacturerController.getSupplier);

export default router;