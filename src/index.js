import express from "express"; 
import { matchRouter } from "./routes/matches.js";

const  app = express(); 

app.use(express.json());

app.get("/",(req,res) => {
    res.send("Helo World");
}); 

app.use("/matches", matchRouter);

app.listen( 8000,() => {
    console.log("Server is running on port 8000");
});