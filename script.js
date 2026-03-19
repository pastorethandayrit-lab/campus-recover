// Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

// Cloudinary setup
const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// Cloudinary upload with Filename Cleaning
async function uploadImage(file) {
  const formData = new FormData();
  
  // Clean filename: removes special characters/spaces that cause "Invalid Key" errors
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const blob = file.slice(0, file.size, file.type);
  const newFile = new File([blob], cleanName, {type: file.type});

  formData.append("file", newFile);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("Cloudinary upload failed. Check your Preset settings.");
  
  const data = await res.json();
  return data.secure_url;
}

// Upload Item (Cloudinary + Supabase)
async function uploadItem(title, description, type, category, location, date, file) {
  try {
    const imageUrl = await uploadImage(file);

    // INSERTING INTO SUPABASE
    // Note: Column names must match your Supabase Table exactly
    const { error } = await supabase
      .from("items")
      .insert([{ 
        title: title, 
        description: description, 
        type: type,
        category: category,
        location: location,
        date: date,
        status: 'pending', // Default status for new reports
        image_url: imageUrl 
      }]);

    if (error) {
      alert("Database error: " + error.message);
    } else {
      alert("Item reported successfully!");
      window.location.href = "index.html"; 
    }
  } catch (err) {
    console.error(err);
    alert("Error: " + err.message);
  }
}

// Register
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value;
    const password = e.target.querySelector("input[type=password]").value;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("Registration failed: " + error.message);
    } else {
      const userId = data.user?.id;
      if (userId) {
        await supabase.from("profiles").insert([{ id: userId, role: "user" }]);
      }
      alert("Registration successful! Check your email to confirm.");
      setTimeout(() => { window.location.href = "login.html"; }, 2000);
    }
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
    else {
        alert("Login successful!");
        window.location.href = "index.html";
    }
  });
}

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    alert("Logged out successfully!");
    window.location.reload();
  });
}

// Upload Form Listener (Matches your upload.html structure)
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const type = e.target.querySelectorAll("select")[0].value;
    const title = e.target.querySelector("input[type=text]").value;
    const category = e.target.querySelectorAll("select")[1].value;
    const description = e.target.querySelector("textarea").value;
    const location = e.target.querySelectorAll("input[type=text]")[1].value;
    const date = e.target.querySelector("input[type=date]").value;
    const file = e.target.querySelector("#itemImage").files[0];

    await uploadItem(title, description, type, category, location, date, file);
  });
}

// Admin Dashboard Logic
async function checkAdminAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error) return console.error(error);

  if (data.role === "admin") {
    const adminSection = document.getElementById("adminSection");
    if (adminSection) {
        adminSection.style.display = "block";
        loadAdminItems();
    }
  }
}

async function loadAdminItems() {
  const { data, error } = await supabase.from("items").select("*");
  if (error) return console.error(error);

  const tableBody = document.querySelector("#adminSection table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = data.map(item => `
    <tr>
      <td>${item.title}</td>
      <td>${item.status}</td>
      <td>${item.type}</td>
      <td>${item.date}</td>
      <td>
        <button onclick="updateStatus('${item.id}', 'approved')">Approve</button>
        <button onclick="updateStatus('${item.id}', 'rejected')">Reject</button>
      </td>
    </tr>`).join("");
}

// Global function for buttons
window.updateStatus = async (id, status) => {
  const { error } = await supabase.from("items").update({ status }).eq("id", id);
  if (error) alert(error.message);
  else loadAdminItems();
};

// Profile Page Loader
async function loadProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const userEmail = document.getElementById("userEmail");
  const avatarText = document.getElementById("avatarText");
  const userRole = document.getElementById("userRole");

  if (userEmail) userEmail.textContent = session.user.email;
  if (avatarText) avatarText.textContent = session.user.email.charAt(0).toUpperCase();

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (userRole && data) userRole.textContent = data.role;
}

// Initialize based on page content
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("adminSection")) checkAdminAccess();
    if (document.getElementById("profileInfo")) loadProfile();
});

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// Cloudinary Upload Logic
async function uploadImage(file) {
  const formData = new FormData();
  // Fixes "Invalid Key" by cleaning the filename
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("public_id", `campus_${Date.now()}_${cleanName}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("Cloudinary setup error. Check if your preset is 'Unsigned'.");
  const data = await res.json();
  return data.secure_url;
}

// Main Upload Function
async function uploadItem(title, description, type, category, location, date, file) {
  try {
    const imageUrl = await uploadImage(file);

    const { error } = await supabase
      .from("items")
      .insert([{ 
        title, 
        description, 
        type, 
        category, 
        location, 
        date, 
        image_url: imageUrl,
        status: 'pending' 
      }]);

    if (error) throw error;
    alert("Success! Item reported.");
    window.location.href = "index.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Form Listener - Fixed to match your exact HTML structure
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selects = e.target.querySelectorAll("select");
    const inputs = e.target.querySelectorAll("input");
    
    const type = selects[0].value;
    const title = inputs[0].value;
    const category = selects[1].value;
    const description = e.target.querySelector("textarea").value;
    const location = inputs[1].value;
    const date = inputs[2].value;
    const file = document.getElementById("itemImage").files[0];

    await uploadItem(title, description, type, category, location, date, file);
  });
}

// Authentication & Profile Logic
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelectorAll("input")[0].value;
    const password = e.target.querySelectorAll("input")[1].value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "index.html";
  });
}