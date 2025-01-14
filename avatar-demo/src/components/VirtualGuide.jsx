import React, { useState, useEffect, useCallback } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Avatar3D from "./Avatar3D";
import "./VirtualGuide.css";

// Initialize Gemini AI
const GEMINI_API_KEY = "AIzaSyDmoxNjkliGhfaZhNan42IHSO4ShQEM7NA";
// Initialize ElevenLabs (get your API key from https://elevenlabs.io)
const ELEVEN_LABS_API_KEY =
  "sk_8fa458ef44238ab98abb0861b649d6dfaef783c06f7300c7";

// Liam - professional and engaging male voice
const VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ";

// Add these constants at the top
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Find the function that processes the AI response
function processAIResponse(response) {
  // Remove action descriptions in parentheses
  const cleanedResponse = response.replace(/\s*\([^)]*\)/g, "");
  return cleanedResponse;
}

const systemPrompt = `
  You are a friendly virtual tour guide. Provide informative and engaging responses
  about travel destinations. Give clear directions and recommendations.
  Important: Do not include any physical actions or gestures in your responses.
  Focus only on the verbal content of your tour guidance.
`;

const VirtualGuide = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [message, setMessage] = useState(
    "Hello! I am your virtual travel guide. How can I help you today?"
  );
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize chat model
  const model = new GoogleGenerativeAI(GEMINI_API_KEY).getGenerativeModel({
    model: "gemini-pro",
  });

  const speak = useCallback(async (text) => {
    let retries = 0;

    const attemptSpeak = async () => {
      try {
        setIsSpeaking(true);

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVEN_LABS_API_KEY,
            },
            body: JSON.stringify({
              text,
              voice_settings: {
                stability: 0.7,
                similarity_boost: 0.8,
              },
              model_id: "eleven_monolingual_v1", // Specify model explicitly
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("ElevenLabs API Error:", {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });

          if (response.status === 401) {
            throw new Error("Invalid API key or authentication failed");
          }
          throw new Error(`API request failed with status ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (error) {
        console.error("Error generating speech:", error);

        if (retries < MAX_RETRIES) {
          retries++;
          console.log(
            `Retrying speech generation (attempt ${retries}/${MAX_RETRIES})...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          return attemptSpeak();
        }

        setIsSpeaking(false);
        // Show user-friendly error message
        setChatHistory((prev) => [
          ...prev,
          {
            role: "system",
            content:
              "I'm having trouble with voice synthesis right now. Please try again in a moment.",
          },
        ]);
      }
    };

    return attemptSpeak();
  }, []);

  // Speech recognition setup
  const startListening = () => {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.onstart = () => setIsVoiceInput(true);
      recognition.onend = () => setIsVoiceInput(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        handleUserQuery(transcript);
      };

      recognition.start();
    } else {
      alert("Speech recognition is not supported in your browser.");
    }
  };

  // Detect emotion from text
  const detectEmotion = (text) => {
    const emotions = {
      happy:
        /great|wonderful|amazing|happy|excited|perfect|excellent|welcome|bonjour|hola|ciao/i,
      sad: /sorry|sad|unfortunate|regret|apologize/i,
      greeting: /^(hello|hi|welcome|hey|greetings|bonjour|hola|ciao)(!|\s|$)/i,
      explaining:
        /let me|explain|show you|look|here|there|over there|this way/i,
      thinking: /hmm|let me think|consider|interesting|perhaps|maybe/i,
      excited: /wow|incredible|fantastic|awesome|amazing|spectacular/i,
      pointing: /over there|this way|that direction|look at|check out/i,
    };

    for (const [emotion, pattern] of Object.entries(emotions)) {
      if (pattern.test(text)) {
        setEmotion(emotion);
        setTimeout(() => setEmotion(null), 3000);
        break;
      }
    }
  };

  const handleUserQuery = async (input) => {
    if (!input.trim()) return;

    setIsListening(true);
    const newMessage = { role: "user", content: input };
    setChatHistory([...chatHistory, newMessage]);

    try {
      const prompt = `You are a friendly and enthusiastic travel guide assistant. 
        Respond naturally without describing actions in text (don't use *actions* or gestures in text). 
        Instead, use appropriate greeting words, pointing phrases, or explanatory language that will trigger animations.
        For example, instead of "*waves hello*" just say "Hello! Welcome!".
        User query: ${input}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/\*[^*]*\*/g, "");

      setMessage(text);
      detectEmotion(text);
      await speak(text);

      setChatHistory([
        ...chatHistory,
        newMessage,
        { role: "assistant", content: text },
      ]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage =
        "I apologize, but I'm having trouble responding right now.";
      setMessage(errorMessage);
      await speak(errorMessage);
    } finally {
      setIsListening(false);
      setUserInput("");
    }
  };

  const handleAIResponse = async (response) => {
    const cleanedText = processAIResponse(response);
    setMessage(cleanedText);
  };

  return (
    <div className="virtual-guide-container">
      <div className="avatar-container">
        <div className="avatar">
          <Avatar3D speaking={isSpeaking} emotion={emotion} />
        </div>
      </div>

      <div className="chat-container">
        <div className="message-container">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.role === "user" ? "user-message" : "ai-message"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask me anything about travel..."
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleUserQuery(userInput);
              }
            }}
          />
          <button
            className="voice-button"
            onClick={startListening}
            disabled={isVoiceInput}
          >
            {isVoiceInput ? "Listening..." : "🎤"}
          </button>
          <button
            className="ask-button"
            onClick={() => handleUserQuery(userInput)}
            disabled={isListening || isProcessing || isSpeaking}
          >
            {isProcessing
              ? "Processing..."
              : isListening
              ? "Thinking..."
              : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VirtualGuide;
