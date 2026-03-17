import express from 'express';
import { authenticate } from '../controlers/auth';
import { listEvents, createEvent, getEvent, setRsvp } from '../controlers/event';

const eventRouter = express.Router();

eventRouter.get('/', authenticate, listEvents);
eventRouter.post('/', authenticate, createEvent);
eventRouter.get('/:id', authenticate, getEvent);
eventRouter.post('/:id/rsvp', authenticate, setRsvp);

export default eventRouter;
