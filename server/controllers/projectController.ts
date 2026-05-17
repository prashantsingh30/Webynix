import { Request, Response } from "express";

import prisma from "../lib/prisma.js";
import { model, groq } from "../configs/openai.js";

// To make revisions
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;

    try {
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;
        const { message } = req.body;

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.credits < 5) {
            return res
                .status(403)
                .json({ message: "Add more credits to make changes" });
        }

        if (!message || message.trim() === "") {
            return res
                .status(400)
                .json({ message: "Please enter a valid prompt" });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId,
            },
            include: {
                versions: true,
            },
        });

        if (!currentProject) {
            return res.status(404).json({ message: "Project not found" });
        }

        await prisma.conversation.create({
            data: {
                role: "user",
                content: message,
                projectId,
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

        // ✅ REFINED PROMPT ENHANCEMENT WITH GEMINI (PRIMARY)
        let enhancedPrompt = message;
        try {
            const enhancementResult = await model.generateContent(`
                You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                Enhance this by:
                1. Being specific about what elements to change
                2. Mentioning design details (colors, spacing, sizes)
                3. Clarifying the desired outcome
                4. Using clear technical terms

                Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
                
                User's request: "${message}"
            `);
            enhancedPrompt = enhancementResult.response.text().trim() || message;
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
                            content: `You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                            Enhance this by:
                            1. Being specific about what elements to change
                            2. Mentioning design details (colors, spacing, sizes)
                            3. Clarifying the desired outcome
                            4. Using clear technical terms
                            Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
                            User's request: "${message}"`,
                        },
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.3,
                });

                enhancedPrompt = chatCompletion.choices[0]?.message?.content?.trim() || message;
            } catch (groqErr) {
                console.log("Groq enhancement failed, using original.");
            }
        }

        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: `I have enhanced your prompt to:\n\n"${enhancedPrompt}"`,
                projectId,
            },
        });

        await prisma.conversation.create({
            data: {
                role: "assistant",
                content: "Now making changes to your website...",
                projectId,
            },
        });

        // ✅ GENERATE WEBSITE CODE WITH GEMINI (PRIMARY) & GROQ (FALLBACK)
        let code = "";
        try {
            const prompt = `
            You are an expert frontend developer.

            Update the website based on this request:
            "${enhancedPrompt}"

            RULES:
            - Return ONLY valid HTML.
            - Use Tailwind CSS only.
            - Keep the design modern, premium, responsive, and production-ready.
            - Use gradients, cards, glassmorphism, smooth hover effects, and subtle animations.
            - Do NOT use random image services like picsum.photos.
            - Avoid changing or dynamic images.
            - Prefer SVGs, gradients, dashboards, statistic cards, and abstract UI elements instead of stock photos.
            - Use inline SVG icons only.
            - Maintain the existing website structure and improve the UI professionally.
            - Keep all sections responsive.

            Current Website Code:
            ${currentProject.current_code}
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
                        temperature: 0.7,
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
            console.log("Both Gemini and Groq code generation failed:", error.message);

            // Fallback - return the original code if generation fails
            code = currentProject.current_code || "";

            if (!code) {
                await prisma.conversation.create({
                    data: {
                        role: "assistant",
                        content: "Unable to generate code, please try again..",
                        projectId,
                    },
                });

                await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        credits: {
                            increment: 5,
                        },
                    },
                });

                return res.status(500).json({ message: "Failed to generate code" });
            }
        }

        const version = await prisma.version.create({
            data: {
                code: code,
                description: "Changes made",
                projectId,
            },
        });

        await prisma.conversation.create({
            data: {
                role: "assistant",
                content:
                    "I have made changes to your website! You can now preview it.",
                projectId,
            },
        });

        await prisma.websiteProject.update({
            where: {
                id: projectId,
            },
            data: {
                current_code: code,
                current_version_index: version.id,
            },
        });

        return res.json({ message: "Changes made successfully" }); // Added return
    } catch (error: any) {
        if (userId) {
            await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    credits: {
                        increment: 5,
                    },
                },
            });
        }

        console.error(
            "Error in makeRevision controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Rollback to specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;
        const versionId = req.params.versionId as string;
        if (!projectId || !versionId) {
            return res
                .status(400)
                .json({ message: "Missing project ID or version ID" });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {
                id: projectId,
                userId,
            },
            include: {
                versions: true,
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        const version = project.versions.find(
            (v: typeof project.versions[number]) => v.id === versionId
        );

        if (!version) {
            return res.status(404).json({ message: "Version not found" });
        }

        await prisma.websiteProject.update({
            where: {
                id: projectId,
                userId,
            },
            data: {
                current_code: version.code,
                current_version_index: version.id,
            },
        });

        await prisma.conversation.create({
            data: {
                role: "assistant",
                content:
                    "I have rolled back your website to the specified version. You can now preview it.",
                projectId,
            },
        });

        return res.json({ message: "Version rolled back successfully" }); // Added return
    } catch (error: any) {
        console.error(
            "Error in rollbackToVersion controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;
        if (!projectId) {
            return res.status(400).json({ message: "Missing project ID" });
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

        await prisma.websiteProject.delete({
            where: {
                id: projectId,
                userId,
            },
        });

        return res.json({ message: "Project deleted successfully" }); // Added return
    } catch (error: any) {
        console.error(
            "Error in deleteProject controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;
        if (!projectId) {
            return res.status(400).json({ message: "Missing project ID" });
        }

        const project = await prisma.websiteProject.findFirst({
            where: {
                id: projectId,
                userId,
            },
            include: {
                versions: true,
            },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        return res.json({ project }); // Added return
    } catch (error: any) {
        console.error(
            "Error in getProjectPreview controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Get published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {
        const projects = await prisma.websiteProject.findMany({
            where: {
                isPublished: true,
            },
            include: {
                user: true,
            },
        });

        return res.json({ projects }); // Added return
    } catch (error: any) {
        console.error(
            "Error in getPublishedProjects controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        if (!projectId) {
            return res.status(400).json({ message: "Missing project ID" });
        }

        const project = await prisma.websiteProject.findFirst({
            where: {
                id: projectId,
            },
        });

        if (
            !project ||
            project.isPublished === false ||
            !project?.current_code
        ) {
            return res.status(404).json({ message: "Project not found" });
        }

        return res.json({ code: project.current_code }); // Added return
    } catch (error: any) {
        console.error(
            "Error in getProjectById controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};

// Save project code
export const saveProjectCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const projectId = req.params.projectId as string;
        if (!projectId) {
            return res.status(400).json({ message: "Missing project ID" });
        }

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: "Missing code" });
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
                current_code: code,
                current_version_index: "",
            },
        });

        return res.json({ message: "Code saved successfully" }); // Added return
    } catch (error: any) {
        console.error(
            "Error in saveProjectCode controller",
            error.message || error.code
        );

        return res.status(500).json({ message: error.message || error.code });
    }
};