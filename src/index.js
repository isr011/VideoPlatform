// require ('dotenv').config()
 import dotenv from "dotenv"
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import{dotenv} from ".dotenv/config";
import connectDB from "./db/index.js";
dotenv.config();





connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
     console.log(` server is running at port: ${process.env.PORT}`);   
    })
})
.catch((err)=>{
    console.log("Error connecting to database",err);

})








