import axios from 'axios';

const checkSymptoms = async (req, res) => {
    try {
        const response = await axios.post(
            "https://symptoms-api-dynamic.onrender.com/ai/symptom-check", // External API URL
            req.body, 
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        // Return the response from the external API to the client
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export default { checkSymptoms };
