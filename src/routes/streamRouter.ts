import express, { Response }  from "express";
import { StreamCallClient } from "../stream/stream.client";
import { captureWebhook } from "../controlers/stream";

const streamRouter = express.Router();

streamRouter.post("/webhook", async(req:any, res:Response) => {
    try {
        const client = StreamCallClient.getInstance();
        const valid = client.verifyWebhook(req.rawBody, req.headers["x-signature"]);
        if (valid) {
            try {
                const event =  JSON.parse(req.rawBody.toString());
                await captureWebhook(event);
            } catch (error) {
                console.log('Error while processing stream webhook', error);
            }finally{
                res.status(200).send("OK");
            }
        } else {
            res.status(400).send("Invalid signature");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal server error");
    }
})

export default streamRouter;