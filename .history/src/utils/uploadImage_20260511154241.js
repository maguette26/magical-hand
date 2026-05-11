import axios from "axios";

export const uploadImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "magical_hand");

    const res = await axios.post(
      "https://api.cloudinary.com/v1_1/dt3zluycp/image/upload",
      formData
    );

    return res.data.secure_url;
  } catch (error) {
    console.log("FULL ERROR:", error);
    console.log("RESPONSE DATA:", error.response?.data);
    console.log("MESSAGE:", error.message);
    throw error;
  }
};