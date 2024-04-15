import Neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
    throw new Error("Missing Neo4j credentials.");
}

const neo4j = Neo4j.driver(
    process.env.NEO4J_URI || "bolt://localhost:7687",
    Neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

export default neo4j;
