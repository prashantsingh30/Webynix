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
                console.log("❌ No transaction ID found");
                return response.status(400).send("Missing transactionId");
            }

            const transaction = await prisma.transaction.update({
                where: {
                    id: transactionId,
                },
                data: {
                    isPaid: true,
                },
            });

            console.log("✅ Transaction updated");

            await prisma.user.update({
                where: {
                    id: transaction.userId,
                },
                data: {
                    credits: {
                        increment: transaction.credits,
                    },
                },
            });

            console.log("✅ Credits added successfully");
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