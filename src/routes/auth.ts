import express from 'express';
import { exchangeToken, signInWithoutToken } from '../controlers/auth';

const authrouter = express.Router();

authrouter.post('/exchangeTokens/google',exchangeToken);
authrouter.post('/signInWithoutToken',signInWithoutToken);

export default authrouter;