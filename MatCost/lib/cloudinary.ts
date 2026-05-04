export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "matcost");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = await response.json();
  return data.secure_url;
};

/**
 * Upload a base64 data URL (e.g. from a canvas signature) to Cloudinary.
 * Converts the base64 string to a File, then delegates to uploadToCloudinary.
 */
export const uploadBase64ToCloudinary = async (
  base64DataUrl: string,
  filename: string = `signature_${Date.now()}.png`,
): Promise<string> => {
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();
  const file = new File([blob], filename, { type: blob.type || "image/png" });
  return uploadToCloudinary(file);
};
