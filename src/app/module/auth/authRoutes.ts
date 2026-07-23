import express from 'express'
import type {Router} from "express"
import * as authController from './authController.js'
import { authenticate } from '../../common/middleware/authMiddleware.js';

export const authRouter: Router = express.Router()

authRouter.post("/signup", authController.signupController)
authRouter.post("/signin", authController.signinController)
authRouter.post("/logout", authenticate, authController.logoutController)
authRouter.post("/refresh/token", authController.refreshTokenController)
authRouter.get("/get/me", authenticate, authController.getMeController)