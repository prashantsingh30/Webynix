import { Request, Response } from "express";
import "dotenv/config";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { model, groq } from "../configs/openai.js"; // Changed from openai to gemini

// Get the user credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User Not Found" });
        }

        return res.json({ credits: user?.credits }); // Added return
    } catch (error: any) {
        console.error(
            "Error in getUserCredits controller",
            error.message || error.code
        );
        return res.status(500).json({ message: error.message || error.code });
    }
};

// Create a new project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { initial_prompt } = req.body;

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User Not Found" });
        }

        if (user && user.credits < 5) {
            return res
                .status(403)
                .json({ message: "Add more credits to create a project" });
        }

        // Create a new project
        const project = await prisma.websiteProject.create({
            data: {
                name:
                    initial_prompt.length > 50
                        ? initial_prompt.substring(0, 47) + "..."
                        : initial_prompt,
                initial_prompt,
                userId,
            },
        });

        // Update users total creation
        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                totalCreation: {
                    increment: 1,
                },
            },
        });

        await prisma.conversation.create({
            data: {
                role: "user",
                content: initial_prompt,
                projectId: project.id,
            },
        });

        await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                credits: {
                    decrement: 5,
                },
            },
        });

        // ✅ RESPOND IMMEDIATELY so the frontend doesn't hang
        res.json({ projectId: project.id });

        // ✅ BACKGROUND GENERATION TASK
        (async () => {
            try {
                // ✅ REFINED PROMPT ENHANCEMENT WITH GEMINI (PRIMARY)
                let enhancedPrompt = initial_prompt;
                try {
                    const enhancementResult = await model.generateContent(`
                        Enhance this website request into a professional technical specification.
                        Focus on professional layout, modern sections, and glassmorphism.
                        CRITICAL: Strictly cover only 5-6 professional lines.
                        
                        Request: "${initial_prompt}"
                    `);
                    enhancedPrompt = enhancementResult.response.text().trim() || initial_prompt;
                } catch (err) {
                    console.log("Gemini enhancement failed, falling back to Groq...");
                    try {
                        const chatCompletion = await groq.chat.completions.create({
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a professional technical architect. Your job is to refine user requests into clear, premium technical specifications. Return ONLY the refined specification. No introductory text, no conversational fluff.",
                                },
                                {
                                    role: "user",
                                    content: `Enhance this website request into a professional technical specification.
                                    Focus on:
                                    1. Modern visual hierarchy and layout.
                                    2. Professional sections (Hero, Features, Social Proof, CTA).
                                    3. Sophisticated glassmorphism details.
                                    4. Concise, punchy copy.
                                    CRITICAL: The entire response MUST be professional and strictly cover only 5-6 lines. No more.
                                    
                                    Request: "${initial_prompt}"`,
                                },
                            ],
                            model: "llama-3.3-70b-versatile",
                            temperature: 0.3,
                        });

                        enhancedPrompt = chatCompletion.choices[0]?.message?.content?.trim() || initial_prompt;
                    } catch (groqErr) {
                        console.log("Groq enhancement failed, using original.");
                    }
                }

                await prisma.conversation.create({
                    data: {
                        role: "assistant",
                        content: `I've refined your request to: "${enhancedPrompt}"`,
                        projectId: project.id,
                    },
                });

                let code = "";
                try {
                    const prompt = `
                        You are an expert web developer. Create a visually stunning, premium, modern SaaS-quality website
                        with advanced UI/UX similar to Vercel, Stripe, Linear, or Framer.
                        The website should feel award-winning, futuristic, animated,
                        highly polished, and production-ready based on this request: "${enhancedPrompt}"

                        CRITICAL REQUIREMENTS:
                        - You MUST output valid HTML ONLY.
                        - Use Tailwind CSS for ALL styling.
                        - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                        - DESIGN STYLE: Premium, state-of-the-art modern web design. Use a clean visual hierarchy, generous white space (py-24 sections), and sophisticated typography.
                        - VISUALS: Use glassmorphism effects (backdrop-blur), subtle micro-animations (animate-fade-in), and smooth transitions on hover.
                        - COLORS: Use a refined color palette with gradients (e.g., from-indigo-600 to-purple-600) and high-contrast text.
                        - IMAGE USAGE: Use premium high-quality images from: https://picsum.photos/ Example: https://picsum.photos/1200/700. 
                        Use beautiful CSS gradients and Use inline SVG icons only. Do not use icon libraries. To ensure stability to make the website work on all the browsers.
                        - SECTIONS: Include a sticky glassmorphism Navbar, a bold Hero section, high-quality Feature cards with hover lifts, a clean CTA, and a minimalist Footer.
                        - Make it fully responsive (mobile-first approach).
                        - Use professional placeholder content that matches the website's niche.

                        CRITICAL HARD RULES:
                        1. You MUST put ALL output ONLY into the response.
                        2. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
                        3. Do NOT include markdown, explanations, notes, or code fences.
                    `;

                    try {
                        const codeGenerationResult = await model.generateContent(prompt);
                        code = codeGenerationResult.response.text().trim();
                        console.log("Gemini code generation succeeded.");
                    } catch (geminiError: any) {
                        console.log("Gemini code generation failed, falling back to Groq:", geminiError.message);
                        try {
                            const chatCompletion = await groq.chat.completions.create({
                                messages: [
                                    {
                                        role: "system",
                                        content: "You are a raw code generator. You MUST return ONLY valid HTML/Tailwind code. Do NOT include markdown code blocks (```html), do NOT include explanations, do NOT include notes. Only the raw HTML document.",
                                    },
                                    { role: "user", content: prompt }
                                ],
                                model: "llama-3.3-70b-versatile",
                                temperature: 0.7, // Lower temperature for more predictable code
                            });
                            code = chatCompletion.choices[0]?.message?.content?.trim() || "";
                            console.log("Groq code generation succeeded. Length:", code.length);
                        } catch (groqError: any) {
                            console.error("Groq code generation also failed:", groqError.message);
                            throw groqError;
                        }
                    }

                    code = code.replace(/```html\n?/gi, "").replace(/```\n?/gi, "").trim();

                } catch (error: any) {
                    console.log("Both Gemini and Groq code generation failed, using fallback HTML:", error.message);
                    code = getFallbackHTML(initial_prompt, enhancedPrompt);
                }

                if (!code) {
                    await prisma.conversation.create({
                        data: {
                            role: "assistant",
                            content: "Unable to generate code, please try again..",
                            projectId: project.id,
                        },
                    });

                    await prisma.user.update({
                        where: { id: userId },
                        data: { credits: { increment: 5 } },
                    });
                    return;
                }

                // Create version for the project
                const version = await prisma.version.create({
                    data: {
                        code: code,
                        description: "Initial version",
                        projectId: project.id,
                    },
                });

                await prisma.conversation.create({
                    data: {
                        role: "assistant",
                        content: "I have created your website! You can now preview it and request any changes.",
                        projectId: project.id,
                    },
                });

                await prisma.websiteProject.update({
                    where: { id: project.id },
                    data: {
                        current_code: code,
                        current_version_index: version.id,
                    },
                });

            } catch (bgError: any) {
                console.error("Background task error:", bgError.message);
            }
        })();

    } catch (error: any) {
        console.error("Error in createUserProject controller:", error.message || error.code);
        return res.status(500).json({ message: error.message || error.code });
    }
};

