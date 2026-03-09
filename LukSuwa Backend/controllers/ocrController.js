import vision from '@google-cloud/vision';
import axios from 'axios';
import dotenv from 'dotenv';

import Prescription from "../models/prescriptionModel.js"; //new save part

dotenv.config();

const { ImageAnnotatorClient } = vision;

// Vision API client
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_VISION_API_KEY,
});

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Main OCR processing function
 */
export const processImage = async (imagePath) => {
  try {
    // Step 1: Extract text using Google Vision API
    console.log('Extracting text from image...');
    const [result] = await visionClient.textDetection(imagePath);
    const detections = result.textAnnotations;
    const extractedText = detections.length > 0 ? detections[0].description : '';

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        message: 'No text found in image',
        rawText: '',
        patientInfo: { name: null, age: null },
        medications: []
      };
    }

    console.log('Raw OCR Text:', extractedText);

    // Step 2: Parse using LLM
    console.log('Parsing with LLM...');
    const parsedData = await parseWithLLM(extractedText);

    return {
      success: true,
      rawText: extractedText,
      ...parsedData
    };

  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('OCR processing failed: ' + error.message);
  }
};

/**
 * Parse OCR text using LLM
 */
const parseWithLLM = async (ocrText) => {
  try {
    const prompt = `You are a medical prescription parser. Extract structured information from the following OCR text of a prescription.

OCR Text:
"""
${ocrText}
"""

Your task:
1. Extract patient information (name and age)
2. Extract all medications with their dosage and frequency
3. Correct any OCR spelling errors in medicine names
4. Return data in valid JSON format only, no additional text

Expected JSON format:
{
  "patientInfo": {
    "name": "patient name or null",
    "age": "patient age or null"
  },
  "medications": [
    {
      "name": "corrected medicine name",
      "dosage": "dosage with unit (e.g., 500mg) or null",
      "frequency": "frequency (e.g., 3 times a day) or null"
    }
  ]
}

Important rules:
- Medicine names should be properly spelled (e.g., "Vidamic" → "Vitamin C")
- Dosage must include unit (mg, g, ml, etc.)
- Frequency should be in readable format (e.g., "3 times a day", "once a day")
- Return ONLY valid JSON, no markdown, no explanations
- If a field is not found, use null
- Each medicine should be a separate object in the medications array

Return only the JSON:`;

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, 
        // max_tokens: 2000
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Prescription OCR Parser'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    const llmResponse = response.data.choices[0].message.content;
    console.log('LLM Response:', llmResponse);

    // Parse JSON from response
    const parsedData = extractJSON(llmResponse);

    // Validate structure
    if (!parsedData.patientInfo || !parsedData.medications) {
      throw new Error('Invalid response structure from LLM');
    }

    return parsedData;

  } catch (error) {
    console.error('LLM parsing error:', error.message);
    
    // Fallback to basic parsing if LLM fails
    return fallbackParsing(ocrText);
  }
};

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
const extractJSON = (text) => {
  try {
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    
    // Remove ```json and ``` markers
    jsonText = jsonText.replace(/```json\s*/g, '');
    jsonText = jsonText.replace(/```\s*/g, '');
    
    // Find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('JSON parsing error:', error.message);
    throw new Error('Failed to parse LLM response as JSON');
  }
};

/**
 * Fallback parsing if LLM fails
 */
const fallbackParsing = (text) => {
  console.log('Using fallback parsing...');
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result = {
    patientInfo: {
      name: null,
      age: null
    },
    medications: []
  };

  if (lines.length === 0) return result;

  // Extract patient info from first line
  const firstLine = lines[0];
  const ageMatch = firstLine.match(/(\d+)\s*years?/i);
  if (ageMatch) {
    result.patientInfo.age = ageMatch[1];
  }
  
  const nameMatch = firstLine.match(/\/\s*([A-Z][a-z]+)/);
  if (nameMatch) {
    result.patientInfo.name = nameMatch[1];
  }

  // Basic medicine extraction
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line looks like a medicine name
    if (/^[A-Z][a-zA-Z]{2,}/.test(line) && !/^\d/.test(line)) {
      const medicine = {
        name: line,
        dosage: null,
        frequency: null
      };

      // Look for dosage in next few lines
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j];
        
        if (!medicine.dosage) {
          const dosageMatch = nextLine.match(/(\d+\.?\d*)\s?(mg|g|ml|mcg)/i);
          if (dosageMatch) {
            medicine.dosage = dosageMatch[1] + dosageMatch[2].toLowerCase();
          }
        }

        if (!medicine.frequency) {
          if (/\d+\s*times?\s*day/i.test(nextLine)) {
            const freqMatch = nextLine.match(/(\d+)\s*times?\s*day/i);
            medicine.frequency = freqMatch[1] + ' times a day';
          } else if (/once\s*day/i.test(nextLine)) {
            medicine.frequency = 'once a day';
          } else if (/twice\s*day/i.test(nextLine)) {
            medicine.frequency = 'twice a day';
          }
        }
      }

      result.medications.push(medicine);
    }
  }

  return result;
};


//new save part
const saveToDB = async (userId, medications) => {
  try {
    const savedList = [];

    for (const med of medications) {
      const entry = new Prescription({
        user: userId,
        medicineName: med.name || null,
        strength: med.dosage || null,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
      });

      const saved = await entry.save();
      savedList.push(saved);
    }

    return savedList;

  } catch (error) {
    console.error("DB Save Error:", error);
    return [];
  }
};