import { Router } from "express";
import { potModel } from "../db/models/potModel.js";
import { mqttModel } from "../db/models/mqttModel.js";


export const potsRouter = Router();


potsRouter.get('/all', potModel.getAllPots)
potsRouter.get('/:id', potModel.getPot)
potsRouter.get('/schedule/:id', potModel.getSchedule)
potsRouter.get('/species/get', potModel.getSpecies)


potsRouter.post('/', potModel.createPot)
potsRouter.post('/species/create', potModel.createSpecies)

potsRouter.post('/schedule/:id', potModel.setScheduled, potModel.changePotMode, mqttModel.setScheduled, mqttModel.changePotMode)
//Using bind to ensure the correct 'this' context in the model methods when used as route handlers
potsRouter.post('/on/:id', potModel.turnOn.bind(potModel), mqttModel.turnOn)
potsRouter.post('/off/:id', potModel.turnOff.bind(potModel), mqttModel.turnOff)


potsRouter.put('/mode/:id', potModel.changePotMode, mqttModel.changePotMode)



potsRouter.delete('/:id', potModel.deletePot)



