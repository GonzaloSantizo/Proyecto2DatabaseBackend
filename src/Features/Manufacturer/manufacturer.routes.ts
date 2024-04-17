import { Router } from "express";
import * as ManufacturerController from "./manufacturer.controller";
const router = Router();

router.get("/products", ManufacturerController.getProducts); // different from the products a retail business would see
router.post("/products", ManufacturerController.createProduct); //create product
router.put("/products", ManufacturerController.updateProduct); //update product
router.get("/:manufacturerId/supplier", ManufacturerController.getSupplier);
router.get("/product/:productId", ManufacturerController.getProductById); //get product by id
router.delete("/product/:productId", ManufacturerController.deleteProduct); //delete product

router.get("/filteredProducts", ManufacturerController.getFilteredProducts); //filter products by price or order
router.get("/all", ManufacturerController.getManufacturers); //get all manufacturers

export default router;
