import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Mic, Upload } from "lucide-react"; // Import all icons
import toast from "react-hot-toast";

const MessageInput = () => {
  // State for text, image, and voice recognition
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // State for PDF upload and language selection
  const [selectedLanguage, setSelectedLanguage] = useState("en"); // Default language

  // Refs for file inputs
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Chat store function for sending messages
  const { sendMessage } = useChatStore();

  // Initialize SpeechRecognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = useRef(null);

  if (SpeechRecognition) {
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false; // Stop after one sentence
    recognition.current.interimResults = false; // Only final results
    recognition.current.lang = selectedLanguage; // Use selected language

    // Handle recognition results
    recognition.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript); // Set the converted text to the input field
      setIsListening(false);
    };

    // Handle errors
    recognition.current.onerror = (event) => {
      console.error("Error occurred in recognition:", event.error);
      setIsListening(false);
      toast.error("Voice recognition failed. Please try again.");
    };
  }

  // Start/stop voice recognition
  const toggleVoiceRecognition = () => {
    if (!SpeechRecognition) {
      toast.error("Voice recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognition.current.stop();
      setIsListening(false);
    } else {
      recognition.current.start();
      setIsListening(true);
    }
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove image preview
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle PDF upload
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("language", selectedLanguage);

      const response = await fetch("/api/messages/translate-pdf", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "translated.pdf";
        a.click();
      } else {
        toast.error("Failed to translate PDF");
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error("Failed to upload PDF");
    }
  };

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        isVoiceMessage: isListening,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* PDF Upload Button */}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={pdfInputRef}
        onChange={handlePDFUpload}
      />
      <button
        type="button"
        className="btn btn-circle text-zinc-400"
        onClick={() => pdfInputRef.current?.click()}
      >
        <Upload size={20} />
      </button>

      {/* Language Selection Dropdown */}
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className="select select-bordered select-sm"
      >
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="es">Spanish</option>
        {/* Add more languages as needed */}
      </select>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          {/* Mic Button for Voice-to-Text */}
          <button
            type="button"
            className={`btn btn-circle ${
              isListening ? "text-red-500" : "text-zinc-400"
            }`}
            onClick={toggleVoiceRecognition}
          >
            <Mic size={20} />
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;