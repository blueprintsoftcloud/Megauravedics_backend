import { Request } from "express";
import { User, Category, Product, Subscription, Plan } from "../models/mongoose";
import { AppError } from "./AppError";

export type ResourceType = 'admins' | 'staff' | 'categories' | 'productsPerCategory';

export const checkQuota = async (req: Request, resource: ResourceType, categoryId?: string) => {
  // Subscription and quota functionality has been removed. Bypassing all limits.
  return;
};