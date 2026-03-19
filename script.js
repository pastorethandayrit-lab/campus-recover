// Supabase client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const SUPABASE_KEY = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Cloudinary setup
const cloudName = "daxarj70f"; // replace with your cloud name
const uploadPreset = "unsigned_upload"; // replace with your unsigned preset

// Cloudinary upload
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

// Upload Item (Cloudinary + Supabase)
async function uploadItem(name, description, status, file) {
  try {
    const imageUrl = await uploadImage(file);

    const { error } = await supabase
      .from("items")
      .insert([{ name, description, status, image_url: imageUrl }]);

    if (error) {
      alert("Upload failed: " + error.message);
    } else {
      alert("Item uploaded successfully!");
    }
  } catch (err) {
    console.error(err);
    alert("Unexpected error during upload.");
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
      // Optional redirect
      window.location.href = "login.html";
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

// Upload Form Listener
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = e.target.querySelector("input[type=text]").value;
    const description = e.target.querySelector("textarea").value;
    const status = e.target.querySelector("select").value;
    const file = e.target.querySelector("#itemImage").files[0];

    await uploadItem(name, description, status, file);
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
        <button onclick="updateStatus('${item.id}', 'approved')">Approve</button>
        <button onclick="updateStatus('${item.id}', 'rejected')">Reject</button>
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
