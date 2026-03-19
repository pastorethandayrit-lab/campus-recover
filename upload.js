// Make sure your HTML links this file at the bottom:
// <script type="module" src="upload.js"></script>

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Replace with your own Supabase project URL and anon key
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Collect form values
  const type = e.target.querySelector("select").value;
  const title = e.target.querySelector("input[type='text']").value;
  const category = e.target.querySelectorAll("select")[1].value;
  const description = e.target.querySelector("textarea").value;
  const location = e.target.querySelectorAll("input[type='text']")[1].value;
  const date = e.target.querySelector("input[type='date']").value;
  const imageFile = document.getElementById("itemImage").files[0];

  if (!imageFile) {
    alert("Please select an image.");
    return;
  }

  // Upload image to Supabase Storage
  const fileName = `${Date.now()}_${imageFile.name}`;
  const { error: uploadError } = await supabase.storage
    .from("items") // make sure you created a bucket named "items"
    .upload(fileName, imageFile);

  if (uploadError) {
    alert("Image upload failed: " + uploadError.message);
    return;
  }

  // Get public URL of uploaded image
  const { data: publicUrlData } = supabase.storage
    .from("items")
    .getPublicUrl(fileName);

  const imageUrl = publicUrlData.publicUrl;

  // Get current logged-in user
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    alert("You must be logged in to report an item.");
    return;
  }

  // Insert item into database
  const { error: insertError } = await supabase.from("items").insert([
    {
      type,
      title,
      category,
      description,
      location,
      date,
      image_url: imageUrl,
      user_id: userId,
      status: "pending" // default status until admin approves
    }
  ]);

  if (insertError) {
    alert("Upload failed: " + insertError.message);
  } else {
    alert("Item reported successfully!");
    e.target.reset();
  }
});
