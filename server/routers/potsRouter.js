import { Router } from "express";
import { potModel } from "../db/models/potModel.js";
import { mqttModel } from "../db/models/mqttModel.js";


export const potsRouter = Router();


potsRouter.get('/:id', potModel.getPot)

potsRouter.post('/', potModel.createPot)
potsRouter.post('/on/:id', potModel.turnOn, mqttModel.turnOn)
potsRouter.post('/off/:id', potModel.turnOff, mqttModel.turnOff)
potsRouter.post('/schedule/:id', potModel.setScheduled, mqttModel.setScheduled)



potsRouter.delete('/:id', potModel.deletePot)



