require("dotenv").config();
import { NextFunction, Request, Response } from "express";
 
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import { Secret } from "jsonwebtoken";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "./ErrorHandler";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

  // parse environment variables to integrate with fallback values

  export const accessTokenExpires = parseInt(
    process.env.ACCESS_TOKEN_EXPIRES || "12300",
    10
  );
  export const refreshTokenExpires = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "1200",
    10
  );

  // option for cookies

  export const accessTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + accessTokenExpires * 60 * 60 * 1000),
    maxAge: accessTokenExpires * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure:true
  };

  export const refreshTokenOptions: ITokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpires * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpires * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure:true
  };
  
  
  export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    
    // upload session to redis
    redis.set(user._id, JSON.stringify(user) as any);
    
    
  // only set true for production

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
  });
};



// Blacklist a token
export const blacklistToken = async (token: string, expiresIn: number) => {
  const tokenKey = `blacklist_${token}`;
  await redis.set(tokenKey, "blacklisted", "EX", expiresIn);
};

// Verify if a token is blacklisted
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const tokenKey = `blacklist_${token}`;
  const result = await redis.get(tokenKey);
  return result === "blacklisted";
};

// Middleware to verify token blacklist
export const verifyToken = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.access_token;
  if (!token) {
    return next(new ErrorHandler("Authentication token missing", 401));
  }

  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) {
    return next(new ErrorHandler("Token has been blacklisted", 401));
  }

  // Proceed with normal token validation (e.g., verify signature, claims)
  next();
});

// Logout user and blacklist tokens
export const logout = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  const { access_token, refresh_token } = req.cookies;

  if (access_token) {
    await blacklistToken(access_token, accessTokenExpires * 60 * 60);
  }

  if (refresh_token) {
    await blacklistToken(refresh_token, refreshTokenExpires * 24 * 60 * 60);
  }

  res.clearCookie("access_token", accessTokenOptions);
  res.clearCookie("refresh_token", refreshTokenOptions);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});