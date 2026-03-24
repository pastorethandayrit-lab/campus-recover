import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==========================================
// 1. CONFIGURATION (Supabase & Cloudinary)
// ==========================================
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// ==========================================
// 2. IMAGE UPLOAD (Cloudinary Logic)
// ==========================================
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Image upload failed.");
  const data = await res.json();
  return data.secure_url; // Returns the URL for Supabase
}

// ==========================================
// 3. AUTHENTICATION (Login & Register)
// ==========================================
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  
  const { error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "index.html"; // Send to home after success
  }
}

// ==========================================
// 4. THE GATEKEEPER (Security & Admin Check)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;
  const currentPage = path.split("/").pop() || "index.html";
  const authPages = ["register.html", "login.html"];

  // Force login if not authenticated
  if (!session && !authPages.includes(currentPage)) {
    window.location.href = "register.html";
    return;
  }

  if (session) {
    // Check if user is Admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    const isAdmin = profile?.role === 'admin';

    // Show Admin UI elements
    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.setProperty('display', el.classList.contains('nav-item') ? 'flex' : 'block', 'important');
      });
    }

    // Protect Admin Page
    if (currentPage === "admin.html" && !isAdmin) {
      window.location.href = "index.html";
    }

    // Load Admin Dashboard data if on that page
    if (currentPage === "admin.html" && isAdmin) loadAdminDashboard();
  }

  // Page Specific Initializers
  if (currentPage === "index.html" || currentPage === "") loadItems();
  
  // Attach Auth Listeners
  if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", (e) => handleAuth(e, 'login'));
  }
  if (document.getElementById("registerForm")) {
    document.getElementById("registerForm").addEventListener("submit", (e) => handleAuth(e, 'register'));
  }
});

// ==========================================
// 5. REPORT SUBMISSION (Upload Logic)
// ==========================================
const upForm = document.getElementById("uploadForm");
if (upForm) {
  upForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const fields = e.target.querySelectorAll("input, select, textarea");
      const { data: { user } } = await supabase.auth.getUser();
      
      // Step 1: Upload Image to Cloudinary
      const imageUrl = await uploadImage(fields[6].files[0]);
      
      // Step 2: Save metadata to Supabase
      await supabase.from("items").insert([{ 
        type: fields[0].value, 
        title: fields[1].value, 
        category: fields[2].value, 
        description: fields[3].value, 
        location: fields[4].value, 
        date: fields[5].value,
        status: 'pending', 
        image_url: imageUrl, 
        user_id: user.id 
      }]);

      alert("Report submitted!");
      window.location.href = "index.html";
    } catch (err) { 
      alert(err.message); 
    }
  });
}

// Global Logout for Profile Page
window.handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
};