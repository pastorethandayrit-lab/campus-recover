// Supabase client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qjyjffsqtgyoqaillpml.supabase.co";
const SUPABASE_KEY = "sb_publishable_FUz2bxPQi4Wx2CTSFr-3uQ_ERHu-1I9";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cloudinary upload
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "YOUR_UPLOAD_PRESET"); // replace with your preset
  const res = await fetch("https://api.cloudinary.com/v1_1/daxarj70f/image/upload", {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  return data.secure_url;
}

// Register
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value;
    const password = e.target.querySelector("input[type=password]").value;

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert("Registration failed: " + error.message);

    alert("Registration successful! Check your email to confirm.");
    await supabase.from("profiles").insert([{ id: data.user.id, role: "user" }]);
  });
}

// Login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value;
    const password = e.target.querySelector("input[type=password]").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login failed: " + error.message);
    else alert("Login successful!");
  });
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    alert("Logged out successfully!");
  });
}

// Upload Item
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = e.target.querySelector("input[type=text]").value;
    const description = e.target.querySelector("textarea").value;
    const status = e.target.querySelector("select").value;
    const file = e.target.querySelector("#itemImage").files[0];

    try {
      const imageUrl = await uploadImage(file);
      const { error } = await supabase.from("items").insert([{ name, description, status, image_url: imageUrl }]);
      if (error) alert("Upload failed: " + error.message);
      else alert("Item uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Unexpected error during upload.");
    }
  });
}

// Admin Dashboard
async function checkAdminAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return alert("You must be logged in.");

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error) return console.error(error);

  if (data.role === "admin") {
    document.getElementById("adminSection").style.display = "block";
    loadAdminItems();
  } else {
    alert("Access denied. Admins only.");
  }
}

async function loadAdminItems() {
  const { data, error } = await supabase.from("items").select("*");
  if (error) return console.error(error);

  const table = document.getElementById("adminTable");
  if (!table) return;
  table.innerHTML = data.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.description}</td>
      <td>${item.status}</td>
      <td>
        <button onclick="updateStatus(${item.id}, 'approved')">Approve</button>
        <button onclick="updateStatus(${item.id}, 'rejected')">Reject</button>
      </td>
    </tr>`).join("");
}

async function updateStatus(id, status) {
  await supabase.from("items").update({ status }).eq("id", id);
  loadAdminItems();
}

// Run admin check if admin.html is loaded
if (document.getElementById("adminSection")) {
  checkAdminAccess();
}
