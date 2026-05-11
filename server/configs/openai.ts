import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is required");
}

const openai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Groq configuration for prompt enhancement
export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Use the same model that works in your other project
export const model = openai.getGenerativeModel({ model: "gemini-2.5-flash" });

export default openai; 