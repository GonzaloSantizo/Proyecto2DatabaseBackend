import { Router } from "express";
import * as ManufacturerController from "./manufacturer.controller";
const router = Router();

router.get("/:manufacturerId/products", ManufacturerController.getProducts); // different from the products a retail business would see
router.post("/products", ManufacturerController.createProduct); //create product
router.get("/:manufacturerId/supplier", ManufacturerController.getSupplier);
router.get("/", ManufacturerController.getManufacturers); // get all manufacturers

export default router;