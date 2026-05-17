import { Request, Response } from "express";
import Stripe from "stripe";
import "dotenv/config";

import prisma from "../lib/prisma.js";

export const stripeWebhook = async (request: Request, response: Response) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    if (endpointSecret) {
        let event;
        // Get the signature sent by Stripe
        const signature = request.headers["stripe-signature"] as string;
        try {
            event = stripe.webhooks.constructEvent(
                request.body,
                signature,
                endpointSecret
            );
        } catch (err: any) {
            console.log(
                `⚠️ Webhook signature verification failed.`,
                err.message
            );
            return response.sendStatus(400);
        }

        // Handle the event
        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object as Stripe.Checkout.Session;

                if (!session.metadata) {
                    console.log("No metadata found in session");
                    break;
                }

                const { transactionId, appId } = session.metadata as {
                    transactionId: string;
                    appId: string;
                };

                if (appId === "webynix" && transactionId) {
                    const transaction = await prisma.transaction.update({
                        where: {
                            id: transactionId,
                        },
                        data: {
                            isPaid: true,
                        },
                    });

                    // Add credits to the user data
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
                }

                break;
            // ... handle other event types
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    }
};