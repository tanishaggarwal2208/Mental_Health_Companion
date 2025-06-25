
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME, SYSTEM_INSTRUCTION_BASE } from '../constants';

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      // This error should ideally be caught and handled in the UI calling this service.
      console.error("API_KEY environment variable is not set.");
      throw new Error("API_KEY environment variable is not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const initializeChat = async (topic: string): Promise<Chat> => {
  const client = getAiClient();
  const systemInstruction = `${SYSTEM_INSTRUCTION_BASE} The current conversation topic is: ${topic}.`;
  
  const chat = client.chats.create({
    model: GEMINI_MODEL_NAME,
    config: {
      systemInstruction: systemInstruction,
    },
  });
  return chat;
};

export const sendMessageToAI = async (chat: Chat, messageText: string): Promise<{ text: string; youtubeSearchQuery?: string }> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message: messageText });
    let aiText = response.text;
    let youtubeSearchQuery: string | undefined;

    let potentialJsonStr = aiText.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = potentialJsonStr.match(fenceRegex);

    if (match && match[2]) {
      potentialJsonStr = match[2].trim();
    }
    
    if (potentialJsonStr.startsWith("{") && potentialJsonStr.endsWith("}")) {
        try {
            const parsedJson = JSON.parse(potentialJsonStr);
            if (parsedJson && typeof parsedJson.youtube_search_query === 'string') {
                youtubeSearchQuery = parsedJson.youtube_search_query;
                // Create a user-friendly message for the chat bubble when a YouTube link is suggested
                aiText = `I found a YouTube search that might be helpful: "${youtubeSearchQuery}". You can click the link to see results.`;
            } else {
                 // It was JSON, but not the youtube_search_query format. Use original text.
                 aiText = response.text; // Use the original full response if JSON is not what we expected
            }
        } catch (e) {
            // Not valid JSON, or error during parsing. Treat aiText as a normal message.
            // aiText is already response.text in this case.
        }
    }
    
    return { text: aiText, youtubeSearchQuery };

  } catch (error) {
    console.error("Error sending message to AI:", error);
    let errorMessage = "Sorry, I encountered an error while trying to respond. Please try again.";
     if (error instanceof Error) {
        // More specific error messages can be added here if known error structures from Gemini API exist
        if (error.message.toLowerCase().includes('api key not valid')) {
            errorMessage = "Error: The API Key is invalid or missing. Please check your configuration.";
        } else if (error.message.toLowerCase().includes('quota')) {
            errorMessage = "Error: API quota has been exceeded. Please try again later.";
        } else if (error.message.toLowerCase().includes('candidate was blocked due to safety')) {
            errorMessage = "My apologies, I cannot respond to that due to safety guidelines. Could we talk about something else?";
        } else {
             errorMessage = `An unexpected error occurred: ${error.message}`;
        }
    }
    // Return an error structure that the UI can display
    return { text: errorMessage, youtubeSearchQuery: undefined };
  }
};