// Get a single user project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId,
            },
            include: {
                conversation: {
                    orderBy: {
                        timestamp: "asc",
                    },
                },
                versions: {
                    orderBy: {
                        timestamp: "asc",
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        return res.json({ project }); // Added return
    } catch (error: any) {
        console.error("Error in getUserProject controller", error);
        return res.status(500).json({ message: error.message || error.code });
    }
};

// Get all user projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projects = await prisma.websiteProject.findMany({
            where: {
                userId,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return res.json({ projects }); // Added return
    } catch (error: any) {
        console.error("Error in getUserProjects controller", error);
        return res.status(500).json({ message: error.message || error.code });
    }
};

// Toggle project publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId,
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        await prisma.websiteProject.update({
            where: {
                id: projectId,
            },
            data: {
                isPublished: !project.isPublished,
            },
        });

        return res.json({ // Added return
            message: project.isPublished
                ? "Project Unpublished"
                : "Project Published",
        });
    } catch (error: any) {
        console.error("Error in togglePublish controller", error);
        return res.status(500).json({ message: error.message || error.code });
    }
};

// To purchase credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }

        const plans = {
            basic: { credits: 100, amount: 399 },
            pro: { credits: 400, amount: 799 },
            enterprise: { credits: 1000, amount: 1499 },
        };

        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { planId } = req.body as { planId: keyof typeof plans };
        const origin = req.headers.origin as string;

        const plan: Plan = plans[planId];
        if (!plan) {
            return res.status(400).json({ message: "Plan not found" });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                planId: req.body.planId,
                amount: plan.amount,
                credits: plan.credits,
            },
        });

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/loading`,
            cancel_url: `${origin}`,
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: `Webynix - ${plan.credits} credits`,
                        },
                        unit_amount: Math.floor(transaction.amount) * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata: {
                transactionId: transaction.id,
                appId: "webynix",
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
        });

        if (!session.url) {
            return res.status(500).json({ message: "Failed to create checkout session" });
        }
        return res.json({ payment_link: session.url }); // Added return

        return res.json({ message: "Purchases disabled" });
    } catch (error: any) {
        console.error("Error in purchaseCredits controller", error);
        return res.status(500).json({ message: error.message || error.code });
    }
};

// Helper function for fallback HTML
export function getFallbackHTML(originalPrompt: string, enhancedPrompt: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Website Project</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.8s ease-out forwards;
        }
        .glassmorphism {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
    </style>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
    <div class="container mx-auto px-4 py-16">
        <div class="max-w-4xl mx-auto text-center animate-fade-in">
            <div class="glassmorphism rounded-3xl p-8 mb-8">
                <h1 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                    Your Website Project
                </h1>
                <div class="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mb-8"></div>
                <p class="text-xl text-gray-700 mb-8">
                    "${originalPrompt.substring(0, 150)}${originalPrompt.length > 150 ? '...' : ''}"
                </p>
            </div>
            <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8">
                <p class="text-gray-700">✨ Using Gemini 2.5 Flash - Your website is being generated</p>
                <p class="text-sm text-gray-500 mt-2">Enhanced specification: "${enhancedPrompt.substring(0, 100)}${enhancedPrompt.length > 100 ? '...' : ''}"</p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
