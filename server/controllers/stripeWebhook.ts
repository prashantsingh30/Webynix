import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import "dotenv/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const stripeWebhook = async (
    request: Request,
    response: Response
) => {
    const sig = request.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET as string
        );
        console.log(`✅ Webhook signature verified. Event type: ${event.type}`);
    } catch (err: any) {
        console.error("❌ Webhook signature verification failed:", err.message);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log("✅ Checkout session completed event received.");

            const transactionId = session.metadata?.transactionId;
            if (!transactionId) {
                console.error("❌ Missing transactionId in session metadata.");
                return response.status(200).json({ ignored: true, reason: "Missing transactionId" });
            }

            // 1. Ensure transaction exists before updating
            const transaction = await prisma.transaction.findUnique({
                where: { id: transactionId },
            });

            if (!transaction) {
                console.error(`❌ Transaction not found in DB: ${transactionId}`);
                // Return 200 so Stripe does not infinitely retry invalid transactions
                return response.status(200).json({ ignored: true, reason: "Transaction not found" });
            }

            // 2. Prevent duplicate webhook processing safely
            if (transaction.isPaid) {
                console.log(`⚠️ Transaction ${transactionId} already processed (isPaid=true). Skipping.`);
                return response.status(200).json({ alreadyProcessed: true });
            }

            // 3. Atomically update transaction and user credits using $transaction
            console.log(`⏳ Processing payment for transaction ${transactionId}...`);
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transactionId },
                    data: { isPaid: true },
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: {
                        credits: {
                            increment: transaction.credits,
                        },
                    },
                })
            ]);

            console.log(`✅ Successfully added ${transaction.credits} credits to user ${transaction.userId}.`);
        }

        // Return a 200 response to acknowledge receipt
        return response.status(200).json({ received: true });
    } catch (err: any) {
        console.error("❌ WEBHOOK ERROR DURING DATABASE OPERATION:");
        console.error(err);
        
        return response.status(500).json({ error: "Database operation failed", details: err.message });
    }
};