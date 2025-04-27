import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { translateText } from '../lib/translate.js'; // Import the translation utility
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import pdf from "pdf-parse"; // For extracting text from PDFs
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"; // For creating PDFs

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, isVoiceMessage } = req.body; // Add isVoiceMessage flag
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Fetch receiver's language preference
    const receiver = await User.findById(receiverId);
    const targetLanguage = receiver.language || 'en'; // Default to English if not set

    // Translate the message text (if text exists and it's not a voice message)
    let translatedText = text;
    if (text && !isVoiceMessage) {
      translatedText = await translateText(text, targetLanguage);
    }

    // Save the message in the database
    const newMessage = new Message({
      senderId,
      receiverId,
      text: translatedText, // Store the translated text
      originalText: text, // Optionally store the original text
      image: imageUrl,
      isVoiceMessage, // Indicate if it's a voice message
    });

    await newMessage.save();

    // Emit the message to the receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", {
        ...newMessage.toObject(), // Convert Mongoose document to plain object
        originalText: text, // Include original text for reference
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to translate a PDF
export const translatePDF = async (req, res) => {
  try {
    const { language } = req.body; // Target language
    const pdfBuffer = req.file.buffer; // Uploaded PDF file

    // Step 1: Extract text from the PDF
    const data = await pdf(pdfBuffer);
    const extractedText = data.text;

    // Step 2: Translate the extracted text
    const translatedText = await translateText(extractedText, language);

    // Step 3: Reconstruct the PDF with the translated text (optional)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    page.drawText(translatedText, {
      x: 50,
      y: height - 50,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    const translatedPDF = await pdfDoc.save();

    // Step 4: Send the translated PDF back to the client
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=translated.pdf");
    res.send(translatedPDF);
  } catch (error) {
    console.error("Error translating PDF:", error);
    res.status(500).json({ error: "Failed to translate PDF" });
  }
};