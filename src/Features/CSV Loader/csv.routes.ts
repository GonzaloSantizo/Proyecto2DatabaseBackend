import { Router } from "express";
import * as csvcontroller from "./csv.controller";
const router = Router();

router.get("/", csvcontroller.loadProductsFromCSV);

export default router;