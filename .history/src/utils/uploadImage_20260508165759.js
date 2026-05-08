import axios from "axios";

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "ml_default"); // preset gratuit Cloudinary

  const res = await axios.post(
    "https://api.cloudinary.com/v1_1/TON_CLOUD_NAME/image/upload",
    formData
  );

  return res.data.secure_url;
};