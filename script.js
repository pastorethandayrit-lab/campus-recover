// Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

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
 async function uploadItem(title, description, status, file) {
  try {
    const imageUrl = await uploadImage(file);

    // Make sure these column names match exactly what is in your Supabase Table
    const { error } = await supabase
      .from("items")
      .insert([{ 
        title: title, 
        description: description, 
        status: 'pending', // Usually default to pending
        image_url: imageUrl 
      }]);

    if (error) {
      alert("Database error: " + error.message);
    } else {
      alert("Item reported successfully!");
      window.location.href = "index.html"; // Redirect after success
    }
  } catch (err) {
    console.error(err);
    alert("Cloudinary upload failed. Check your Cloud Name and Preset.");
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
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
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

// Profile Page
async function loadProfile() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in → show N/A everywhere
    document.getElementById("userEmail").textContent = "N/A";
    document.getElementById("userRole").textContent = "N/A";
    document.getElementById("avatarText").textContent = "N/A";
    return;
  }

  // Logged in → show email
  document.getElementById("userEmail").textContent = session.user.email;

  // Show initials in avatar circle
  const initials = session.user.email.charAt(0).toUpperCase();
  document.getElementById("avatarText").textContent = initials;

  // Fetch role from profiles table
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {
    document.getElementById("userRole").textContent = "N/A";
  } else {
    document.getElementById("userRole").textContent = data.role;
  }
}

// Run profile loader if profile.html is open
if (document.getElementById("profileInfo")) {
  loadProfile();
}
