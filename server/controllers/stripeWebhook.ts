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

    const signature = request.headers["stripe-signature"] as string;

    try {
        event = stripe.webhooks.constructEvent(
            request.body,
            signature,
            endpointSecret
        );

        console.log("✅ Webhook verified");
    } catch (err: any) {
        console.log("⚠️ Webhook signature verification failed.");
        console.log(err.message);

        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object as Stripe.PaymentIntent;

                console.log("✅ Payment succeeded");

                const sessionList = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntent.id,
                });

                const session = sessionList.data[0];

                if (!session || !session.metadata) {
                    console.log("❌ No session metadata found");

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

                // FIXED HERE
                if (appId === "webynix" && transactionId) {
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

                    const transaction = await prisma.transaction.update({
                        where: {
                            id: transactionId,
                        },
                        data: {
                            isPaid: true,
                        },
                    });

                    console.log("✅ Transaction marked paid");

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

                    console.log("✅ Credits updated successfully");
                }

                break;

            default:
                console.log(`Ignored event type ${event.type}`);
        }

        return response.json({
            received: true,
        });
    } catch (err: any) {
        console.log("❌ WEBHOOK ERROR");
        console.log(err);
        console.log(err.message);

        return response.status(200).json({
            errorHandled: true,
        });
    }
};