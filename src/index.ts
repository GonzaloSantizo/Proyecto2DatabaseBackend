// src/index.ts
import express from "express";
import db from "./Config/db";
import retail from "./Features/Retail/retail.routes";
import warehouse from "./Features/Warehouse/warehouse.routes";
import manufacturer from "./Features/Manufacturer/manufacturer.routes";
const app = express();

const port = 3000;

app.get("/", (req, res) => {
    res.send("Hello, TypeScript with Express!");
});

app.use("/retail", retail);
app.use("/warehouse", warehouse);
app.use("/manufacturer", manufacturer);

app.get("/users", (req, res) => {
    const session = db.session(); // open neo4j session
    // return every user in the database
    session.run("MATCH (u:User) RETURN u").then(result => {
        const users = result.records.map(record => {
            return record.get("u").properties;
        });
        res.json(users);
        session.close(); // close neo4j session
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
