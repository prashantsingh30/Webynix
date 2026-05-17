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

        console.log("✅ Webhook verified");
    } catch (err: any) {
        console.log("❌ Signature verification failed");
        console.log(err.message);

        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;

            console.log("✅ Checkout completed");
            console.log("Metadata:", session.metadata);

            const transactionId = session.metadata?.transactionId;

            if (!transactionId) {
                console.log("❌ No transaction ID found in metadata");
                return response.status(400).send("Missing transactionId");
            }

            // 1. Find the transaction first
            const existingTransaction = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });

            if (!existingTransaction) {
                console.log(`❌ Transaction not found in DB: ${transactionId}`);
                // Return 200 so Stripe stops retrying a permanently invalid transaction
                return response.status(200).json({ received: true, error: "Transaction not found" });
            }

            // 2. Handle idempotency (duplicate webhooks)
            if (existingTransaction.isPaid) {
                console.log(`⚠️ Transaction ${transactionId} is already marked as paid. Skipping credit increment.`);
                return response.status(200).json({ received: true, message: "Already processed" });
            }

            // 3. Mark transaction as paid
            const updatedTransaction = await prisma.transaction.update({
                where: {
                    id: transactionId,
                },
                data: {
                    isPaid: true,
                },
            });

            console.log(`✅ Transaction ${transactionId} marked as paid`);

            // 4. Increment user credits
            await prisma.user.update({
                where: {
                    id: updatedTransaction.userId,
                },
                data: {
                    credits: {
                        increment: updatedTransaction.credits,
                    },
                },
            });

            console.log(`✅ ${updatedTransaction.credits} credits added to user ${updatedTransaction.userId} successfully`);
        }

        response.status(200).json({
            received: true,
        });
    } catch (err: any) {
        console.log("❌ Webhook DB error");
        console.log(err);

        response.status(500).send("Webhook handler failed");
    }
};