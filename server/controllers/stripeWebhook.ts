import { Request, Response } from "express";
import Stripe from "stripe";
import "dotenv/config";

import prisma from "../lib/prisma.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const stripeWebhook = async (
    request: Request,
    response: Response
) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event: Stripe.Event;

    // Get Stripe signature
    const signature = request.headers["stripe-signature"] as string;

    // Verify webhook signature
    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            signature,
            endpointSecret
        );

        console.log("✅ Stripe webhook verified");
    } catch (err: any) {
        console.log("❌ Webhook signature verification failed");
        console.log(err.message);

        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                console.log("✅ Checkout session completed");

                // Ensure metadata exists
                if (!session.metadata) {
                    console.log("❌ No metadata found");

                    return response.status(200).json({
                        ignored: true,
                    });
                }

                const { transactionId, appId } = session.metadata as {
                    transactionId: string;
                    appId: string;
                };

                console.log("Transaction ID:", transactionId);
                console.log("App ID:", appId);

                // Ensure correct app
                if (appId !== "webynix") {
                    console.log("❌ Invalid appId");

                    return response.status(200).json({
                        ignored: true,
                    });
                }

                // Find transaction
                const existingTransaction =
                    await prisma.transaction.findUnique({
                        where: {
                            id: transactionId,
                        },
                    });

                if (!existingTransaction) {
                    console.log("❌ Transaction not found");

                    return response.status(200).json({
                        ignored: true,
                    });
                }

                // Prevent duplicate webhook processing
                if (existingTransaction.isPaid) {
                    console.log("⚠️ Transaction already processed");

                    return response.status(200).json({
                        alreadyProcessed: true,
                    });
                }

                // Mark transaction as paid
                const updatedTransaction =
                    await prisma.transaction.update({
                        where: {
                            id: transactionId,
                        },
                        data: {
                            isPaid: true,
                        },
                    });

                console.log("✅ Transaction marked as paid");

                // Update user credits
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

                console.log("✅ User credits updated successfully");

                break;
            }

            default:
                console.log(`ℹ️ Ignored event type: ${event.type}`);
                break;
        }

        // Return success response
        return response.status(200).json({
            received: true,
        });
    } catch (err: any) {
        console.log("❌ Stripe webhook processing error");
        console.log(err);
        console.log(err.message);

        return response.status(200).json({
            errorHandled: true,
        });
    }
};