import { Groq } from 'groq-sdk';

const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const processIDCardWithGroq = async (file) => {
  try {
    const base64Image = await getBase64(file);
    const groq = new Groq({
      apiKey: import.meta.env.VITE_APP_GROQ_API_KEY,
      dangerouslyAllowBrowser: true
    });

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the following information from this ID card and return ONLY a valid JSON object with this format: {\"name\": string, \"address\": string, \"identificationNumber\": string}. No additional text."
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.1,
      max_completion_tokens: 500,
      top_p: 1,
      stream: false
    });

    const responseText = chatCompletion.choices[0].message.content.trim();
    
    try {
      const parsedData = JSON.parse(responseText);
      return {
        name: parsedData.name || null,
        address: parsedData.address || null,
        identificationNumber: parsedData.identificationNumber || null
      };
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText);
      return {
        name: null,
        address: null,
        identificationNumber: null
      };
    }

  } catch (error) {
    console.error('Error processing ID card:', error);
    throw new Error('Failed to process ID card');
  }
};